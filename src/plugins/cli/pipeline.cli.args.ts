/**
 * Извлечение `--flag=value` / `--flag value` из argv.
 * `null`, если флаг не задан.
 */
export function extractFlag(argv: string[], flag: string): string | null {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith(flag + '=')) return a.slice(flag.length + 1);
    if (a === flag && argv[i + 1]) return argv[i + 1];
  }
  return null;
}

export function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag) || argv.some(a => a.startsWith(flag + '='));
}