'use client'

import { useEffect, useState } from 'react'

export function ContadorBadge() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let abort = false
    async function tick() {
      try {
        const res = await fetch('/api/pedidos/contador', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!abort && data?.success) setCount(Number(data.total) || 0)
      } catch (err) {
        // badge desaparece si falla, pero dejamos rastro para diagnóstico
        console.warn('No se pudo cargar el contador de pedidos', err)
      }
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => { abort = true; clearInterval(id) }
  }, [])

  if (!count) return null
  return (
    <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 text-[10px] font-bold rounded-full bg-red-600 text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
