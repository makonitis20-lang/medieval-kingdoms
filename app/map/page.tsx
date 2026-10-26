};

const mapToolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  padding: 16,
  color: "#e0bd79",
};

const mapViewportStyle: CSSProperties = {
  width: "100%",
  aspectRatio: "3 / 2",
  minHeight: 280,
  position: "relative",
  overflow: "hidden",
  background: "#234b5b",
};

const svgStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  cursor: "grab",
  touchAction: "none",
  userSelect: "none",
};

const emptyMapStyle: CSSProperties = {
  height: "100%",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  padding: 20,
  boxSizing: "border-box",
  color: "#c6a76d",
};

const zoomControlsStyle: CSSProperties = {
  position: "absolute",
  right: 14,
  bottom: 14,
  display: "grid",
  gap: 6,
};

const zoomButtonStyle: CSSProperties = {
  width: 38,
  height: 38,
  background: "#14241be8",
  border: "1px solid #b99b62",
  borderRadius: 6,
  color: "#f4e5c6",
  fontSize: 23,
  cursor: "pointer",
};

const mapFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: 14,
  color: "#aab8a8",
  fontSize: 13,
};

const sidebarStyle: CSSProperties = {
  background: "#16261f",
  border: "1px solid #78613b",
  borderRadius: 12,
  padding: 22,
  minWidth: 0,
};

const provinceTitleStyle: CSSProperties = {
  fontSize: 27,
  color: "#e0bd79",
};

const detailRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "13px 0",
  borderBottom: "1px solid #ffffff19",
};

const neighborListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const neighborButtonStyle: CSSProperties = {
  background: "#25392b",
  border: "1px solid #78613b",
  color: "#e9d6ad",
  padding: "8px 10px",
  borderRadius: 5,
  cursor: "pointer",
};

const emptySelectionStyle: CSSProperties = {
  textAlign: "center",
  padding: "35px 5px",
};

const legendStyle: CSSProperties = {
  marginTop: 30,
  borderTop: "1px solid #78613b",
  paddingTop: 14,
};

const legendRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
  color: "#d2d8c9",
};

const footerStyle: CSSProperties = {
  textAlign: "center",
  color: "#748476",
  fontSize: 12,
  marginTop: 35,
  letterSpacing: 1,
};
