import { useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Slide {
  id: string
  content: ReactNode
}

export function Slideshow({
  slides,
  intervalMs = 6000,
  className,
  showControls = true,
  showDots = true,
  pauseOnHover = true,
}: {
  slides: Slide[]
  intervalMs?: number
  className?: string
  showControls?: boolean
  showDots?: boolean
  pauseOnHover?: boolean
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (slides.length <= 1 || paused) return
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [slides.length, intervalMs, paused])

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length)
  const next = () => setIndex((i) => (i + 1) % slides.length)

  if (!slides.length) return null

  return (
    <div
      className={cn('relative overflow-hidden rounded-[1.6rem]', className)}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="min-w-full shrink-0">
            {slide.content}
          </div>
        ))}
      </div>

      {showControls && slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-ink-900/70 text-white backdrop-blur transition-colors hover:bg-white/10 focus-ring"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-ink-900/70 text-white backdrop-blur transition-colors hover:bg-white/10 focus-ring"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      {showDots && slides.length > 1 ? (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-accent' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}