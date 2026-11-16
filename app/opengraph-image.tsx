import { ImageResponse } from "next/og";

export const alt = "Muhammed Shehaz and Nida Mariyam — Nikah Invitation";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#1d2b25",
          color: "#4d3823",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            border: "1px solid #d9bc884d",
            borderRadius: 260,
            top: -220,
            right: -110,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 380,
            height: 380,
            border: "1px solid #d9bc884d",
            borderRadius: 190,
            bottom: -180,
            left: -80,
            display: "flex",
          }}
        />
        <div
          style={{
            width: "94%",
            height: "88%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            backgroundColor: "#fffdf7",
            border: "1px solid #ae8248",
            padding: "40px 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#ae8248",
              fontFamily: "Arial, sans-serif",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 6,
            }}
          >
            YOU ARE WARMLY INVITED TO
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 30,
              fontStyle: "italic",
            }}
          >
            The Nikah of
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 14,
              color: "#4d3823",
              fontSize: 58,
              lineHeight: 1.15,
            }}
          >
            Muhammed Shehaz
          </div>
          <div
            style={{
              display: "flex",
              margin: "2px 0",
              color: "#ae8248",
              fontSize: 38,
              fontStyle: "italic",
            }}
          >
            &amp;
          </div>
          <div
            style={{
              display: "flex",
              color: "#4d3823",
              fontSize: 58,
              lineHeight: 1.15,
            }}
          >
            Nida Mariyam
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              paddingTop: 16,
              borderTop: "1px solid #d9bc88",
              color: "#8e7656",
              fontFamily: "Arial, sans-serif",
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: 4,
            }}
          >
            FRIDAY · 20 NOVEMBER 2026 · KANNUR
          </div>
        </div>
      </div>
    ),
    size,
  );
}
