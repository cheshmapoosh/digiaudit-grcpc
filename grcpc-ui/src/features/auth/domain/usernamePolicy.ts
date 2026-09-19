export function isValidUsername(value: string): boolean {
  return /^[A-Za-z0-9]{1,100}$/.test(value);
}
