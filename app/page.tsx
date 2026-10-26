export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#101a16",
      color: "#f5e6c8",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "24px",
      fontFamily: "Georgia, serif"
    }}>
      <h1 style={{ fontSize: "clamp(36px, 8vw, 72px)", marginBottom: "12px" }}>
        Medieval Kingdoms
      </h1>
      <p style={{ fontSize: "20px", color: "#c5aa78" }}>
        Build your kingdom. Command your armies. Conquer the world.
      </p>
      <p style={{ marginTop: "40px", color: "#9fa99f" }}>
        The kingdom awaits...
      </p>
    </main>
  );
}
