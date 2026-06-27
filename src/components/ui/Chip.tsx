interface Props {
  label: string
}

export function Chip({ label }: Props) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono text-fg bg-surface border border-border rounded">
      {label}
    </span>
  )
}
