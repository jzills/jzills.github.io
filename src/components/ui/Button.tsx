import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

type BaseProps = {
  variant?: 'primary' | 'ghost' | 'icon'
  children: ReactNode
  className?: string
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never }
type AnchorProps = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
type Props = ButtonProps | AnchorProps

const base = 'inline-flex items-center gap-2 text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'

const variants = {
  primary: 'px-4 py-2 rounded bg-accent text-bg hover:bg-accent-dim',
  ghost: 'px-4 py-2 rounded border border-accent/40 text-fg hover:border-accent hover:text-accent',
  icon: 'p-2 rounded text-muted hover:text-fg hover:bg-fg/5',
}

export function Button({ variant = 'ghost', children, className = '', ...props }: Props) {
  const cls = `${base} ${variants[variant]} ${className}`

  if ('href' in props && props.href !== undefined) {
    const { href, ...rest } = props as AnchorProps
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <button className={cls} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
