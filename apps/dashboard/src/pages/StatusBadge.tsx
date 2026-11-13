export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'MISSING'
      ? 'badge-missing'
      : status === 'MATCHED' || status === 'MATCH FOUND'
        ? 'badge-matched'
        : status === 'FOUND'
          ? 'badge-found'
          : status === 'REUNITED'
            ? 'badge-reunited'
            : 'badge-low';
  return <span className={`badge ${cls}`}>{status}</span>;
}
