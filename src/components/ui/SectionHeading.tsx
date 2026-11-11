import { DecodeText } from '@/components/ui/DecodeText'

interface Props {
  label: string
  heading: string
  subheading?: string
}

export function SectionHeading({ label, heading, subheading }: Props) {
  return (
    <div className="mb-12">
      <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">
        <DecodeText text={label} />
      </p>
      <h2 className="text-3xl font-bold text-fg tracking-tight mb-3">{heading}</h2>
      {subheading && (
        <p className="text-muted text-base max-w-xl">{subheading}</p>
      )}
    </div>
  )
}
