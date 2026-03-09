/**
 * Sanitizer for PostgREST filter values.
 * Strips characters that could manipulate PostgREST .or() / .ilike() filters.
 */
export function sanitizePostgrestValue(input: string): string {
  return input.replace(/[(),.\\*"]/g, '')
}
