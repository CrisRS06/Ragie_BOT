/**
 * Endpoint de diagnóstico para probar JSON parsing
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Leer el body como texto primero
    const rawBody = await request.text();

    console.log('Raw body recibido:', rawBody);
    console.log('Body length:', rawBody.length);

    // Intentar parsear manualmente
    let parsed;
    try {
      parsed = JSON.parse(rawBody);
      console.log('JSON parseado exitosamente:', parsed);
    } catch (parseError) {
      console.error('Error al parsear JSON:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Error de parsing',
        rawBody: rawBody,
        rawLength: rawBody.length,
        parseError: String(parseError),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      received: parsed,
      rawLength: rawBody.length,
    });
  } catch (error) {
    console.error('Error general:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de diagnóstico activo',
    timestamp: new Date().toISOString(),
  });
}
