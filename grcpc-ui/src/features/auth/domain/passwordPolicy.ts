export function isValidPassword(value: string): boolean {
  return value.trim().length > 0 && value.length >= 8 && new TextEncoder().encode(value).length <= 72;
}
