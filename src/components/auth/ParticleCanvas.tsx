import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  ox: number
  oy: number
  vx: number
  vy: number
  size: number
  alpha: number
}

const MOUSE_RADIUS = 110
const REPULSION = 9
const SPRING = 0.055
const FRICTION = 0.80
const SAMPLE_STEP = 4
const BRIGHTNESS_THRESHOLD = 72
const MAX_PARTICLES = 20000
const BG_COLOR = '#060610'

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let animId: number
    let particles: Particle[] = []
    const mouse = { x: -9999, y: -9999 }

    function buildParticles(w: number, h: number, img: HTMLImageElement) {
      const next: Particle[] = []
      const imgAspect = img.naturalWidth / img.naturalHeight
      const canvasAspect = w / h

      let drawW: number, drawH: number
      if (imgAspect > canvasAspect) {
        drawW = w * 0.82
        drawH = drawW / imgAspect
      } else {
        drawH = h * 0.82
        drawW = drawH * imgAspect
      }
      const drawX = (w - drawW) / 2
      const drawY = (h - drawH) / 2

      const off = document.createElement('canvas')
      off.width = Math.round(drawW)
      off.height = Math.round(drawH)
      const offCtx = off.getContext('2d')!
      offCtx.drawImage(img, 0, 0, off.width, off.height)

      const { data } = offCtx.getImageData(0, 0, off.width, off.height)

      for (let py = 0; py < off.height; py += SAMPLE_STEP) {
        for (let px = 0; px < off.width; px += SAMPLE_STEP) {
          const i = (py * off.width + px) * 4
          const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          if (brightness > BRIGHTNESS_THRESHOLD) {
            const norm = brightness / 255
            const ox = drawX + px
            const oy = drawY + py
            // scatter particles from random positions on load
            next.push({
              x: Math.random() * w,
              y: Math.random() * h,
              ox,
              oy,
              vx: 0,
              vy: 0,
              size: 0.5 + Math.random() * 1.1,
              alpha: 0.35 + norm * 0.65,
            })
          }
        }
      }

      if (next.length > MAX_PARTICLES) {
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[next[i], next[j]] = [next[j], next[i]]
        }
        next.length = MAX_PARTICLES
      }

      particles = next
    }

    function animate() {
      if (!ctx) return
      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, canvas!.width, canvas!.height)

      const mx = mouse.x
      const my = mouse.y
      const r2 = MOUSE_RADIUS * MOUSE_RADIUS

      for (const p of particles) {
        p.vx += (p.ox - p.x) * SPRING
        p.vy += (p.oy - p.y) * SPRING

        const mdx = p.x - mx
        const mdy = p.y - my
        const distSq = mdx * mdx + mdy * mdy
        if (distSq < r2) {
          const dist = Math.sqrt(distSq) || 0.1
          const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) * REPULSION
          p.vx += (mdx / dist) * force
          p.vy += (mdy / dist) * force
        }

        p.vx *= FRICTION
        p.vy *= FRICTION
        p.x += p.vx
        p.y += p.vy

        ctx.globalAlpha = p.alpha
        ctx.fillStyle = '#dde4ff'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      animId = requestAnimationFrame(animate)
    }

    function setup() {
      canvas!.width = container!.offsetWidth
      canvas!.height = container!.offsetHeight

      const img = new Image()
      img.onload = () => {
        buildParticles(canvas!.width, canvas!.height, img)
        cancelAnimationFrame(animId)
        animate()
      }
      img.src = '/FotoGabri.jpg'
    }

    setup()

    const ro = new ResizeObserver(setup)
    ro.observe(container)

    const onMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect()
      mouse.x = (e.clientX - rect.left) * (canvas!.width / rect.width)
      mouse.y = (e.clientY - rect.top) * (canvas!.height / rect.height)
    }
    const onLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
