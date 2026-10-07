// A short, non-interactive orientation before the player builds a program.
// The spotlight is positioned in viewport space so it can pick out controls
// inside the mobile sheet without changing the board or editor layout.
const TUTORIAL_STEPS = [
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
    copy: 'Run starts the program at the entrance. The current line lights up while the robot moves. Reset stops it and returns it to the start, keeping your commands. The speed slider changes how quickly you watch.',
    mobileCopy: 'Run starts at the entrance. The current line lights up. Reset returns the robot to start without erasing commands. Open the panel to change speed.',
    target: '.panel-section.controls',
    mobileTarget: '#sheet-peek',
    mobileSheet: 'collapsed',
  },
];

const CHAPTER_STEPS = {
  ch2: [
    { title: 'See the repeated path', copy: 'This example is a straight, three-tile trip to EXIT. Three move commands would fill all three memory lines. A loop can repeat one move command three times.', target: '#board', mobileSheet: 'collapsed' },
    { title: 'Choose a counted loop', copy: 'Add loop, move, then end. The commands between loop and end become the repeated body. Tap commands to add them, or drag them into the numbered lines.', mobileCopy: 'Tap loop, move, then end. The commands between loop and end repeat together.', target: '#palette', extraTop: 32, mobileSheet: 'expanded' },
    { title: 'Set the count', copy: 'A new loop starts at 2. Use the + button on its memory line to change it to 3. The same move line will run three times while using only three memory lines.', mobileCopy: 'A new loop starts at 2. Tap + on its line to set 3. One move line then runs three times.', target: '#program', extraTop: 32, mobileSheet: 'expanded' },
    { title: 'Watch the repeat', copy: 'Run the program and watch the move line light up on each visit. Reset returns the robot to S and keeps the three lines so you can adjust the count.', mobileCopy: 'Run to watch the move line repeat. Reset returns the robot to S and keeps your program.', target: '.panel-section.controls', mobileTarget: '#sheet-peek', mobileSheet: 'collapsed' },
  ],
  ch3: [
    { title: 'Find the wall', copy: 'The robot travels east until a wall blocks the corridor. EXIT is one tile south of that stopping point. The map shows the path, but the program must decide when to stop moving east.', target: '#board', mobileSheet: 'collapsed' },
    { title: 'Read the front sensor', copy: 'The fitted sensor checks only the next tile ahead. It says blocked for a wall or boundary, and clear for open floor. Holes are not walls, and the sensor does not stop the robot by itself.', mobileCopy: 'The front sensor checks the next tile. Walls read blocked; open floor reads clear. Holes are not walls, and sensing does not brake.', target: '#equipment-card', mobileTarget: '#sensor-note', mobileSheet: 'collapsed' },
    { title: 'Build a sensed loop', copy: 'Add loop until, move, and end. Fill the loop’s two empty condition slots with wall sensor and blocked from the palette. Then add turn right and move after end.', mobileCopy: 'Add loop until, move, end, turn right, move. Tap wall sensor and blocked to fill the loop’s two empty slots.', target: '#palette', extraTop: 32, mobileSheet: 'expanded' },
    { title: 'Check before each move', copy: 'Loop until checks the condition before every trip through its body. It repeats move while the front is clear, then leaves the loop when a wall is ahead. The final turn and move reach EXIT.', mobileCopy: 'Loop until checks before each move. It repeats while clear, then leaves the loop at a wall. The final turn and move reach EXIT.', target: '#program', extraTop: 32, mobileSheet: 'expanded' },
    { title: 'Run the sensor example', copy: 'Run to watch the loop recheck the tile ahead. Reset keeps your program if you need to change a condition slot or a line.', mobileCopy: 'Run to watch the sensor recheck ahead. Reset keeps your program for another try.', target: '.panel-section.controls', mobileTarget: '#sheet-peek', mobileSheet: 'collapsed' },
  ],
  ch4: [
    { title: 'See two situations', copy: 'At S, the tile ahead is open. After one move, a wall is directly ahead. The same decision must choose move when clear and turn right when blocked, before the final move to EXIT.', mobileCopy: 'At S, ahead is clear. After one move, ahead is a wall. The decision must move when clear and turn right when blocked.', target: '#board', mobileSheet: 'collapsed' },
    { title: 'Test the condition', copy: 'The front wall sensor reports whether the next tile is blocked. If wall sensor = blocked is true at the wall and false on open floor. Holes are not walls.', mobileCopy: 'The front sensor checks the next tile. If wall sensor = blocked is true at a wall and false on open floor. Holes are not walls.', target: '#equipment-card', mobileTarget: '#sensor-note', mobileSheet: 'collapsed' },
    { title: 'Choose both branches', copy: 'Add if, else, and end to make a choice. Fill the if line’s two condition slots with wall sensor and blocked. Commands after if run when blocked; commands after else run when clear.', mobileCopy: 'Add if, else, end. Fill the if slots with wall sensor and blocked. If runs at a wall; else runs when clear.', target: '#palette', extraTop: 32, mobileSheet: 'expanded' },
    { title: 'Repeat the decision', copy: 'Use loop 2 around the choice: if blocked, turn right; else, move. The first pass moves, the second pass turns. End closes if, another end closes loop, then a final move reaches EXIT. This example uses eight lines.', mobileCopy: 'Loop 2 repeats the choice. First pass: else moves. Second pass: if turns right. Close if and loop with separate ends, then move to EXIT. Eight lines fit.', target: '#program', extraTop: 32, mobileSheet: 'expanded' },
    { title: 'Watch each branch', copy: 'Run to see the highlighted line take a different branch on each pass. Reset keeps the program so you can edit and retry.', mobileCopy: 'Run to see a different branch on each pass. Reset keeps your program for another try.', target: '.panel-section.controls', mobileTarget: '#sheet-peek', mobileSheet: 'collapsed' },
  ],
};

export function createTutorialTour({ root, game, sheet, onFinish, onSkip = onFinish }) {
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
  let steps = TUTORIAL_STEPS;

  const mobile = () => window.matchMedia('(max-width: 900px)').matches;

  function updateSpotlight() {
    if (index < 0) return;
    const step = steps[index];
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
    const step = steps[index];
    if (mobile()) {
      if (step.mobileSheet === 'expanded') sheet.expand();
      else sheet.collapse();
      if (step.mobileSheet === 'expanded') {
        const body = game.querySelector('#sheet-body');
        const section = game.querySelector(step.target)?.closest('.panel-section');
        if (section) body.scrollTop += section.getBoundingClientRect().top - body.getBoundingClientRect().top;
      }
    }
    progress.textContent = `STEP ${index + 1} OF ${steps.length}`;
    title.textContent = step.title;
    copy.textContent = mobile() && step.mobileCopy || step.copy;
    back.disabled = index === 0;
    next.textContent = index === steps.length - 1 ? 'Start practice' : 'Next';
    title.focus();
    requestAnimationFrame(updateSpotlight);
  }

  function stop(outcome = null) {
    if (index < 0) return;
    index = -1;
    root.classList.add('hidden');
    game.classList.remove('tour-active');
    for (const [child, wasInert] of priorInert) child.inert = wasInert;
    priorInert = null;
    if (outcome === 'finish') onFinish();
    else if (outcome === 'skip') onSkip();
  }

  function start(kind = 'tutorial') {
    stop();
    steps = CHAPTER_STEPS[kind] || TUTORIAL_STEPS;
    skip.textContent = kind === 'tutorial' ? 'Skip guide' : 'Skip example';
    priorInert = new Map([...game.children].filter(child => child !== root).map(child => [child, child.inert]));
    for (const child of priorInert.keys()) child.inert = true;
    game.classList.add('tour-active');
    root.classList.remove('hidden');
    showStep(0);
  }

  next.addEventListener('click', () => index === steps.length - 1 ? stop('finish') : showStep(index + 1));
  back.addEventListener('click', () => { if (index > 0) showStep(index - 1); });
  skip.addEventListener('click', () => stop('skip'));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      stop('skip');
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
