/** Skeleton: validate a brand-stamp job. No file writes. */

const ID_RE = /^(?:[0-9]{3})$/;
const CODE_RE = /^[A-Z0-9-]{2,16}$/;

export function planStamp(input, { write = false } = {}) {
  if (!input || typeof input !== "object") return { ok: false, error: "bad_input" };
  const id = String(input.id || "");
  const code = String(input.code || "").toUpperCase();
  if (!ID_RE.test(id)) return { ok: false, error: "bad_id" };
  if (!CODE_RE.test(code)) return { ok: false, error: "bad_code" };
  const target = `${id}/og-${id}.png`;
  return {
    ok: true,
    dryRun: write !== true,
    write: write === true,
    id,
    code,
    target,
    note: write ? "write_not_implemented" : "dry_run",
  };
}
