// A short, non-interactive orientation before the player builds a program.
// The spotlight is positioned in viewport space so it can pick out controls
// inside the mobile sheet without changing the board or editor layout.
const STEPS = [
  {
    title: 'Read the map',
    copy: 'The brass robot starts at S and follows the direction of its arrow. Guide it to the green EXIT. Walls block its path; each move command advances one tile.',
    mobileCopy: 'The robot starts at S, facing its arrow. Reach the green EXIT. Walls block the path; move goes one tile forward.',
    target: '#board',
    mobileSheet: 'collapsed',
  },
  {
    title: 'Choose commands',
    copy: 'Move sends the robot one tile forward. Turn left and turn right change which way it faces without moving it. Drag a command into memory, or tap it to add it.',
    mobileCopy: 'Move goes one tile forward. Turn left and turn right change the robot’s facing without moving it. Tap a command to add it.',
    target: '#palette',
    extraTop: 32,
    mobileSheet: 'expanded',
  },
  {
    title: 'Fill the memory',
    copy: 'The robot follows numbered memory lines from top to bottom. This maze gives you six lines; the counter shows how many you have used. Select a filled line to remove it and try another command.',
    mobileCopy: 'The robot follows numbered lines from top to bottom. The counter shows your six-line limit. Scroll for lower lines; tap a filled line to remove it.',
    target: '#program',
    extraTop: 32,
    mobileSheet: 'expanded',
  },
  {
    title: 'Run and try again',
    copy: 'Run starts the program at the entrance. The current line lights up while the robot moves. Reset stops it and returns it to the start, keeping your commands. The speed buttons only change how quickly you watch.',
    mobileCopy: 'Run starts at the entrance. The current line lights up. Reset returns the robot to start without erasing commands. Open the panel to change speed.',
    target: '.panel-section.controls',
    mobileTarget: '#sheet-peek',
    mobileSheet: 'collapsed',
  },
];

export function createTutorialTour({ root, game, sheet, onFinish }) {
  const card = root.querySelector('#tutorial-tour-card');
  const spotlight = root.querySelector('#tutorial-spotlight');
  const progress = root.querySelector('#tutorial-tour-progress');
  const title = root.querySelector('#tutorial-tour-title');
  const copy = root.querySelector('#tutorial-tour-copy');
  const back = root.querySelector('#btn-tour-back');
  const next = root.querySelector('#btn-tour-next');
  const skip = root.querySelector('#btn-tour-skip');
  let index = -1;
  let priorInert = null;

  const mobile = () => window.matchMedia('(max-width: 900px)').matches;

  function updateSpotlight() {
    if (index < 0) return;
    const step = STEPS[index];
    const target = game.querySelector(mobile() && step.mobileTarget || step.target);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const inset = 5;
    const extraTop = step.extraTop ?? 0;
    const left = Math.max(4, rect.left - inset);
    const top = Math.max(4, rect.top - inset - extraTop);
    const right = Math.min(window.innerWidth - 4, rect.right + inset);
    const bottom = Math.min(window.innerHeight - 4, rect.bottom + inset);
    spotlight.style.left = `${left}px`;
    spotlight.style.top = `${top}px`;
    spotlight.style.width = `${Math.max(1, right - left)}px`;
    spotlight.style.height = `${Math.max(1, bottom - top)}px`;

    // Keep the text off the highlighted control whenever the viewport allows it.
    card.style.left = '12px';
    card.style.top = '12px';
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const x2 = Math.max(12, window.innerWidth - width - 12);
    const y2 = Math.max(12, window.innerHeight - height - 12);
    const candidates = [
      { x: 12, y: Math.min(y2, 64) },
      { x: x2, y: Math.min(y2, 64) },
      { x: 12, y: y2 },
      { x: x2, y: y2 },
    ];
    const overlap = ({ x, y }) => Math.max(0, Math.min(x + width, right) - Math.max(x, left))
      * Math.max(0, Math.min(y + height, bottom) - Math.max(y, top));
    candidates.sort((a, b) => overlap(a) - overlap(b));
    card.style.left = `${candidates[0].x}px`;
    card.style.top = `${candidates[0].y}px`;
  }

  function showStep(nextIndex) {
    index = nextIndex;
    const step = STEPS[index];
    if (mobile()) {
      if (step.mobileSheet === 'expanded') sheet.expand();
      else sheet.collapse();
    }
    progress.textContent = `STEP ${index + 1} OF ${STEPS.length}`;
    title.textContent = step.title;
    copy.textContent = mobile() && step.mobileCopy || step.copy;
    back.disabled = index === 0;
    next.textContent = index === STEPS.length - 1 ? 'Start practice' : 'Next';
    title.focus();
    requestAnimationFrame(updateSpotlight);
  }

  function stop(finished = false) {
    if (index < 0) return;
    index = -1;
    root.classList.add('hidden');
    game.classList.remove('tour-active');
    for (const [child, wasInert] of priorInert) child.inert = wasInert;
    priorInert = null;
    if (finished) onFinish();
  }

  function start() {
    stop();
    priorInert = new Map([...game.children].filter(child => child !== root).map(child => [child, child.inert]));
    for (const child of priorInert.keys()) child.inert = true;
    game.classList.add('tour-active');
    root.classList.remove('hidden');
    showStep(0);
  }

  next.addEventListener('click', () => index === STEPS.length - 1 ? stop(true) : showStep(index + 1));
  back.addEventListener('click', () => { if (index > 0) showStep(index - 1); });
  skip.addEventListener('click', () => stop(true));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      stop(true);
    } else if (event.key === 'Tab') {
      const buttons = [skip, back, next].filter(button => !button.disabled);
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === title)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  window.addEventListener('resize', updateSpotlight);
  window.addEventListener('scroll', updateSpotlight, true);

  return { start, stop, isActive: () => index >= 0 };
}
