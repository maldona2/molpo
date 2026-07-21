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
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="87" height="60" viewBox="0 0 124 85" aria-hidden="true">
            <path
              d="M40.9 51.84L0 84.94V54.12L40.83 21.48L41.08 51.76L81.87 19.17L105.51 0L105.64 52.76L82.04 71.48L81.88 49.57L41.07 82.21L40.9 51.84Z"
              fill="#FFFFFF"
            />
            <path
              d="M115.23 56.56C118.78 55.57 122.05 57.65 122.97 60.92C123.89 64.21 121.97 67.69 118.49 68.62C115.39 69.45 111.98 67.67 110.95 64.4C109.92 61.13 111.64 57.57 115.23 56.57V56.56Z"
              fill="#FFFFFF"
            />
          </svg>
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
