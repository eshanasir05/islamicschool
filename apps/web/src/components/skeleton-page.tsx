export default function SkeletonPage() {
  return (
    <main className="app-main">
      <div className="skeleton" style={{ height: 28, width: 160, marginTop: 24, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 14, width: 220, marginBottom: 28 }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="app-card" style={{ marginBottom: 8 }}>
          <div className="skeleton" style={{ height: 18, width: '55%', marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 13, width: '38%' }} />
        </div>
      ))}
    </main>
  );
}
