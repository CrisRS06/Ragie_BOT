/**
 * Sistema de Autenticación
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
);

export const COOKIE_NAME = 'auth-token';

/**
 * Roles disponibles en el sistema
 */
export type RolUsuario =
  | 'ADMINISTRADOR_CONTRATISTA'
  | 'OPERADOR_BODEGA'
  | 'FISCALIZADOR_PANI'
  | 'AUDITOR';

/**
 * Interfaz de usuario autenticado
 */
export interface UsuarioAuth {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo?: boolean;
}

/**
 * Crear token JWT
 */
export async function createToken(payload: UsuarioAuth): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/**
 * Verificar token JWT
 */
export async function verifyToken(token: string): Promise<UsuarioAuth | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UsuarioAuth;
  } catch {
    return null;
  }
}

/**
 * Obtiene el usuario actual desde cookies (server-side)
 */
export async function getCurrentUser(): Promise<UsuarioAuth | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Obtiene el ID del usuario actual
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

/**
 * Login de usuario
 */
export async function loginUser(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { email, activo: true },
  });

  if (!usuario) {
    return { success: false, error: 'Credenciales inválidas' };
  }

  const passwordValid = await bcrypt.compare(password, usuario.passwordHash);

  if (!passwordValid) {
    return { success: false, error: 'Credenciales inválidas' };
  }

  // Actualizar último acceso
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcceso: new Date() },
  });

  const userPayload: UsuarioAuth = {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol as RolUsuario,
  };

  const token = await createToken(userPayload);

  return {
    success: true,
    token,
    user: userPayload,
  };
}

/**
 * Hash de contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export function hasRole(user: UsuarioAuth | null, requiredRole: RolUsuario): boolean {
  if (!user) return false;
  return user.rol === requiredRole;
}

/**
 * Verifica si el usuario tiene alguno de los roles especificados
 */
export function hasAnyRole(user: UsuarioAuth | null, roles: RolUsuario[]): boolean {
  if (!user) return false;
  return roles.includes(user.rol);
}

/**
 * Permisos por rol
 */
export const PERMISOS_POR_ROL: Record<RolUsuario, string[]> = {
  ADMINISTRADOR_CONTRATISTA: [
    'articulos.crear',
    'articulos.editar',
    'articulos.eliminar',
    'recepciones.crear',
    'despachos.crear',
    'despachos.excepcion_peps',
    'cortes.crear',
    'informes.generar',
    'bitacora.ver',
    'bitacora.verificar',
    'usuarios.gestionar',
  ],
  OPERADOR_BODEGA: [
    'articulos.ver',
    'recepciones.crear',
    'despachos.crear',
    'inventario.ver',
    'cortes.ver',
  ],
  FISCALIZADOR_PANI: [
    'articulos.ver',
    'inventario.ver',
    'cortes.ver',
    'informes.ver',
    'informes.descargar',
    'bitacora.ver',
  ],
  AUDITOR: [
    'articulos.ver',
    'inventario.ver',
    'cortes.ver',
    'informes.ver',
    'informes.descargar',
    'bitacora.ver',
    'bitacora.verificar',
    'bitacora.exportar',
  ],
};

/**
 * Verifica si el usuario tiene un permiso específico
 */
export function hasPermission(user: UsuarioAuth | null, permission: string): boolean {
  if (!user) return false;
  const permisos = PERMISOS_POR_ROL[user.rol] || [];
  return permisos.includes(permission);
}

/**
 * Información del usuario para mostrar en UI
 */
export function getUserDisplayInfo(user: UsuarioAuth | null): { nombre: string; email: string; rolDisplay: string } | null {
  if (!user) return null;

  const rolDisplayMap: Record<RolUsuario, string> = {
    ADMINISTRADOR_CONTRATISTA: 'Administrador',
    OPERADOR_BODEGA: 'Operador de Bodega',
    FISCALIZADOR_PANI: 'Fiscalizador PANI',
    AUDITOR: 'Auditor',
  };

  return {
    nombre: user.nombre,
    email: user.email,
    rolDisplay: rolDisplayMap[user.rol],
  };
}
