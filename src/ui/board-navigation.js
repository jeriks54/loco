// Gestures stay on the board; the mobile editor retains its own touch handling.
export function createBoardNavigation({ canvas, controls, camera, changed, follow }) {
  const { view } = camera;
  const pointers = new Map();
  const plus = controls.querySelector('[data-camera="in"]');
  const minus = controls.querySelector('[data-camera="out"]');
  const followButton = controls.querySelector('[data-camera="follow"]');
  const status = controls.querySelector('output');
  function update() {
    plus.disabled = view.tile >= 63.99;
    minus.disabled = view.tile <= view.fitTile + .01;
    followButton.setAttribute('aria-pressed', String(view.following));
    const zoomText = `${Math.round(view.tile / view.fitTile * 100)}%`;
    if (status.textContent !== zoomText) status.textContent = zoomText;
    // Also useful to inspect camera state without exposing app internals.
    canvas.dataset.camera = JSON.stringify(view);
  }
  function commit() { changed(); update(); }
  controls.addEventListener('click', event => {
    const action = event.target.closest('[data-camera]')?.dataset.camera;
    if (!action) return;
    if (action === 'fit') camera.fit();
    if (action === 'in') camera.zoom(1.4);
    if (action === 'out') camera.zoom(1 / 1.4);
    if (action === 'follow') {
      if (view.following) view.following = false;
      else follow(true);
    }
    commit();
  });
  const point = event => {
    const box = canvas.getBoundingClientRect();
    return { x: (event.clientX - box.left) * view.width / box.width,
      y: (event.clientY - box.top) * view.height / box.height };
  };
  const pair = () => {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      distance: Math.hypot(a.x - b.x, a.y - b.y) };
  };
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    canvas.focus({ preventScroll: true });
    pointers.set(event.pointerId, point(event));
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const oldPair = pointers.size === 2 ? pair() : null;
    const next = point(event);
    pointers.set(event.pointerId, next);
    if (oldPair) {
      const nextPair = pair();
      camera.pan(nextPair.x - oldPair.x, nextPair.y - oldPair.y);
      if (oldPair.distance > 0) camera.zoom(nextPair.distance / oldPair.distance, nextPair.x, nextPair.y);
    } else camera.pan(next.x - previous.x, next.y - previous.y);
    commit();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, event => pointers.delete(event.pointerId));
  }
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const p = point(event);
    view.following = false;
    camera.zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    commit();
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const moves = { ArrowLeft: [48, 0], ArrowRight: [-48, 0], ArrowUp: [0, 48], ArrowDown: [0, -48] };
    if (moves[event.key]) camera.pan(...moves[event.key]);
    else if (event.key === '+' || event.key === '=') camera.zoom(1.4);
    else if (event.key === '-') camera.zoom(1 / 1.4);
    else if (event.key === 'Home' || event.key === '0') camera.fit();
    else if (event.key.toLowerCase() === 'f') follow(true);
    else return;
    event.preventDefault(); commit();
  });
  return { update, reset() { pointers.clear(); } };
}
