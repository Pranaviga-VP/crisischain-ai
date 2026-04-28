export function TrustBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)))

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 rounded bg-slate-800 p-0.5">
        <div
          className="h-1 rounded"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg,#ff4d4f,#ff7a00,#1D9E75)',
          }}
        />
      </div>
      <span className="text-xs font-mono text-slate-300">{pct}%</span>
    </div>
  )
}

export default TrustBar
