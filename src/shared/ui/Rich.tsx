import { Fragment } from 'react'

/** Renders a translated string that may contain <b>…</b> — parsed into elements, never injected as HTML. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/<b>(.*?)<\/b>/g)
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>))}
    </>
  )
}
