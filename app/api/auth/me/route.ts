import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapUserToAuth, getUserDisplayInfo } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    const userAuth = mapUserToAuth(user)

    return NextResponse.json({
      success: true,
      user: {
        id: userAuth.id,
        email: userAuth.email,
        nombre: userAuth.nombre,
        rol: userAuth.rol,
      },
    })
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
