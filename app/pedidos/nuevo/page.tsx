'use client'

import { useRoleAccess } from '@/hooks/useRoleAccess'
import { AccessDenied } from '@/components/ui/access-denied'
import { PedidoForm } from '@/components/forms/pedido-form'

export default function NuevoPedidoPage() {
  const { hasAccess, loading } = useRoleAccess({ requiredPermission: 'pedidos.crear' })

  if (loading) return <div className="container mx-auto px-4 py-6 text-zinc-500">Cargando...</div>
  if (!hasAccess) return <AccessDenied />

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Nueva orden de pedido</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Solicite artículos a la bodega. Super Cadena recibirá tu pedido y lo preparará para retiro.
        </p>
      </div>
      <PedidoForm />
    </div>
  )
}
