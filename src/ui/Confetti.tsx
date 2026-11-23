import { useEffect, useRef } from 'react'

const COLORS = ['#c6ff3d', '#e6ff9a', '#a8e61c', '#ffffff', '#ff8a1f']

/** קונפטי בצבעי ליים, מצויר על canvas. מופעל כש-trigger משתנה. */
export function Confetti({ trigger }: { trigger: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!trigger || !ref.current) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const W = window.innerWidth, H = window.innerHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    const parts = Array.from({ length: 110 }, () => ({
      x: Math.random() * W, vx: (Math.random() - 0.5) * 4.4, vy: Math.random() * 6 - 2,
      size: 6 + Math.random() * 6, spin: (Math.random() - 0.5) * 6, color: COLORS[Math.floor(Math.random() * COLORS.length)],
      circle: Math.random() < 0.5,
    }))
    const start = performance.now()
    let raf = 0
    const draw = (now: number) => {
      const t = (now - start) / 1000
      ctx.clearRect(0, 0, W, H)
      if (t > 3.2) return
      ctx.globalAlpha = Math.max(0, 1 - t / 3.2)
      for (const p of parts) {
        const px = p.x + p.vx * t * 60
        const py = -20 + p.vy * t * 60 + 0.5 * 420 * t * t
        if (py > H + 20) continue
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(p.spin * t)
        ctx.fillStyle = p.color
        if (p.circle) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill() }
        else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [trigger])

  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 80 }} />
}
