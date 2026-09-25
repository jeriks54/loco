import { createLevelState } from '../game/state.js';
import { createScene } from '../render/scene.js';
import { chapter1 } from '../levels/chapter1.js';

const REVEAL_DELAY_MS = 520;

const PREVIEW_LEVEL = chapter1.find((level) => level.id === 'ch1-02');

/**
 * Render the small, one-shot Workshop glimpse used on the title screen.
 *
 * The preview owns its level state and scene. It never shares the state used
 * by the playable game, so the title animation cannot affect progress or an
 * editor run.
 *
 * @param {{canvas?: HTMLCanvasElement|null, commandEl?: HTMLElement|null, root?: HTMLElement|null}} options
 * @returns {{show: () => void, hide: () => void}}
 */
export function createTitlePreview({ canvas, commandEl, root } = {}) {
  const start = { x: 1, y: 1, dir: 'E' };
  const settled = { x: 2, y: 1, dir: 'E' };
  let canRender = false;
  try {
    canRender = Boolean(canvas && typeof canvas.getContext === 'function' && canvas.getContext('2d'));
  } catch {
    canRender = false;
  }

  let scene = null;
  let timer = null;
  let shown = false;
  let hasSettled = false;
  let visibilityListening = false;

  if (canRender && PREVIEW_LEVEL) {
    try {
      scene = createScene({ canvas });
    } catch {
      // The copy in the title markup remains the accessible fallback when a
      // canvas is unavailable or cannot be initialised in the host browser.
      scene = null;
    }
  }

  function reducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  }

  function pageIsHidden() {
    return Boolean(document.hidden || document.visibilityState === 'hidden' || root?.hidden);
  }

  function setCommandActive(active) {
    commandEl?.classList.toggle('is-active', active);
  }

  function freshState(position) {
    const state = createLevelState(PREVIEW_LEVEL);
    state.robot = { ...position };
    return state;
  }

  function clearRevealTimer() {
    if (timer === null) return;
    window.clearTimeout(timer);
    timer = null;
  }

  function settle() {
    clearRevealTimer();
    hasSettled = true;
    setCommandActive(true);
    if (scene) scene.render(freshState(settled));
  }

  function onVisibilityChange() {
    if (shown && pageIsHidden()) settle();
  }

  function listenForVisibility() {
    if (visibilityListening || !document.addEventListener) return;
    document.addEventListener('visibilitychange', onVisibilityChange);
    visibilityListening = true;
  }

  function stopListeningForVisibility() {
    if (!visibilityListening || !document.removeEventListener) return;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    visibilityListening = false;
  }

  function show() {
    if (shown) return;
    shown = true;
    listenForVisibility();

    if (!scene || hasSettled || reducedMotion() || pageIsHidden()) {
      settle();
      return;
    }

    setCommandActive(false);
    scene.render(freshState(start));
    timer = window.setTimeout(() => {
      timer = null;
      if (!shown || pageIsHidden()) {
        settle();
        return;
      }
      setCommandActive(true);
      scene.handleEvent('moved', { from: { ...start }, to: { ...settled } });
      hasSettled = true;
    }, REVEAL_DELAY_MS);
  }

  function hide() {
    if (!shown && !timer) return;
    shown = false;
    clearRevealTimer();
    stopListeningForVisibility();
    if (scene) scene.render(freshState(settled));
    hasSettled = true;
    setCommandActive(true);
  }

  return { show, hide };
}
