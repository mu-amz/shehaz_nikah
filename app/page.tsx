"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

type El = HTMLElement | SVGElement;

/* ---- film timing (milliseconds) — change these to speed up / slow down ---- */
const HOLD = 3000;      // Bismillah shows alone before the doors start opening
const DURATION = 40000; // doors opening -> closing screen (autoplay speed)
const RESUME = 2500;    // after you stop touching/scrolling, autoplay continues after this long

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
  const clock = useRef({ playing: true, ended: false, holdUntil: 0 });
  const [days, setDays] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wantSound = useRef(true); // becomes false once the visitor mutes
  const fade = useRef(0);
  const [soundOn, setSoundOn] = useState(false);
  const [heard, setHeard] = useState(false);

  const fadeTo = useCallback((v: number, done?: () => void) => {
    const a = audioRef.current;
    if (!a) return;
    window.clearInterval(fade.current);
    fade.current = window.setInterval(() => {
      const diff = v - a.volume;
      if (Math.abs(diff) < 0.03) {
        a.volume = v;
        window.clearInterval(fade.current);
        done?.();
      } else {
        a.volume = clamp(a.volume + Math.sign(diff) * 0.03, 0, 1);
      }
    }, 60);
  }, []);

  const playSound = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.paused) return;
    a.volume = 0;
    a.play()
      .then(() => {
        setSoundOn(true);
        setHeard(true);
        fadeTo(0.55); // gentle volume, change 0.55 to taste (0 to 1)
      })
      .catch(() => {});
  }, [fadeTo]);

  // countdown to 20 Nov 2026 (client only, avoids hydration mismatch)
  useEffect(() => {
    const target = new Date(2026, 10, 20);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setDays(Math.round((target.getTime() - now.getTime()) / 864e5));
  }, []);

  // the film: a clock drives progress 0 -> 1, and only the things that changed get updated
  useEffect(() => {
    const film = filmRef.current;
    const stage = stageRef.current;
    if (!film || !stage) return;

    film.setAttribute("data-live", ""); // switches CSS from the static fallback to the autoplay film

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
        const k = Math.round(ease(clamp((p - it.a) / (it.b - it.a))) * 1000) / 1000;
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

    /* Scroll position is the single source of truth.
       Autoplay simply scrolls the page for you; any touch/wheel/key takes control back. */
    const c = clock.current;
    c.playing = !reduce; // reduced-motion users get scroll-only
    c.ended = false;
    c.holdUntil = performance.now() + HOLD;
    if (reduce) setPlaying(false);

    let top = 0;
    let span = 1;
    const measure = () => {
      const r = film.getBoundingClientRect();
      top = r.top + window.scrollY;
      span = Math.max(1, r.height - window.innerHeight);
    };
    measure();

    let target = clamp((window.scrollY - top) / span);
    let current = target;
    let lastP = -1;
    let userTs = -1e9;
    let touching = false;
    let expectedY = window.scrollY;
    let autoY = window.scrollY;
    let last = 0;
    let raf = 0;
    let autoSoundStarted = false;

    const user = () => { userTs = performance.now(); };
    const touchStart = () => { touching = true; user(); };
    const touchEnd = () => { touching = false; user(); };
    const opts = { passive: true } as const;
    window.addEventListener("touchstart", touchStart, opts);
    window.addEventListener("touchmove", user, opts);
    window.addEventListener("touchend", touchEnd, opts);
    window.addEventListener("touchcancel", touchEnd, opts);
    window.addEventListener("wheel", user, opts);
    window.addEventListener("keydown", user);
    window.addEventListener("pointerdown", user, opts);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    const frame = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 16; // clamp so a background tab can't jump ahead
      last = now;

      const y = window.scrollY;
      if (Math.abs(y - expectedY) > 2.5) userTs = now; // moved by the user (touch drag or momentum)

      const canAuto = c.playing && !c.ended && !touching && now >= c.holdUntil && now - userTs > RESUME;
      if (canAuto && !autoSoundStarted) {
        autoSoundStarted = true;
        if (wantSound.current) playSound();
      } else if (!canAuto) {
        autoSoundStarted = false;
      }
      let pos = y;
      if (canAuto) {
        autoY = Math.min(top + span, autoY + (span * dt) / DURATION);
        window.scrollTo(0, autoY);
        expectedY = autoY;
        pos = autoY;
      } else {
        autoY = y;
        expectedY = y;
      }

      target = clamp((pos - top) / span);
      const d = target - current;
      current = reduce || Math.abs(d) < 0.0001 ? target : current + d * (1 - Math.exp(-dt / 85));
      if (current !== lastP) {
        apply(current);
        lastP = current;
      }

      if (target >= 0.998 && !c.ended) {
        c.ended = true;
        setEnded(true);
      } else if (target < 0.99 && c.ended) {
        c.ended = false;
        setEnded(false);
      }

      raf = requestAnimationFrame(frame);
    };

    apply(current);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", user);
      window.removeEventListener("touchend", touchEnd);
      window.removeEventListener("touchcancel", touchEnd);
      window.removeEventListener("wheel", user);
      window.removeEventListener("keydown", user);
      window.removeEventListener("pointerdown", user);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [playSound]);

  /* ---- background audio ----
     Try playback from manual input and from the automatic scroll transition.
     The browser may still require one real interaction before allowing sound. */
  const toggleSound = () => {
    const a = audioRef.current;
    if (soundOn) {
      wantSound.current = false;
      setSoundOn(false);
      fadeTo(0, () => a?.pause());
    } else {
      wantSound.current = true;
      playSound();
    }
  };

  useEffect(() => {
    let lastTry = 0;
    const unlock = () => {
      const now = Date.now();
      if (now - lastTry < 800 || !wantSound.current) return;
      lastTry = now;
      playSound();
    };
    const events = ["touchmove", "wheel", "touchend", "scroll", "click", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));

    const onVis = () => {
      const a = audioRef.current;
      if (!a) return;
      if (document.hidden) {
        if (!a.paused) {
          a.pause();
          a.dataset.resume = "1";
        }
      } else if (a.dataset.resume) {
        delete a.dataset.resume;
        a.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      events.forEach((e) => window.removeEventListener(e, unlock));
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(fade.current);
    };
  }, [playSound]);

  const toggle = () => {
    const c = clock.current;
    if (c.ended) {
      window.scrollTo(0, 0);
      c.holdUntil = performance.now() + HOLD;
      c.ended = false;
      c.playing = true;
      setEnded(false);
      setPlaying(true);
      return;
    }
    c.playing = !c.playing;
    setPlaying(c.playing);
  };

  const countdown =
    days === null ? "\u00a0" : days > 1 ? `${days} days to go` : days === 1 ? "Tomorrow, in shaa Allah" : days === 0 ? "Today, in shaa Allah" : "With gratitude";

  const MAPS = "https://www.google.com/maps/search/?api=1&query=Salafi+Masjid%2C+Poothappara%2C+Azhikode";

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
                <Letters className="name" text="Nida Mariyam" s="0.14,0.20" />
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
                  <h2 className="nm">Nida<br />Mariyam</h2>
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
              <h2 className="h-big" style={{ fontSize: "clamp(2.2rem,10vw,3.4rem)" }}>
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
                <path className="draw" pathLength={1} d="M6 118H234" />
                <path className="draw" pathLength={1} d="M50 118V84H190V118" />
                <path className="draw" pathLength={1} d="M92 84V72M148 84V72M92 72C84 52 104 44 120 28C136 44 156 52 148 72Z" />
                <path className="draw" pathLength={1} d="M120 28V21M122 8A6 6 0 1 0 122 20A4.8 4.8 0 1 1 122 8Z" />
                <path className="draw" pathLength={1} d="M54 84V80C52 69 62 64 66 57C70 64 80 69 78 80V84M66 57V51" />
                <path className="draw" pathLength={1} d="M162 84V80C160 69 170 64 174 57C178 64 188 69 186 80V84M174 57V51" />
                <path className="draw" pathLength={1} d="M106 118V102C106 88 134 88 134 102V118" />
                <path className="draw" pathLength={1} d="M64 118V104C64 95 78 95 78 104V118" />
                <path className="draw" pathLength={1} d="M162 118V104C162 95 176 95 176 104V118" />
                <path className="draw" pathLength={1} d="M14 118V46M26 118V46M9 62H31M11 46H29" />
                <path className="draw" pathLength={1} d="M14 46C12 38 18 34 20 28C22 34 28 38 26 46M20 28V21" />
                <path className="draw" pathLength={1} d="M214 118V46M226 118V46M209 62H231M211 46H229" />
                <path className="draw" pathLength={1} d="M214 46C212 38 218 34 220 28C222 34 228 38 226 46M220 28V21" />
              </svg>
              <h2 className="venue-h fx" data-s="0.82,0.86">Salafi Masjid</h2>
              <p className="addr fx" data-s="0.84,0.875">Poothappara,<br />Azhikode, Kannur</p>
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
              <a className="btn btn-ink fx" data-s="0.985,1" href={MAPS} target="_blank" rel="noreferrer">
                Open venue in maps <span aria-hidden="true">↗</span>
              </a>
            </div>
          </section>

          {/* ===== OPENING GATE (doors open by themselves after the Bismillah) ===== */}
          <div className="gate" data-s="0.004,0.09" data-autohide>
            <div className="door door-l" />
            <div className="door door-r" />
            <div className="seal" aria-hidden="true"><span>S</span><span>N</span><b>✦</b></div>
            <div className="gate-top">
              <p className="arabic bismillah" lang="ar" dir="rtl">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
              <p className="tr">In the name of Allah, the most gracious and the most merciful</p>
            </div>
          </div>

          {/* ===== AMBIENT LAYERS ===== */}
          <FloralBranch className="branch branch-a" />
          <FloralBranch className="branch branch-b" />
          <div className="petals" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="frame" aria-hidden="true" />
          <div className="meter" aria-hidden="true"><i /></div>
          <button className="ctrl" type="button" onClick={toggle} aria-label={ended ? "Replay invitation" : playing ? "Pause" : "Play"}>
            {ended ? "↻" : playing ? "❚❚" : "▶"}
          </button>
          <button className="ctrl ctrl-sound" type="button" onClick={toggleSound} aria-label={soundOn ? "Mute music" : "Play music"}>
            {soundOn ? "🔊" : "🔇"}
          </button>
          {!heard && <p className="hint">Tap for sound ♪</p>}
          <audio
            ref={audioRef}
            src="/audio/bg.mp3"
            autoPlay
            muted={false}
            loop
            preload="auto"
            playsInline
            onPlay={() => {
              setSoundOn(true);
              setHeard(true);
            }}
          />
        </div>
      </div>
    </main>
  );
}
