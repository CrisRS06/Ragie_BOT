/**
 * Utilidades para hashing y verificación de integridad
 * REQUERIMIENTO CRÍTICO: Hash encadenado para bitácora inmutable
 */

import crypto from 'crypto';

/**
 * Genera un hash SHA-256 de un string
 */
export function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Genera un hash encadenado para la bitácora
 * @param previousHash Hash del registro anterior
 * @param eventData Datos del evento actual
 */
export function generateChainedHash(previousHash: string | null, eventData: any): string {
  const dataString = JSON.stringify(eventData);
  const combined = `${previousHash || ''}${dataString}`;
  return generateHash(combined);
}

/**
 * Verifica la integridad de una cadena de hashes
 * @param records Array de registros con hashActual y hashAnterior
 */
export function verifyChainIntegrity(
  records: Array<{ hashActual: string; hashAnterior: string | null; [key: string]: any }>
): { isValid: boolean; invalidAt?: number; message: string } {
  if (records.length === 0) {
    return { isValid: true, message: 'No hay registros para verificar' };
  }

  // Verificar primer registro
  if (records[0].hashAnterior !== null) {
    return {
      isValid: false,
      invalidAt: 0,
      message: 'El primer registro debe tener hashAnterior null',
    };
  }

  // Verificar cadena
  for (let i = 1; i < records.length; i++) {
    const current = records[i];
    const previous = records[i - 1];

    if (current.hashAnterior !== previous.hashActual) {
      return {
        isValid: false,
        invalidAt: i,
        message: `Cadena rota en el registro ${i}. El hashAnterior no coincide con el hashActual del registro anterior.`,
      };
    }
  }

  return {
    isValid: true,
    message: `Cadena verificada correctamente. ${records.length} registros válidos.`,
  };
}

/**
 * Genera un hash único para un documento (PDF, CSV, etc.)
 */
export function generateDocumentHash(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Genera un código de verificación legible (para imprimir en PDFs)
 */
export function generateVerificationCode(hash: string): string {
  return `${hash.substring(0, 8).toUpperCase()}-${hash.substring(8, 16).toUpperCase()}`;
}

/**
 * Firma digital simple con timestamp
 */
export function generateDigitalSignature(data: any): {
  timestamp: string;
  hash: string;
  signature: string;
} {
  const timestamp = new Date().toISOString();
  const dataWithTimestamp = { ...data, timestamp };
  const hash = generateHash(JSON.stringify(dataWithTimestamp));
  const signature = generateHash(`${hash}${process.env.JWT_SECRET}`);

  return { timestamp, hash, signature };
}

/**
 * Verifica una firma digital
 */
export function verifyDigitalSignature(
  data: any,
  timestamp: string,
  hash: string,
  signature: string
): boolean {
  const dataWithTimestamp = { ...data, timestamp };
  const expectedHash = generateHash(JSON.stringify(dataWithTimestamp));

  if (expectedHash !== hash) {
    return false;
  }

  const expectedSignature = generateHash(`${hash}${process.env.JWT_SECRET}`);
  return expectedSignature === signature;
}
