import { NextResponse } from 'next/server';
import { getCurrentUser, getUserDisplayInfo } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autenticado' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: getUserDisplayInfo(user),
  });
}
