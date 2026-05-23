export const RELAY_SIZE = 128;

const C_WHITE    = '#F8F9FA';
const C_ARMOR    = '#E2E8F0';
const C_HULL     = '#CBD5E1';
const C_CARBON   = '#212529';
const C_METAL    = '#64748B';
const C_METAL_L  = '#94A3B8';
const C_GOLD     = '#F59E0B';
const C_PANEL_BASE = '#1E3A8A';
const C_PANEL_GRID = '#60A5FA';
const C_CYAN     = '#06B6D4';
const C_RED      = '#EF4444';

/** 0=None  1=Low  2=Medium  3=High  4=Extreme */
export type TidalLevel = 0 | 1 | 2 | 3 | 4;

type Ctx = CanvasRenderingContext2D;

function poly(ctx: Ctx, pts: [number, number][], fill: string | null, stroke: string | null = null, lw = 1): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function rectC(ctx: Ctx, cx: number, cy: number, w: number, h: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
}

function drawSolarWing(ctx: Ctx, cx: number, cy: number, w: number, h: number): void {
  rectC(ctx, cx, cy, w, h, C_PANEL_BASE);
  ctx.strokeStyle = C_PANEL_GRID;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy); ctx.lineTo(cx + w / 2, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx, cy + h / 2);
  ctx.stroke();
}

function drawDish(ctx: Ctx, cx: number, cy: number, r: number, facing: 'left' | 'right' = 'right'): void {
  ctx.save();
  ctx.translate(cx, cy);
  if (facing === 'left') ctx.scale(-1, 1);
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.fillStyle = C_WHITE;
  ctx.fill();
  rectC(ctx, -r * 0.3, 0, r * 0.4, 4, C_METAL);
  rectC(ctx, r * 0.2, 0, 4, 4, C_CYAN);
  ctx.restore();
}

function drawDockingCollar(ctx: Ctx, cx: number, cy: number, w: number, s: number): void {
  rectC(ctx, cx, cy, w, 10 * s, C_GOLD);
  rectC(ctx, cx, cy, w * 0.5, 6 * s, C_METAL);
  ctx.fillStyle = C_CYAN;
  ctx.fillRect(cx - 4 * s, cy - 2 * s, 8 * s, 4 * s);
}

function drawOctoHub(ctx: Ctx, cx: number, cy: number, r: number, fill: string): void {
  const a = r * 0.414;
  poly(ctx, [
    [cx - a, cy - r], [cx + a, cy - r],
    [cx + r, cy - a], [cx + r, cy + a],
    [cx + a, cy + r], [cx - a, cy + r],
    [cx - r, cy + a], [cx - r, cy - a],
  ], fill);
}

export function drawRelayStation(ctx: Ctx, size: number, tidal: TidalLevel): void {
  const s = size / 128;
  const cx = size * 0.5;
  const cy = size * 0.5 - 4 * s;
  ctx.clearRect(0, 0, size, size);

  const hubR = (14 + tidal * 2) * s;

  const armLen = ([8, 10, 10, 8, 6] as const)[tidal] * s;
  const wingW  = ([22, 24, 26, 28, 28] as const)[tidal] * s;
  const wingH  = ([10, 11, 12, 12, 12] as const)[tidal] * s;

  if (tidal <= 2) {
    rectC(ctx, cx - hubR - armLen / 2, cy, armLen, 4 * s, C_METAL);
    rectC(ctx, cx + hubR + armLen / 2, cy, armLen, 4 * s, C_METAL);
    drawSolarWing(ctx, cx - hubR - armLen - wingW / 2, cy, wingW, wingH);
    drawSolarWing(ctx, cx + hubR + armLen + wingW / 2, cy, wingW, wingH);
  } else {
    for (const dy of [-8 * s, 8 * s]) {
      rectC(ctx, cx - hubR - armLen / 2, cy + dy, armLen, 4 * s, C_METAL);
      rectC(ctx, cx + hubR + armLen / 2, cy + dy, armLen, 4 * s, C_METAL);
      drawSolarWing(ctx, cx - hubR - armLen - wingW / 2, cy + dy, wingW, wingH);
      drawSolarWing(ctx, cx + hubR + armLen + wingW / 2, cy + dy, wingW, wingH);
    }
  }

  // Antenna
  if (tidal === 0) {
    const mast = 10 * s;
    rectC(ctx, cx, cy - hubR - mast / 2, 3 * s, mast, C_METAL);
    drawDish(ctx, cx, cy - hubR - mast - 8 * s, 8 * s);
  } else if (tidal === 1) {
    const mast = 14 * s;
    rectC(ctx, cx, cy - hubR - mast / 2, 4 * s, mast, C_METAL);
    drawDish(ctx, cx, cy - hubR - mast - 10 * s, 11 * s);
  } else if (tidal === 2) {
    const mast = 16 * s;
    rectC(ctx, cx, cy - hubR - mast / 2, 4 * s, mast, C_METAL);
    drawDish(ctx, cx - 6 * s, cy - hubR - mast - 11 * s, 12 * s, 'right');
    drawDish(ctx, cx + 6 * s, cy - hubR - mast - 11 * s, 12 * s, 'left');
  } else if (tidal === 3) {
    const mast = 16 * s;
    rectC(ctx, cx, cy - hubR - mast / 2, 5 * s, mast, C_METAL);
    rectC(ctx, cx - 10 * s, cy - hubR - mast * 0.5, 3 * s, mast * 0.7, C_METAL);
    rectC(ctx, cx + 10 * s, cy - hubR - mast * 0.5, 3 * s, mast * 0.7, C_METAL);
    drawDish(ctx, cx, cy - hubR - mast - 12 * s, 13 * s);
    drawDish(ctx, cx - 13 * s, cy - hubR - mast * 0.4 - 8 * s, 8 * s, 'right');
    drawDish(ctx, cx + 13 * s, cy - hubR - mast * 0.4 - 8 * s, 8 * s, 'left');
  } else {
    const mast = 17 * s;
    rectC(ctx, cx, cy - hubR - mast / 2, 6 * s, mast, C_CARBON);
    drawDish(ctx, cx, cy - hubR - mast - 14 * s, 16 * s);
    drawDish(ctx, cx - 16 * s, cy - hubR - mast * 0.3 - 8 * s, 9 * s, 'right');
    drawDish(ctx, cx + 16 * s, cy - hubR - mast * 0.3 - 8 * s, 9 * s, 'left');
    rectC(ctx, cx - 18 * s, cy - hubR, 3 * s, 10 * s, C_CYAN);
    rectC(ctx, cx + 18 * s, cy - hubR, 3 * s, 10 * s, C_CYAN);
  }

  // Hub body
  if (tidal === 0) {
    drawOctoHub(ctx, cx, cy, hubR, C_METAL_L);
  } else if (tidal === 1) {
    drawOctoHub(ctx, cx, cy, hubR, C_METAL_L);
    rectC(ctx, cx, cy - hubR * 0.7, hubR * 1.4, 6 * s, C_ARMOR);
    rectC(ctx, cx, cy + hubR * 0.7, hubR * 1.4, 6 * s, C_ARMOR);
  } else if (tidal === 2) {
    drawOctoHub(ctx, cx, cy, hubR, C_HULL);
    poly(ctx, [
      [cx - 8 * s, cy - hubR - 4 * s], [cx + 8 * s, cy - hubR - 4 * s],
      [cx + hubR + 4 * s, cy - 8 * s], [cx + hubR + 4 * s, cy + 8 * s],
      [cx + 8 * s, cy + hubR + 4 * s], [cx - 8 * s, cy + hubR + 4 * s],
      [cx - hubR - 4 * s, cy + 8 * s], [cx - hubR - 4 * s, cy - 8 * s],
    ], null, C_ARMOR, 2 * s);
  } else if (tidal === 3) {
    poly(ctx, [
      [cx - 8 * s, cy - hubR - 6 * s], [cx + 8 * s, cy - hubR - 6 * s],
      [cx + hubR + 6 * s, cy - 8 * s], [cx + hubR + 6 * s, cy + 8 * s],
      [cx + 8 * s, cy + hubR + 6 * s], [cx - 8 * s, cy + hubR + 6 * s],
      [cx - hubR - 6 * s, cy + 8 * s], [cx - hubR - 6 * s, cy - 8 * s],
    ], C_ARMOR);
    drawOctoHub(ctx, cx, cy, hubR, C_HULL);
    ctx.fillStyle = C_RED;
    ctx.fillRect(cx - hubR, cy - 3 * s, 5 * s, 6 * s);
    ctx.fillRect(cx + hubR - 5 * s, cy - 3 * s, 5 * s, 6 * s);
  } else {
    poly(ctx, [
      [cx - 10 * s, cy - hubR - 8 * s], [cx + 10 * s, cy - hubR - 8 * s],
      [cx + hubR + 8 * s, cy - 10 * s], [cx + hubR + 8 * s, cy + 10 * s],
      [cx + 10 * s, cy + hubR + 8 * s], [cx - 10 * s, cy + hubR + 8 * s],
      [cx - hubR - 8 * s, cy + 10 * s], [cx - hubR - 8 * s, cy - 10 * s],
    ], C_WHITE);
    drawOctoHub(ctx, cx, cy, hubR, C_METAL_L);
    rectC(ctx, cx, cy - hubR * 0.6, hubR * 1.8, 4 * s, C_CYAN);
    rectC(ctx, cx, cy + hubR * 0.6, hubR * 1.8, 4 * s, C_CYAN);
  }

  drawOctoHub(ctx, cx, cy, hubR * 0.55, C_CARBON);
  rectC(ctx, cx, cy, 6 * s, 6 * s, C_CYAN);
  drawDockingCollar(ctx, cx, cy + hubR + 6 * s, 16 * s, s);
}
