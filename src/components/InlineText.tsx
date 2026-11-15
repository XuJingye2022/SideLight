const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g

export function InlineText({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter((part) => part.length > 0)
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={index}>{part.slice(1, -1)}</code>
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}
