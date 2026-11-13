export function PlaceholderPage({ title, body }: { title: string; body: string }) {
  return (
    <main className="main" style={{ gridColumn: '2 / -1' }}>
      <div className="panel" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p className="muted">{body}</p>
      </div>
    </main>
  );
}
