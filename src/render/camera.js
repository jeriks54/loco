// Coordinates are CSS pixels. Canvas backing-store density never affects input.
export const boardPadding = tile => tile >= 24 ? Math.round(tile * .5) : 0;

export function createCamera() {
  const view = { width: 1, height: 1, cols: 1, rows: 1, tile: 1,
    fitTile: 1, x: 0, y: 0, following: true };
  const world = () => ({ width: view.cols * view.tile + 2 * boardPadding(view.tile),
    height: view.rows * view.tile + 2 * boardPadding(view.tile) });
  function clamp() {
    const size = world();
    view.x = size.width <= view.width ? (view.width - size.width) / 2
      : Math.max(view.width - size.width, Math.min(0, view.x));
    view.y = size.height <= view.height ? (view.height - size.height) / 2
      : Math.max(view.height - size.height, Math.min(0, view.y));
  }
  function center(x, y) {
    view.x = view.width / 2 - x;
    view.y = view.height / 2 - y;
    clamp();
  }
  function fit() {
    view.tile = view.fitTile;
    const size = world();
    center(size.width / 2, size.height / 2);
    view.following = false;
  }
  function resize(width, height, cols, rows, reset = false) {
    const ratio = view.tile / view.fitTile;
    const cx = (view.width / 2 - view.x - boardPadding(view.tile)) / view.tile;
    const cy = (view.height / 2 - view.y - boardPadding(view.tile)) / view.tile;
    Object.assign(view, { width, height, cols, rows });
    let t = Math.min(64, Math.floor(Math.min(width / cols, height / rows)));
    while (t > 1 && (cols * t + 2 * boardPadding(t) > width || rows * t + 2 * boardPadding(t) > height)) t--;
    view.fitTile = Math.max(.1, Math.min(t || 1, width / cols, height / rows));
    if (reset || ratio <= 1.001) {
      const following = view.following;
      fit();
      if (!reset) view.following = following;
    }
    else {
      view.tile = Math.min(64, view.fitTile * ratio);
      center(cx * view.tile + boardPadding(view.tile), cy * view.tile + boardPadding(view.tile));
    }
  }
  function zoom(factor, x = view.width / 2, y = view.height / 2) {
    const before = view.tile;
    const pad = boardPadding(before);
    const wx = (x - view.x - pad) / before, wy = (y - view.y - pad) / before;
    view.tile = Math.max(view.fitTile, Math.min(64, before * factor));
    view.x = x - wx * view.tile - boardPadding(view.tile);
    view.y = y - wy * view.tile - boardPadding(view.tile);
    clamp();
  }
  function pan(dx, dy) { view.following = false; view.x += dx; view.y += dy; clamp(); }
  function track(x, y) { if (view.following) center(x, y); }
  return { view, resize, fit, zoom, pan, track, center, world };
}
