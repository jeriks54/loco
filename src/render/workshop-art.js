/* Approved Workshop artwork from docs/reference/graphics-2026/v2.
 * This module is deliberately state-free so the board and equipment portrait
 * can use the same robot geometry. Coordinates are local to the robot centre;
 * the robot faces +x before `angle` is applied.
 */

export const WORKSHOP = Object.freeze({
  stage: '#ad8b60',
  frame: '#503c2d',
  frameRim: '#d9bc87',
  frameInner: '#3b2f24',
  floor: '#efdfb8',
  grid: '#dac79e',
  wall: '#6e5038',
  wallLight: '#916e4e',
  wallEdge: '#b38e60',
  wallShade: '#503c2b',
  ink: '#5b604e',
  sensor: '#26896a',
  targetFill: '#26896a16',
  robot: '#c88e42',
  robotLit: '#ebc980',
  roof: '#efdeb4',
  roofEdge: '#9b712f',
  track: '#343c35',
  tread: '#6c7464',
  bumper: '#435648',
  hole: '#111a16',
  holeRim: '#6e7965',
  goal: '#277459',
  goalFill: '#ccdcc1',
  steel: '#748d75',
  bodyInk: '#765120',
  shadow: '#08181025',
  sensorGlow: '#c5f5dc',
});

function rounded(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/**
 * Draw the approved overhead Workshop robot.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{cx:number,cy:number,size:number,angle?:number,equipped?:boolean,alpha?:number,scale?:number}} options
 */
export function drawWorkshopRobot(ctx, {
  cx,
  cy,
  size,
  angle = 0,
  equipped = false,
  alpha = 1,
  scale = 1,
}) {
  const t = Math.max(0, Number(size) || 0);
  if (!t) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  ctx.scale(scale, scale);

  // Soft silhouette grounding from the prototype; it remains a flat shape.
  rounded(ctx, -t * .345, -t * .34, t * .82, t * .85, t * .1, WORKSHOP.shadow);

  for (const sy of [-.38, .25]) {
    rounded(ctx, -t * .35, t * sy, t * .67, t * .14, t * .035, WORKSHOP.track);
    if (t >= 22) {
      ctx.strokeStyle = WORKSHOP.tread;
      ctx.lineWidth = Math.max(.6, t * .015);
      for (let i = 0; i < 6; i += 1) {
        const x = t * (-.30 + i * .106);
        ctx.beginPath();
        ctx.moveTo(x, t * (sy + .026));
        ctx.lineTo(x, t * (sy + .114));
        ctx.stroke();
      }
    }
  }

  rounded(ctx, -t * .32, -t * .27, t * .67, t * .54, t * .095, WORKSHOP.robot);
  ctx.lineWidth = Math.max(.6, t * .018);
  rounded(ctx, -t * .31, -t * .265, t * .64, t * .51, t * .08, null, WORKSHOP.robotLit);
  rounded(ctx, -t * .245, -t * .205, t * .46, t * .41, t * .055, WORKSHOP.roof, WORKSHOP.roofEdge);
  rounded(ctx, t * .265, -t * .19, t * .13, t * .38, t * .05, WORKSHOP.bumper);

  // Forward arrow on the roof remains visible without equipment.
  ctx.fillStyle = WORKSHOP.bodyInk;
  ctx.beginPath();
  ctx.moveTo(t * .005, -t * .075);
  ctx.lineTo(t * .07, -t * .075);
  ctx.lineTo(t * .07, -t * .13);
  ctx.lineTo(t * .195, 0);
  ctx.lineTo(t * .07, t * .13);
  ctx.lineTo(t * .07, t * .075);
  ctx.lineTo(t * .005, t * .075);
  ctx.closePath();
  ctx.fill();

  if (t >= 22) {
    ctx.strokeStyle = WORKSHOP.roofEdge;
    ctx.lineWidth = Math.max(.75, t * .018);
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(t * (-.17 + i * .045), -t * .10);
      ctx.lineTo(t * (-.17 + i * .045), t * .10);
      ctx.stroke();
    }
  }

  if (equipped) {
    rounded(ctx, t * .32, -t * .13, t * .15, t * .26, t * .035, WORKSHOP.sensor);
    if (t >= 20) {
      for (const sy of [-.06, .06]) {
        ctx.beginPath();
        ctx.arc(t * .397, t * sy, t * .035, 0, Math.PI * 2);
        ctx.fillStyle = WORKSHOP.sensorGlow;
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#b7f1cd';
      ctx.fillRect(t * .39, -t * .035, Math.max(1, t * .035), Math.max(1, t * .07));
    }
  }

  ctx.restore();
}

