import { useEffect, useRef, useState } from 'react'

/**
 * Screenshot drop-zone, mirroring the prototype's <x-import image-slot>.
 * Accepts drag & drop or click-to-pick; persists the chosen image (as a data
 * URL) in localStorage keyed by the slot id so it survives reloads.
 */
export function ImageSlot({ id, placeholder = 'Screenshot ablegen' }: { id: string; placeholder?: string }) {
  const key = 'orch-shot-' + id
  const [src, setSrc] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved) setSrc(saved)
    } catch {
      /* ignore */
    }
  }, [key])

  const load = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      setSrc(url)
      try {
        localStorage.setItem(key, url)
      } catch {
        /* ignore quota */
      }
    }
    reader.readAsDataURL(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) load(file)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 190,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        borderRadius: 0,
        color: 'var(--text-3)',
        fontSize: 12.5,
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
        background: src ? undefined : 'var(--surface-2)',
        outline: over ? '2px dashed var(--accent)' : 'none',
        outlineOffset: -2,
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {!src && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10" r="1.5" />
            <path d="M5 17l4.5-4 3 2.5L16 12l3 3" />
          </svg>
          {placeholder}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) load(f)
        }}
      />
    </div>
  )
}
