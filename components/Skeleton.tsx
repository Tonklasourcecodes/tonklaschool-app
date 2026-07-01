export function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-slate-100 ${className}`}
      style={{ animation: "shimmer 1.5s ease-in-out infinite" }}
    />
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  const widths = ["w-24", "w-32", "w-20", "w-16", "w-20"];
  return (
    <tr className="border-b border-slate-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <SkeletonBox className={`h-4 ${widths[i % widths.length]}`} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}>
      <SkeletonBox className="h-3 w-20 mb-3" />
      <SkeletonBox className="h-7 w-28 mb-1" />
      <SkeletonBox className="h-3 w-16" />
    </div>
  );
}
