export const PROBE_SIZE = 128;

const C_ARMOR    = '#E2E8F0';
const C_CARBON   = '#212529';
const C_METAL    = '#64748B';
const C_GOLD     = '#F59E0B';
const C_GOLD_DARK = '#B45309';
const C_PANEL_BASE = '#1E3A8A';
const C_PANEL_GRID = '#60A5FA';
const C_TOOL_TIP = '#F97316';
const C_CYAN     = '#06B6D4';

export interface ProbeUpgrades {
  hull:     number;
  thrust:   number;
  ergol:    number;
  rcs:      number;
  avionics: number;
}

export const UPGRADE_MAX: Record<keyof ProbeUpgrades, number> = {
  hull: 3, thrust: 3, ergol: 2, rcs: 2, avionics: 2,
};

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

function drawHalfCircle(ctx: Ctx, cx: number, cy: number, r: number, fill: string, up = true): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, up ? 0 : Math.PI, up ? Math.PI : 0);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawBell(ctx: Ctx, cx: number, y: number, topW: number, botW: number, h: number): void {
  poly(ctx, [
    [cx - topW / 2, y], [cx + topW / 2, y],
    [cx + botW / 2, y + h], [cx - botW / 2, y + h],
  ], C_CARBON);
}

function drawSolarPanel(ctx: Ctx, cx: number, cy: number, w: number, h: number): void {
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

function drawTool(ctx: Ctx, cx: number, cy: number, dir: number, scale = 1): void {
  const s = scale;
  rectC(ctx, cx, cy, 6 * s, 8 * s, C_METAL);
  rectC(ctx, cx + dir * 5 * s, cy, 6 * s, 4 * s, C_CARBON);
  rectC(ctx, cx + dir * 8 * s, cy, 2 * s, 2 * s, C_TOOL_TIP);
}

function drawCore(ctx: Ctx, cx: number, cy: number, w: number, h: number): void {
  rectC(ctx, cx, cy, w, h, C_GOLD);
  ctx.fillStyle = C_GOLD_DARK;
  ctx.fillRect(cx - w / 2, cy - h / 4, w, 2);
  ctx.fillRect(cx - w / 2, cy + h / 4, w, 2);
  rectC(ctx, cx, cy, w * 0.4, h * 0.2, C_METAL);
}

function drawAntenna(ctx: Ctx, cx: number, baseCy: number, w: number, h: number, dishR: number, s: number): void {
  rectC(ctx, cx, baseCy - h / 2, w, h, C_METAL);
  drawHalfCircle(ctx, cx, baseCy - h, dishR, '#F8F9FA', true);
  rectC(ctx, cx, baseCy - h - dishR * 0.4, 4 * s, 4 * s, C_CYAN);
}

export function drawProbeDynamic(ctx: Ctx, _t: number, size: number, upgrades: ProbeUpgrades): void {
  const s = size / 128;
  const cx = size * 0.5;
  const cy = size * 0.5 + 6 * s;
  ctx.clearRect(0, 0, size, size);

  const { hull = 0, thrust = 0, ergol = 0, rcs = 0, avionics = 0 } = upgrades;

  const coreTopY = hull === 3 ? cy - 28 * s : hull === 2 ? cy - 24 * s : hull === 1 ? cy - 23 * s : cy - 20 * s;
  const coreBotY = hull === 3 ? cy + 28 * s : hull === 2 ? cy + 24 * s : hull === 1 ? cy + 23 * s : cy + 20 * s;

  // 1. Solar panels
  if (ergol === 1) {
    rectC(ctx, cx - 18 * s, cy, 12 * s, 4 * s, C_METAL);
    rectC(ctx, cx + 18 * s, cy, 12 * s, 4 * s, C_METAL);
    drawSolarPanel(ctx, cx - 30 * s, cy, 14 * s, 28 * s);
    drawSolarPanel(ctx, cx + 30 * s, cy, 14 * s, 28 * s);
  } else if (ergol === 2) {
    rectC(ctx, cx - 18 * s, cy - 10 * s, 12 * s, 4 * s, C_METAL);
    rectC(ctx, cx + 18 * s, cy - 10 * s, 12 * s, 4 * s, C_METAL);
    rectC(ctx, cx - 18 * s, cy + 10 * s, 12 * s, 4 * s, C_METAL);
    rectC(ctx, cx + 18 * s, cy + 10 * s, 12 * s, 4 * s, C_METAL);
    drawSolarPanel(ctx, cx - 28 * s, cy - 14 * s, 14 * s, 28 * s);
    drawSolarPanel(ctx, cx + 28 * s, cy - 14 * s, 14 * s, 28 * s);
    drawSolarPanel(ctx, cx - 28 * s, cy + 14 * s, 14 * s, 28 * s);
    drawSolarPanel(ctx, cx + 28 * s, cy + 14 * s, 14 * s, 28 * s);
  }

  // 2. Antenna
  if (avionics === 0) drawAntenna(ctx, cx, coreTopY, 4 * s, 14 * s, 12 * s, s);
  if (avionics === 1) drawAntenna(ctx, cx, coreTopY, 6 * s, 18 * s, 16 * s, s);
  if (avionics === 2) drawAntenna(ctx, cx, coreTopY, 8 * s, 24 * s, 20 * s, s);

  // 3. Engines
  const engY = coreBotY - 2 * s;
  if (thrust === 0) {
    drawBell(ctx, cx, engY, 14 * s, 18 * s, 14 * s);
  } else if (thrust === 1) {
    drawBell(ctx, cx, engY, 16 * s, 22 * s, 18 * s);
  } else if (thrust === 2) {
    drawBell(ctx, cx - 10 * s, engY, 8 * s, 14 * s, 18 * s);
    drawBell(ctx, cx + 10 * s, engY, 8 * s, 14 * s, 18 * s);
  } else if (thrust === 3) {
    rectC(ctx, cx, engY + 6 * s, 36 * s, 12 * s, C_CARBON);
    poly(ctx, [
      [cx - 16 * s, engY + 12 * s], [cx + 16 * s, engY + 12 * s],
      [cx + 12 * s, engY + 22 * s], [cx - 12 * s, engY + 22 * s],
    ], C_METAL);
    rectC(ctx, cx, engY + 22 * s, 24 * s, 4 * s, C_CYAN);
  }

  // 4. Hull / armor
  const coreW = hull === 3 ? 32 * s : 26 * s;
  const coreH = hull === 3 ? 56 * s : hull >= 1 ? 46 * s : 40 * s;
  drawCore(ctx, cx, cy, coreW, coreH);

  if (ergol === 0) drawSolarPanel(ctx, cx, cy, 16 * s, 16 * s);

  if (hull === 1) {
    poly(ctx, [
      [cx - 16 * s, cy - 23 * s], [cx + 16 * s, cy - 23 * s],
      [cx + 12 * s, cy - 12 * s], [cx - 12 * s, cy - 12 * s],
    ], C_ARMOR);
    poly(ctx, [
      [cx - 16 * s, cy + 23 * s], [cx + 16 * s, cy + 23 * s],
      [cx + 12 * s, cy + 12 * s], [cx - 12 * s, cy + 12 * s],
    ], C_ARMOR);
  } else if (hull === 2) {
    poly(ctx, [
      [cx - 16 * s, cy - 24 * s], [cx + 16 * s, cy - 24 * s],
      [cx + 18 * s, cy - 4 * s],  [cx + 12 * s, cy - 4 * s],
      [cx - 12 * s, cy - 4 * s],  [cx - 18 * s, cy - 4 * s],
    ], '#F8F9FA');
    poly(ctx, [
      [cx - 16 * s, cy + 24 * s], [cx + 16 * s, cy + 24 * s],
      [cx + 18 * s, cy + 4 * s],  [cx + 12 * s, cy + 4 * s],
      [cx - 12 * s, cy + 4 * s],  [cx - 18 * s, cy + 4 * s],
    ], '#F8F9FA');
  } else if (hull === 3) {
    poly(ctx, [
      [cx - 12 * s, cy - 28 * s], [cx + 12 * s, cy - 28 * s],
      [cx + 20 * s, cy - 10 * s], [cx + 20 * s, cy + 10 * s],
      [cx + 12 * s, cy + 28 * s], [cx - 12 * s, cy + 28 * s],
      [cx - 20 * s, cy + 10 * s], [cx - 20 * s, cy - 10 * s],
    ], '#F8F9FA');
    poly(ctx, [
      [cx - 6 * s, cy - 28 * s], [cx + 6 * s, cy - 28 * s],
      [cx + 10 * s, cy - 12 * s], [cx - 10 * s, cy - 12 * s],
    ], C_ARMOR);
    poly(ctx, [
      [cx - 6 * s, cy + 28 * s], [cx + 6 * s, cy + 28 * s],
      [cx + 10 * s, cy + 12 * s], [cx - 10 * s, cy + 12 * s],
    ], C_ARMOR);
    rectC(ctx, cx, cy, 16 * s, 20 * s, C_CYAN);
    rectC(ctx, cx, cy, 8 * s, 12 * s, '#F8F9FA');
  }

  // 5. RCS tools
  const toolOffset = hull === 3 ? 18 * s : 13 * s;
  if (rcs === 1) {
    drawTool(ctx, cx - toolOffset, cy - 10 * s, -1, s);
    drawTool(ctx, cx + toolOffset, cy - 10 * s,  1, s);
  } else if (rcs === 2) {
    drawTool(ctx, cx - toolOffset, cy - 10 * s, -1, s);
    drawTool(ctx, cx + toolOffset, cy - 10 * s,  1, s);
    drawTool(ctx, cx - toolOffset, cy + 10 * s, -1, s);
    drawTool(ctx, cx + toolOffset, cy + 10 * s,  1, s);
  }
}
