export function hashCode(code: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < code.length; index++) {
    hash = Math.imul(hash ^ code.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
