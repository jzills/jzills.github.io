import { useCallback, useEffect, useState } from 'react'

// Copies `text`, reporting `copied` for a moment afterwards. Where the clipboard
// is unavailable (insecure context, permission denied) `onFail` runs instead.
export function useCopyToClipboard(text: string, onFail?: () => void, resetMs = 1800) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), resetMs)
    return () => window.clearTimeout(timer)
  }, [copied, resetMs])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      onFail?.()
    }
  }, [text, onFail])

  return { copied, copy }
}
