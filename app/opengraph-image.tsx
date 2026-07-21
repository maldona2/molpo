import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "molpo — Desarrollo de software para pymes | Tucumán";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          color: "#fff",
          backgroundImage:
            "radial-gradient(120% 130% at 8% 0%, #4E78A9 0%, #18365D 44%, #09172B 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 34,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8CB3DE",
          }}
        >
          molpo · Tucumán
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.05, maxWidth: 980 }}>
            Sistemas que sostienen tu empresa, no que la complican.
          </div>
          <div style={{ fontSize: 34, color: "#D7E8F8", marginTop: 28, maxWidth: 900 }}>
            Desarrollo a medida · Rescate de sistemas con IA · Integración de datos
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
