/* ============================================================
   LoCo — progress persistence (design.md §7, M2 task C)
   Stores which levels are completed, nothing else:
     localStorage['loco.progress.v1'] = { completed: ['ch1-01', ...] }
   localStorage is only touched lazily inside the functions and
   every access is guarded, so this module imports cleanly in
   Node and tolerates missing/corrupt/shape-wrong storage
   silently (returns empty progress).
   ============================================================ */

const STORAGE_KEY = 'loco.progress.v1';

/**
 * Load the completed level ids.
 * A missing key, corrupt JSON, wrong-shape data, or an unavailable
 * localStorage all yield an empty set — this never throws.
 * @returns {Set<string>} completed level ids
 */
export function loadProgress() {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Set();
    if (!Array.isArray(parsed.completed)) return new Set();
    return new Set(parsed.completed.filter((id) => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

/**
 * Record a level as completed and persist the progress.
 * Idempotent. A write failure (quota, privacy mode, no storage)
 * is tolerated — the returned set is still correct for this session.
 * @param {string} levelId
 * @returns {Set<string>} the updated completed set
 */
export function markCompleted(levelId) {
  const completed = loadProgress();
  if (typeof levelId === 'string' && levelId.length > 0) {
    completed.add(levelId);
  }
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: [...completed] }));
  } catch {
    /* storage unavailable/full — progress stays in-memory only */
  }
  return completed;
}
