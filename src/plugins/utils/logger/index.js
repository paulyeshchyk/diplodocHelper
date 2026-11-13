'use strict';

/*
 * CJS bridge for legacy .js-modules: `require('../utils/logger')`.
 * Node 22.6+ resolves './index.ts' via built-in type-stripping.
 * If unavailable → no-op fallback + stderr warning (не падаем на старом Node).
 */

let real = null;
try {
  real = require('./index.ts');
} catch (err) {
  const msg = String((err && err.message) || err);
  const isTsLoaderIssue =
    /\.ts\b|ERR_UNKNOWN_FILE_EXTENSION|ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING|Cannot find module '.*index\.ts'/i.test(msg);
  if (!isTsLoaderIssue) throw err;

  process.stderr.write(
    `[logger] TypeScript loader unavailable: ${msg}\n` +
    `[logger] falling back to no-op. Upgrade Node to >=22.6.0 for full logging.\n`
  );

  const noop = {
    debug() { }, info() { }, warn() { }, error() { }, log() { },
    child() { return noop; }, close() { },
  };
  module.exports = {
    getLogger: () => noop,
    initLogger: () => noop,
    createLogger: () => noop,
    resetLogger() { },
    parseLevel: (v, f = 'off') => f,
    tryParseLevel: () => undefined,
    isEnabled: () => false,
    DEFAULT_LOGGER_CONFIG: Object.freeze({ level: 'off', console: false, file: null, format: 'text', color: false }),
    Logger: noop,
    ScopedLogger: noop,
  };
}

if (real) module.exports = real;