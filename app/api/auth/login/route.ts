import { NextRequest, NextResponse } from 'next/server';
import { loginUser, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Error parsing request body', details: String(parseError) },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Step 2: Attempt login
    let result;
    try {
      result = await loginUser(email, password);
    } catch (loginError) {
      console.error('Error in loginUser:', loginError);
      return NextResponse.json(
        { success: false, error: 'Error during login', details: String(loginError) },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Crear response con cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    // Establecer cookie HTTP-only
    response.cookies.set(COOKIE_NAME, result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error en login (outer):', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: String(error) },
      { status: 500 }
    );
  }
}
