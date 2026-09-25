import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { createPortal } from 'react-dom'

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5

type Point = { x: number; y: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// Visor a pantalla completa: acercar con rueda, pellizco o doble toque,
// y arrastrar para moverse por la foto.
export default function ImageViewer({
  images,
  startIndex,
  alt,
  onClose,
  onIndexChange,
}: {
  images: string[]
  startIndex: number
  alt: string
  onClose: () => void
  onIndexChange?: (index: number) => void
}) {
  const [index, setIndex] = useState(startIndex)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })

  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const pointers = useRef(new Map<number, Point>())
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null)
  const lastTap = useRef(0)
  const moved = useRef(false)

  // Estado actual en refs para los manejadores de eventos.
  const scaleRef = useRef(scale)
  const offsetRef = useRef(offset)
  scaleRef.current = scale
  offsetRef.current = offset

  const hasMany = images.length > 1

  // Actualiza estado y refs a la vez, para que varios movimientos seguidos
  // (antes de que React vuelva a pintar) usen siempre el valor más reciente.
  function apply(nextScale: number, nextOffset: Point) {
    scaleRef.current = nextScale
    offsetRef.current = nextOffset
    setScale(nextScale)
    setOffset(nextOffset)
  }

  function limitOffset(next: Point, s: number): Point {
    const stage = stageRef.current
    const img = imgRef.current
    if (!stage || !img) return next

    const maxX = Math.max(0, (img.offsetWidth * s - stage.clientWidth) / 2)
    const maxY = Math.max(0, (img.offsetHeight * s - stage.clientHeight) / 2)

    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) }
  }

  // Acerca o aleja manteniendo fijo el punto (en coordenadas de pantalla).
  function zoomTo(nextScale: number, clientX?: number, clientY?: number) {
    const stage = stageRef.current
    const s = clamp(nextScale, MIN_SCALE, MAX_SCALE)

    if (s === 1) {
      apply(1, { x: 0, y: 0 })
      return
    }

    let next = offsetRef.current

    if (stage && clientX !== undefined && clientY !== undefined) {
      const rect = stage.getBoundingClientRect()
      const px = clientX - (rect.left + rect.width / 2)
      const py = clientY - (rect.top + rect.height / 2)
      const ratio = s / scaleRef.current
      next = {
        x: px - (px - next.x) * ratio,
        y: py - (py - next.y) * ratio,
      }
    }

    apply(s, limitOffset(next, s))
  }

  function resetZoom() {
    apply(1, { x: 0, y: 0 })
  }

  function go(step: number) {
    const next = (index + step + images.length) % images.length
    setIndex(next)
    resetZoom()
    onIndexChange?.(next)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (hasMany && e.key === 'ArrowRight') go(1)
      if (hasMany && e.key === 'ArrowLeft') go(-1)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  })

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2
    zoomTo(scaleRef.current * factor, e.clientX, e.clientY)
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = false

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchStart.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: scaleRef.current,
      }
    }
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(e.pointerId)
    if (!previous) return

    const current = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, current)

    if (Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y) > 2) {
      moved.current = true
    }

    // Dos dedos: pellizco
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      const nextScale = pinchStart.current.scale * (distance / pinchStart.current.distance)
      zoomTo(nextScale, (a.x + b.x) / 2, (a.y + b.y) / 2)
      return
    }

    // Un dedo o mouse: mover la foto ampliada
    if (pointers.current.size === 1 && scaleRef.current > 1) {
      apply(
        scaleRef.current,
        limitOffset(
          {
            x: offsetRef.current.x + (current.x - previous.x),
            y: offsetRef.current.y + (current.y - previous.y),
          },
          scaleRef.current
        )
      )
    }
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    const wasSingle = pointers.current.size === 1
    pointers.current.delete(e.pointerId)

    if (pointers.current.size < 2) pinchStart.current = null
    if (!wasSingle || moved.current) return

    // Doble toque / doble clic: acercar ahí o volver al tamaño normal
    const now = Date.now()
    if (now - lastTap.current < 300) {
      lastTap.current = 0
      if (scaleRef.current > 1) resetZoom()
      else zoomTo(DOUBLE_TAP_SCALE, e.clientX, e.clientY)
    } else {
      lastTap.current = now
    }
  }

  return createPortal(
    <div className="image-viewer" role="dialog" aria-modal="true" aria-label={`Foto ampliada: ${alt}`}>
      <div
        ref={stageRef}
        className={scale > 1 ? 'image-viewer-stage zoomed' : 'image-viewer-stage'}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={images[index]}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        />
      </div>

      <button type="button" className="image-viewer-close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>

      {hasMany && (
        <>
          <button type="button" className="image-viewer-nav prev" onClick={() => go(-1)} aria-label="Foto anterior">
            ‹
          </button>
          <button type="button" className="image-viewer-nav next" onClick={() => go(1)} aria-label="Foto siguiente">
            ›
          </button>
        </>
      )}

      <div className="image-viewer-toolbar">
        <button
          type="button"
          onClick={() => zoomTo(scale / 1.5)}
          disabled={scale <= MIN_SCALE}
          aria-label="Alejar"
        >
          −
        </button>
        <span>{hasMany ? `${index + 1} / ${images.length}` : `${Math.round(scale * 100)}%`}</span>
        <button
          type="button"
          onClick={() => zoomTo(scale * 1.5)}
          disabled={scale >= MAX_SCALE}
          aria-label="Acercar"
        >
          +
        </button>
      </div>

      {scale === 1 && (
        <p className="image-viewer-hint">
          {window.matchMedia('(pointer: fine)').matches
            ? 'Doble clic o rueda del mouse para acercar'
            : 'Toca dos veces o pellizca para acercar'}
        </p>
      )}
    </div>,
    document.body
  )
}