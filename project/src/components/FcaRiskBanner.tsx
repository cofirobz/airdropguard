import React from "react";

export function FcaRiskBanner() {
  return (
    <div style={bannerStyle}>
      <span style={textStyle}>
        ⚠️ <strong>Cryptoassets are high risk.</strong> AirdropGuard provides AI-powered
        security analysis, human reviewed insights, and educational information only. This is not
        financial, legal or investment advice. Always do your own research (DYOR).{" "}
        <a href="/risk-disclosure" style={linkStyle}>
          Learn more
        </a>
      </span>

      <button
        onClick={(e) => {
          const banner = e.currentTarget.parentElement;
          if (banner) banner.style.display = "none";
        }}
        aria-label="Dismiss risk warning"
        style={closeButtonStyle}
      >
        ✕
      </button>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  width: "100%",
  background: "#111827",
  color: "#E5E7EB",
  borderBottom: "1px solid #EF4444",
  padding: "7px 14px calc(7px + env(safe-area-inset-bottom, 0px)) 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  fontSize: "12px",
  lineHeight: 1.35,
  boxSizing: "border-box",
  zIndex: 25,
};

const textStyle: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
};

const linkStyle: React.CSSProperties = {
  color: "#60A5FA",
  textDecoration: "none",
  fontWeight: 600,
};

const closeButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#9CA3AF",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "bold",
  padding: "0 4px",
};