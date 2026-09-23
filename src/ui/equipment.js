/*
 * Workshop equipment card and live front-wall sensor feedback.
 * The scene owns sensor timing and settled-pose semantics; this module only
 * presents the snapshots it receives and draws the shared robot portrait.
 */

import { drawWorkshopRobot } from '../render/workshop-art.js';

const PORTRAIT_SIZE = 78;
const PORTRAIT_ROBOT_SIZE = 56;
const VALID_PHASES = new Set(['ready', 'moving', 'turning', 'unavailable']);

const READING_COPY = {
  ready: (blocked) => blocked ? 'Wall detected' : 'No wall detected',
  moving: () => 'Moving…',
  turning: () => 'Turning…',
  unavailable: () => 'Reading unavailable',
};

function phaseFor(snapshot) {
  return VALID_PHASES.has(snapshot?.phase) ? snapshot.phase : 'unavailable';
}

function blockedFor(snapshot, phase, equipped) {
  return equipped && phase === 'ready' && typeof snapshot?.blocked === 'boolean'
    ? snapshot.blocked
    : null;
}

function setReadingState(element, phase, blocked, copy) {
  element.textContent = copy;
  element.dataset.phase = phase;
  element.dataset.blocked = blocked === null ? 'unknown' : String(blocked);
}

/**
 * Bind the Workshop equipment card and return its snapshot update callback.
 * @returns {{update(snapshot:{equipped:boolean, blocked:boolean|null, phase:string}):void}}
 */
export function createEquipment() {
  const portrait = document.getElementById('equipment-portrait');
  const card = document.getElementById('equipment-card');
  const label = document.getElementById('equipment-label');
  const name = document.getElementById('equipment-name');
  const description = document.getElementById('equipment-description');
  const topReading = document.getElementById('sensor-reading');
  const equipmentReading = document.getElementById('equipment-reading');

  const portraitContext = portrait.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  portrait.width = Math.round(PORTRAIT_SIZE * dpr);
  portrait.height = Math.round(PORTRAIT_SIZE * dpr);
  portrait.style.width = `${PORTRAIT_SIZE}px`;
  portrait.style.height = `${PORTRAIT_SIZE}px`;
  portraitContext.setTransform(dpr, 0, 0, dpr, 0, 0);

  let portraitEquipped = null;
  let lastSnapshotKey = null;

  function drawPortrait(equipped) {
    if (portraitEquipped === equipped) return;
    portraitEquipped = equipped;
    portraitContext.clearRect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);
    drawWorkshopRobot(portraitContext, {
      cx: PORTRAIT_SIZE / 2,
      cy: PORTRAIT_SIZE / 2,
      size: PORTRAIT_ROBOT_SIZE,
      angle: 0,
      equipped,
      alpha: 1,
      scale: 1,
    });
  }

  function update(snapshot = {}) {
    const equipped = Boolean(snapshot.equipped);
    const phase = phaseFor(snapshot);
    const blocked = blockedFor(snapshot, phase, equipped);
    const key = `${equipped}|${phase}|${blocked === null ? 'unknown' : blocked}`;
    if (key === lastSnapshotKey) return;
    lastSnapshotKey = key;

    drawPortrait(equipped);
    card.dataset.equipped = String(equipped);

    if (equipped) {
      label.textContent = 'EQUIPMENT FITTED';
      name.textContent = 'Front wall sensor';
      description.textContent = 'Checks the next tile ahead. Misses holes. Does not brake automatically.';
    } else {
      label.textContent = 'NO EQUIPMENT';
      name.textContent = 'No sensor fitted';
      description.textContent = 'This level has no front wall sensor.';
    }

    const copy = equipped
      ? READING_COPY[phase](blocked)
      : 'No sensor fitted';
    setReadingState(topReading, phase, blocked, copy);
    setReadingState(equipmentReading, phase, blocked, copy);
    topReading.hidden = !equipped;
  }

  drawPortrait(false);
  update({ equipped: false, blocked: null, phase: 'unavailable' });

  return { update };
}

