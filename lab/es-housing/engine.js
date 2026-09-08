/** Skeleton only. Real checklists belong in a later MVP, not 011 overwrite. */

export const PHASES = ["viewing", "contract", "move_in", "move_out"];

export function buildPack(_answers = {}) {
  return { ok: false, error: "not_implemented", phases: PHASES };
}
