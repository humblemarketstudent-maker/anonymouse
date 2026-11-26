/** Stable anonymous id. Not reversible to a name, phone, or session token. */
export function sessionHash(value: string, salt = ""): string {
  const source = `${salt}:${value}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < source.length; i += 1) {
    const code = source.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x01000193);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `ses_${hex(h1)}${hex(h2)}`;
}
