import { Fragment } from 'react'

/** Turns plain http(s) links inside the text into real links; everything else stays text (React escapes it). */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
        const url = part.replace(/[.,;:!?)\]]+$/, '')
        const tail = part.slice(url.length)
        return (
          <Fragment key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline underline-offset-2">
              {url}
            </a>
            {tail}
          </Fragment>
        )
      })}
    </>
  )
}
