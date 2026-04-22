/**
 * Descarga un archivo desde una URL protegida.
 * Usa fetch + blob para preservar el estado de React (no navega la pestaña)
 * y poder reportar errores al usuario en vez de mostrar JSON crudo.
 */

export interface DescargaError extends Error {
  status?: number
}

export interface DescargaOptions {
  /** Si se pasa, se valida que el Content-Type de la respuesta lo incluya (case-insensitive). */
  expectedContentType?: string
}

export async function descargarArchivo(
  url: string,
  fallbackFilename: string,
  opts: DescargaOptions = {}
): Promise<void> {
  if (!fallbackFilename) {
    throw new Error('descargarArchivo: fallbackFilename es requerido')
  }

  const response = await fetch(url, { credentials: 'same-origin' })

  if (!response.ok) {
    let mensaje = `Error ${response.status}`
    try {
      const json = await response.json()
      if (json?.error) mensaje = json.error
    } catch {
      // respuesta no es JSON — se queda con el mensaje por status
    }
    const err: DescargaError = new Error(mensaje)
    err.status = response.status
    throw err
  }

  const contentType = response.headers.get('Content-Type') || ''
  if (
    opts.expectedContentType &&
    !contentType.toLowerCase().includes(opts.expectedContentType.toLowerCase())
  ) {
    throw new Error(
      `Respuesta con formato inesperado (${contentType || 'sin tipo'}). Intenta de nuevo.`
    )
  }

  const filename =
    extraerFilename(response.headers.get('Content-Disposition')) || fallbackFilename

  const blob = await response.blob()
  if (blob.size === 0) {
    throw new Error('El servidor devolvió una respuesta vacía')
  }

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function extraerFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null

  // RFC 5987 extendido: filename*=UTF-8''valor-percent-encoded
  const rfc5987 = contentDisposition.match(
    /filename\*\s*=\s*(?:UTF-8'')?([^";\s]+)/i
  )
  if (rfc5987) {
    try {
      return decodeURIComponent(rfc5987[1]).trim() || null
    } catch {
      return null
    }
  }

  // Forma clásica: filename="valor" o filename=valor
  const clasica = contentDisposition.match(
    /filename\s*=\s*["']?([^"';\r\n]+?)["']?\s*(?:;|$)/i
  )
  if (!clasica) return null

  const raw = clasica[1].trim()
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
