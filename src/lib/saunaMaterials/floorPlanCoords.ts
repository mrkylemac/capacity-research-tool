import type { Room } from '@/types/saunaMaterials';

export interface RoomRectMm {
  x: number;
  y: number;
  width: number;
  depth: number;
}

export interface RoomPointMm {
  x: number;
  y: number;
}

/**
 * Convert a screen-space delta (CSS pixels) into a room-space delta (mm) using
 * the SVG's current transform matrix.
 */
export function screenDeltaToRoomMm(
  svg: SVGSVGElement,
  dxPx: number,
  dyPx: number
): { dx: number; dy: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { dx: 0, dy: 0 };
  // The CTM maps SVG user units -> screen pixels. To go the other way we
  // invert it; the a/d entries on the inverse give us mm-per-pixel (assuming
  // the SVG userspace is mm via viewBox).
  const inv = ctm.inverse();
  return { dx: dxPx * inv.a, dy: dyPx * inv.d };
}

/**
 * Convert a screen point (clientX/clientY) into room-space mm using the SVG
 * transform. Returns null if the SVG has no CTM (not laid out yet).
 */
export function screenPointToRoomMm(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): RoomPointMm | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

export function snapToGrid(value: number, stepMm: number): number {
  if (stepMm <= 0) return value;
  return Math.round(value / stepMm) * stepMm;
}

/**
 * Snap a coordinate to wall 0 or to `wallSize` when within `thresholdMm`.
 */
export function snapToWall(value: number, wallSize: number, thresholdMm: number): number {
  if (Math.abs(value) <= thresholdMm) return 0;
  if (Math.abs(value - wallSize) <= thresholdMm) return wallSize;
  return value;
}

/**
 * Clamp a rectangle so it stays fully inside the room bounds.
 */
export function clampRectToRoom(
  rect: RoomRectMm,
  room: Pick<Room, 'length' | 'width'>
): RoomRectMm {
  const maxX = Math.max(0, room.length - rect.width);
  const maxY = Math.max(0, room.width - rect.depth);
  return {
    x: Math.min(Math.max(0, rect.x), maxX),
    y: Math.min(Math.max(0, rect.y), maxY),
    width: Math.min(rect.width, room.length),
    depth: Math.min(rect.depth, room.width),
  };
}

/** Combined snap: snap-to-grid first, then snap-to-walls (walls win on conflict). */
export function snapPosition(
  rect: RoomRectMm,
  room: Pick<Room, 'length' | 'width'>,
  gridMm: number,
  wallThresholdMm: number
): RoomRectMm {
  let x = snapToGrid(rect.x, gridMm);
  let y = snapToGrid(rect.y, gridMm);
  x = snapToWall(x, room.length - rect.width, wallThresholdMm);
  y = snapToWall(y, room.width - rect.depth, wallThresholdMm);
  return { x, y, width: rect.width, depth: rect.depth };
}

/**
 * Rotate (dx, dy) by `degrees` clockwise around the origin. Used when a user
 * drags a rotated item — the screen-space delta has to be projected back into
 * the item's local axes.
 */
export function rotateDelta(
  dx: number,
  dy: number,
  degrees: number
): { dx: number; dy: number } {
  if (degrees === 0) return { dx, dy };
  const r = (-degrees * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { dx: dx * cos - dy * sin, dy: dx * sin + dy * cos };
}
