/** Leveled JSON logs to stdout. No secrets. */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

export function resolveLevel(name) {
  const key = String(name || "info").toLowerCase();
  return LEVELS[key] ? key : "info";
}

export function createLogger(levelName = process.env.LOG_LEVEL) {
  const min = LEVELS[resolveLevel(levelName)];
  function write(level, msg, extra = {}) {
    if (LEVELS[level] < min) return;
    const rec = { t: new Date().toISOString(), level, msg, ...extra };
    const line = JSON.stringify(rec);
    if (level === "error") process.stderr.write(line + "\n");
    else process.stdout.write(line + "\n");
  }
  return {
    debug: (msg, extra) => write("debug", msg, extra),
    info: (msg, extra) => write("info", msg, extra),
    warn: (msg, extra) => write("warn", msg, extra),
    error: (msg, extra) => write("error", msg, extra),
  };
}
