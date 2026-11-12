import type { ArgSpec } from './types.ts';

/**
 * Единый парсер CLI-аргументов.
 *
 * Поддерживает:
 *   - `--key=value` (одно поле argv);
 *   - `--key value` (два поля, если тип не boolean);
 *   - `--key` (boolean, если тип boolean);
 *   - `--key=false` / `--key=true` — boolean явно.
 *
 * Не поддерживает: короткие флаги (-l), positional args (их
 * обрабатывает вызывающий CLI). `--help` НЕ парсится — это ответственность
 * CLI-уровня (см. §2.9 плана).
 *
 * Поведение на ошибках:
 *   - unknown flag → throw (не молчать);
 *   - number-парсинг провален → throw;
 *   - boolean без явного `=true|false` — `true`.
 */
export function parseArgs(
  argv: string[],
  specs: ReadonlyArray<ArgSpec>,
  seedDefaults = true,
): Record<string, unknown> {
  const specByName = new Map<string, ArgSpec>();
  for (const s of specs) {
    const key = s.flag.replace(/^--/, '');
    specByName.set(key, s);
  }

  const result: Record<string, unknown> = {};

  // Seed defaults (только для direct-CLI invocation).
  // В registry.run — `false`: не затираем commonOpts значениями по умолчанию.
  if (seedDefaults) {
    for (const s of specs) {
      if (s.default !== undefined) result[s.name] = s.default;
    }
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      throw new Error(`Неожиданный аргумент: "${a}" (ожидался --flag)`);
    }

    const eq = a.indexOf('=');
    let key: string;
    let inlineValue: string | undefined;
    if (eq !== -1) {
      key = a.slice(2, eq);
      inlineValue = a.slice(eq + 1);
    } else {
      key = a.slice(2);
    }

    const spec = specByName.get(key);
    if (!spec) {
      throw new Error(`Неизвестный флаг: --${key}`);
    }

    if (spec.type === 'boolean') {
      if (inlineValue === undefined) {
        result[spec.name] = true;
      } else if (inlineValue === 'true') {
        result[spec.name] = true;
      } else if (inlineValue === 'false') {
        result[spec.name] = false;
      } else {
        throw new Error(
          `--${key}: ожидалось true|false, получено "${inlineValue}"`,
        );
      }
    } else {
      let rawValue: string;
      if (inlineValue !== undefined) {
        rawValue = inlineValue;
      } else {
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) {
          throw new Error(`--${key}: пропущено значение`);
        }
        rawValue = next;
        i++;
      }

      if (spec.type === 'number') {
        const num = Number(rawValue);
        if (!Number.isFinite(num)) {
          throw new Error(
            `--${key}: ожидалось число, получено "${rawValue}"`,
          );
        }
        result[spec.name] = num;
      } else {
        result[spec.name] = rawValue;
      }
    }
  }

  // Required check.
  for (const s of specs) {
    if (s.required && result[s.name] === undefined) {
      throw new Error(`--${s.flag.replace(/^--/, '')}: обязательный флаг`);
    }
  }

  return result;
}

/**
 * Конвертирует `Record<string, unknown>` (effective opts) обратно в
 * argv для передачи в legacy `runXxx(argv)`, которые ещё не перешли на
 * `run(opts)`. Используется в Wave 2 `ModuleDef.load()`.
 *
 * Пропускает:
 *   - `undefined` и `null` (нет значения);
 *   - `false` для boolean (не передаём `--flag=false` — некоторые
 *     legacy-парсеры это не понимают).
 *
 * `true` для boolean → `--flag` (без `=true`), совместимо со всеми
 * legacy-парсерами.
 */
export function toArgv(opts: Record<string, unknown>, skipKeys: ReadonlySet<string> = new Set(),): string[] {
  const argv: string[] = [];
  for (const [k, v] of Object.entries(opts)) {
    if (skipKeys.has(k)) continue;
    if (v === undefined || v === null) continue;
    const flag = '--' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
    if (typeof v === 'boolean') {
      if (v) argv.push(flag);
    } else {
      argv.push(`${flag}=${String(v)}`);
    }
  }
  return argv;
}