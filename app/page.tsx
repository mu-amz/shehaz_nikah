"use client";
import { Fragment, useEffect, useRef, useState } from "react";

type El = HTMLElement | SVGElement;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);

/* ---------- small building blocks ---------- */

function FloralBranch({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 170 210" fill="none">
      <path d="M12 195C35 157 55 130 74 97c17-30 30-58 44-86" stroke="currentColor" strokeWidth="1.5" />
      <path d="M34 160c-16-3-21-13-19-24 13 1 21 9 19 24Zm19-32c-14-7-16-18-10-28 12 4 17 14 10 28Zm20-33c-12-9-12-20-4-29 11 6 14 17 4 29Zm18-34c-9-11-6-21 4-28 9 8 9 19-4 28Z" fill="currentColor" opacity=".78" />
      <g fill="#fffdf7" stroke="#b89962">
        <circle cx="133" cy="21" r="7" /><circle cx="145" cy="33" r="5" /><circle cx="127" cy="41" r="5" />
        <circle cx="157" cy="17" r="4" /><circle cx="113" cy="59" r="5" />
      </g>
    </svg>
  );
}

function FlowerBloom({ className = "" }: { className?: string }) {
  return (
    <svg className={className} data-t viewBox="0 0 120 120" aria-hidden="true">
      <g className="flower-head" fill="none" stroke="currentColor" strokeWidth="1.2">
        <ellipse cx="60" cy="31" rx="14" ry="29" /><ellipse cx="60" cy="89" rx="14" ry="29" />
        <ellipse cx="31" cy="60" rx="29" ry="14" /><ellipse cx="89" cy="60" rx="29" ry="14" />
        <ellipse cx="39" cy="39" rx="13" ry="25" transform="rotate(-45 39 39)" />
        <ellipse cx="81" cy="81" rx="13" ry="25" transform="rotate(-45 81 81)" />
        <circle cx="60" cy="60" r="8" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Splits text into letters or words that reveal one by one as `--k` goes 0 → 1. */
function Letters({
  text, s, by = "char", className = "",
}: { text: string; s: string; by?: "char" | "word"; className?: string }) {
  const words = text.split(" ");
  const n = (by === "char" ? text.replace(/ /g, "").length : words.length) + 3;
  let i = 0;
  return (
    <span className={`letters ${className}`} data-s={s} aria-label={text} style={{ "--n": n } as React.CSSProperties}>
      {words.map((w, wi) => (
        <Fragment key={wi}>
          <span className="w" aria-hidden="true">
            {by === "char" ? (
              [...w].map((c) => {
                const idx = i++;
                return <span key={idx} className="ch" style={{ "--i": idx } as React.CSSProperties}>{c}</span>;
              })
            ) : (
              <span className="ch" style={{ "--i": i++ } as React.CSSProperties}>{w}</span>
            )}
          </span>
          {wi < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </span>
  );
}

/* ---------- page ---------- */

export default function Home() {
  const filmRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [days, setDays] = useState<number | null>(null);

  // countdown to 20 Nov 2026 (client only, avoids hydration mismatch)
  useEffect(() => {
    const target = new Date(2026, 10, 20);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setDays(Math.round((target.getTime() - now.getTime()) / 864e5));
  }, []);

  // scroll engine: scroll position -> smoothed progress -> only the things that changed
  useEffect(() => {
    const film = filmRef.current;
    const stage = stageRef.current;
    if (!film || !stage) return;

    film.setAttribute("data-live", ""); // switches CSS from the static fallback to the scroll film

    // Lite mode = same design, less work per frame. Default on Android / touch phones.
    // Test either way by opening the site with ?fx=lite or ?fx=full
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const force = new URLSearchParams(window.location.search).get("fx");
    const lite = force === "lite" ? true : force === "full" ? false : reduce || (coarse && !isIOS);
    if (lite) film.setAttribute("data-lite", "");

    const range = (v: string) => v.split(",").map(Number);

    const scenes = Array.from(stage.querySelectorAll<HTMLElement>("[data-scene]")).map((el) => {
      const [a, b] = range(el.dataset.scene!);
      return {
        el, a, b,
        body: el.querySelector<HTMLElement>(".body"),
        ts: Array.from(el.querySelectorAll<El>("[data-t]")),
        on: false, lastO: -1, lastOut: -1, lastT: -1,
      };
    });
    const items = Array.from(stage.querySelectorAll<HTMLElement>("[data-s]")).map((el) => {
      const [a, b] = range(el.dataset.s!);
      return { el, a, b, count: el.dataset.count ? Number(el.dataset.count) : null, hide: el.hasAttribute("data-autohide"), last: -1, lastCount: -1 };
    });
    const meter = stage.querySelector<El>(".meter i");
    const branchA = stage.querySelector<El>(".branch-a");
    const branchB = stage.querySelector<El>(".branch-b");

    const W = 0.035; // crossfade width between scenes (progress units)

    const apply = (p: number) => {
      if (meter) meter.style.transform = `scaleX(${p.toFixed(4)})`;
      if (!lite) {
        if (branchA) branchA.style.transform = `translate3d(0,${(p * 70).toFixed(1)}px,0) rotate(${(12 + p * 40).toFixed(1)}deg)`;
        if (branchB) branchB.style.transform = `translate3d(0,${(-p * 70).toFixed(1)}px,0) rotate(${(192 - p * 40).toFixed(1)}deg)`;
      }

      for (const sc of scenes) {
        const inn = sc.a <= 0 ? 1 : ease(clamp((p - sc.a) / W));
        const out = sc.b >= 1 ? 0 : ease(clamp((p - (sc.b - W)) / W));
        const o = inn * (1 - out);

        if (o <= 0.001) {
          if (sc.on) {
            sc.el.style.visibility = "hidden";
            sc.el.style.opacity = "0";
            sc.el.style.pointerEvents = "none";
            sc.on = false;
            sc.lastO = -1;
          }
          continue;
        }

        if (!sc.on) {
          sc.el.style.visibility = "visible";
          sc.on = true;
        }
        const oq = Math.round(o * 200) / 200;
        if (oq !== sc.lastO) {
          sc.el.style.opacity = String(oq);
          sc.el.style.pointerEvents = oq > 0.5 ? "auto" : "none";
          sc.lastO = oq;
        }
        const outq = Math.round(out * 200) / 200;
        if (sc.body && outq !== sc.lastOut) {
          sc.body.style.transform = `translate3d(0,${(-outq * 34).toFixed(1)}px,0) scale(${(1 - outq * 0.04).toFixed(3)})`;
          sc.lastOut = outq;
        }
        if (sc.ts.length) {
          const t = Math.round(clamp((p - sc.a) / (sc.b - sc.a)) * 500) / 500;
          if (t !== sc.lastT) {
            for (const node of sc.ts) node.style.setProperty("--t", String(t));
            sc.lastT = t;
          }
        }
      }

      for (const it of items) {
        const k = Math.round(ease(clamp((p - it.a) / (it.b - it.a))) * 500) / 500;
        if (k === it.last) continue; // nothing changed -> no style work at all
        it.last = k;
        it.el.style.setProperty("--k", String(k));
        if (it.count !== null) {
          const c = Math.max(1, Math.round(k * it.count));
          if (c !== it.lastCount) {
            it.el.textContent = String(c).padStart(2, "0");
            it.lastCount = c;
          }
        }
        if (it.hide) it.el.style.visibility = k >= 1 ? "hidden" : "visible";
      }
    };

    // geometry is measured once (and on resize), never per frame
    let top = 0;
    let span = 1;
    const measure = () => {
      const r = film.getBoundingClientRect();
      top = r.top + window.scrollY;
      span = Math.max(1, r.height - window.innerHeight);
    };

    let target = 0;
    let current = 0;
    let raf = 0;
    let lastTime = 0;

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(64, lastTime ? now - lastTime : 16);
      lastTime = now;
      const d = target - current;
      current = reduce || Math.abs(d) < 0.0001 ? target : current + d * (1 - Math.exp(-dt / 85));
      apply(current);
      if (current !== target) raf = requestAnimationFrame(tick);
      else lastTime = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const read = () => {
      const next = clamp((window.scrollY - top) / span);
      if (next !== target) {
        target = next;
        kick();
      }
    };

    // Poll every frame too: some mobile browsers only fire scroll events after momentum ends.
    let poll = 0;
    const loop = () => {
      read();
      poll = requestAnimationFrame(loop);
    };

    const onResize = () => {
      measure();
      read();
    };

    measure();
    target = clamp((window.scrollY - top) / span);
    current = target;
    apply(current);
    poll = requestAnimationFrame(loop);

    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      cancelAnimationFrame(poll);
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const countdown =
    days === null ? "\u00a0" : days > 1 ? `${days} days to go` : days === 1 ? "Tomorrow, in shaa Allah" : days === 0 ? "Today, in shaa Allah" : "With gratitude";

  return (
    <main>
      <div className="film" ref={filmRef}>
        <div className="stage" ref={stageRef}>

          {/* ===== 1. TITLE ===== */}
          <section className="scene scene--light" data-scene="0,0.23">
            <div className="glow" data-t />
            <div className="body">
              <p className="eyebrow fx" data-s="0.05,0.09">You are warmly invited to</p>
              <div className="rule" data-s="0.05,0.10" />
              <p className="of fx" data-s="0.06,0.10">The Nikah of</p>
              <h1 style={{ margin: 0 }}>
                <Letters className="name" text="Muhammed Shehaz" s="0.08,0.14" />
                <span className="amp fx fx-pop" data-s="0.13,0.16">&amp;</span>
                <Letters className="name" text="Nida Mariyyum" s="0.14,0.20" />
              </h1>
              <p className="date-line fx" data-s="0.17,0.20">Friday · 20 November 2026 · Kannur</p>
            </div>
          </section>

          {/* ===== 2. STORY ===== */}
          <section className="scene scene--dark" data-scene="0.21,0.42">
            <div className="orbit" data-t />
            <div className="orbit orbit-2" data-t />
            <div className="body">
              <p className="eyebrow fx" data-s="0.235,0.27">A new chapter begins</p>
              <p className="arabic big-arabic fx" lang="ar" dir="rtl" data-s="0.25,0.285">بِسْمِ اللّٰهِ</p>
              <h1 className="h-big">
                <Letters text="Two hearts," by="word" s="0.27,0.31" />
                <em><Letters text="one beautiful promise." by="word" s="0.30,0.35" /></em>
              </h1>
              <p className="copy fx" data-s="0.33,0.37">
                With gratitude to Allah and the love of our families, we invite you to share in the joy of our nikah.
              </p>
              <svg className="rings" data-s="0.30,0.39" viewBox="0 0 130 70" fill="none" stroke="currentColor" aria-hidden="true">
                <circle className="ring" cx="48" cy="35" r="24" pathLength={1} />
                <circle className="ring" cx="82" cy="35" r="24" pathLength={1} />
              </svg>
            </div>
          </section>

          {/* ===== 3. COUPLE ===== */}
          <section className="scene scene--dark" data-scene="0.40,0.62">
            <div className="body body--wide">
              <div className="duo">
                <div className="person fx from-l" data-s="0.43,0.50">
                  <span className="tag">THE GROOM</span>
                  <h2 className="nm">Muhammed<br />Shehaz</h2>
                  <p>Son of Favas SV &amp; Abida K</p>
                  <small>Darul Aman · Payangadi, Kannur</small>
                </div>
                <div className="mid">
                  <div className="vline" data-s="0.44,0.52" />
                  <span className="amp-lg fx fx-pop" data-s="0.48,0.53">&amp;</span>
                  <div className="vline" data-s="0.50,0.56" />
                </div>
                <div className="person person-r fx from-r" data-s="0.50,0.57">
                  <span className="tag">THE BRIDE</span>
                  <h2 className="nm">Nida<br />Mariyyum</h2>
                  <p>Daughter of A P Mahamood &amp; Naseema C</p>
                  <small>Swadaf · Punnakkapara, Azhikode</small>
                </div>
              </div>
            </div>
          </section>

          {/* ===== 4. DATE ===== */}
          <section className="scene scene--paper" data-scene="0.60,0.80">
            <div className="glow" data-t />
            <div className="body">
              <p className="eyebrow fx" data-s="0.63,0.66">Save the date</p>
              <h2 className="h-big" style={{ fontSize: "clamp(2.4rem,11vw,3.6rem)" }}>
                <Letters text="A beautiful" by="word" s="0.65,0.69" />
                <em><Letters text="beginning awaits" by="word" s="0.68,0.72" /></em>
              </h2>
              <div className="dial">
                <svg className="dial-svg" data-s="0.66,0.74" viewBox="0 0 200 200" fill="none" aria-hidden="true">
                  <circle cx="100" cy="100" r="98" stroke="#ae824833" strokeWidth="1" />
                  <circle className="dial-ring" cx="100" cy="100" r="92" stroke="#ae8248" strokeWidth="2" strokeLinecap="round" pathLength={1} />
                  <g className="ticks" stroke="#ae8248" strokeWidth="1" opacity=".6">
                    {Array.from({ length: 36 }, (_, t) => (
                      <line key={t} x1="100" y1="12" x2="100" y2={t % 3 === 0 ? 20 : 16} transform={`rotate(${t * 10} 100 100)`} />
                    ))}
                  </g>
                </svg>
                <div className="dial-in">
                  <span className="dow fx" data-s="0.68,0.71">Friday</span>
                  <strong className="big fx" data-s="0.69,0.745" data-count="20">20</strong>
                  <span className="mon fx" data-s="0.72,0.75">November · 2026</span>
                  <span className="asar fx" data-s="0.74,0.77">After Asar</span>
                </div>
              </div>
            </div>
          </section>

          {/* ===== 5. VENUE ===== */}
          <section className="scene scene--dark" data-scene="0.78,0.93">
            <div className="body">
              <p className="eyebrow fx" data-s="0.795,0.83">The venue</p>
              <svg className="mosque" data-s="0.80,0.86" viewBox="0 0 240 126" aria-hidden="true" style={{ marginTop: 22 }}>
                {/* ground */}
                <path className="draw" pathLength={1} d="M6 118H234" />
                {/* hall walls and roofline */}
                <path className="draw" pathLength={1} d="M50 118V84H190V118" />
                {/* central onion dome, drum, finial and crescent */}
                <path className="draw" pathLength={1} d="M92 84V72M148 84V72M92 72C84 52 104 44 120 28C136 44 156 52 148 72Z" />
                <path className="draw" pathLength={1} d="M120 28V21M122 8A6 6 0 1 0 122 20A4.8 4.8 0 1 1 122 8Z" />
                {/* two small side domes */}
                <path className="draw" pathLength={1} d="M54 84V80C52 69 62 64 66 57C70 64 80 69 78 80V84M66 57V51" />
                <path className="draw" pathLength={1} d="M162 84V80C160 69 170 64 174 57C178 64 188 69 186 80V84M174 57V51" />
                {/* arched door and windows */}
                <path className="draw" pathLength={1} d="M106 118V102C106 88 134 88 134 102V118" />
                <path className="draw" pathLength={1} d="M64 118V104C64 95 78 95 78 104V118" />
                <path className="draw" pathLength={1} d="M162 118V104C162 95 176 95 176 104V118" />
                {/* left minaret: tower, balcony, round dome */}
                <path className="draw" pathLength={1} d="M14 118V46M26 118V46M9 62H31M11 46H29" />
                <path className="draw" pathLength={1} d="M14 46C12 38 18 34 20 28C22 34 28 38 26 46M20 28V21" />
                {/* right minaret */}
                <path className="draw" pathLength={1} d="M214 118V46M226 118V46M209 62H231M211 46H229" />
                <path className="draw" pathLength={1} d="M214 46C212 38 218 34 220 28C222 34 228 38 226 46M220 28V21" />
              </svg>
              <h2 className="venue-h fx" data-s="0.82,0.86">Salafi Masjid</h2>
              <p className="addr fx" data-s="0.84,0.875">Poothappara,<br />Azhikode, Kannur</p>
              <a
                className="btn fx"
                data-s="0.855,0.885"
                href="https://www.google.com/maps/search/?api=1&query=Salafi+Masjid%2C+Poothappara%2C+Azhikode"
                target="_blank"
                rel="noreferrer"
              >
                Open in maps <span aria-hidden="true">↗</span>
              </a>
            </div>
          </section>

          {/* ===== 6. CLOSING ===== */}
          <section className="scene scene--warm" data-scene="0.91,1">
            <div className="burst" data-t />
            <FlowerBloom className="bloom bloom-a" />
            <FlowerBloom className="bloom bloom-b" />
            <div className="body">
              <p className="eyebrow fx" data-s="0.925,0.95">Your presence is our blessing</p>
              <h2 className="h-big">
                <Letters text="Come celebrate" by="word" s="0.935,0.965" />
                <em><Letters text="with us." by="word" s="0.95,0.975" /></em>
              </h2>
              <p className="copy fx" data-s="0.955,0.98">
                May this beginning be filled with barakah, laughter and a lifetime of love.
              </p>
              <p className="arabic closing-arabic fx" lang="ar" dir="rtl" data-s="0.965,0.985">إِنْ شَاءَ اللّٰهُ</p>
              <p className="closing-names">
                <Letters text="Shehaz & Nida" s="0.97,0.995" />
              </p>
              <span className="pill fx" data-s="0.975,0.998">{countdown}</span>
            </div>
          </section>

          {/* ===== OPENING GATE (doors open as you scroll) ===== */}
          <div className="gate" data-s="0.004,0.09" data-autohide>
            <div className="door door-l" />
            <div className="door door-r" />
            <div className="seal" aria-hidden="true"><span>S</span><span>N</span><b>✦</b></div>
            <div className="gate-top">
              <p className="arabic bismillah" lang="ar" dir="rtl">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
              <p className="tr">In the name of Allah, the most gracious and the most merciful</p>
            </div>
            <div className="gate-bottom"><span>Scroll to open</span><i /></div>
          </div>

          {/* ===== AMBIENT LAYERS ===== */}
          <FloralBranch className="branch branch-a" />
          <FloralBranch className="branch branch-b" />
          <div className="petals" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="frame" aria-hidden="true" />
          <div className="meter" aria-hidden="true"><i /></div>
        </div>
      </div>
    </main>
  );
}
