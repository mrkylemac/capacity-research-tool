import type {
  Bench,
  Column,
  HeaterZone,
  Opening,
  Room,
  WallId,
} from '@/types/saunaMaterials';

/**
 * Unified rectangle in room coords (mm) — top-left x/y, full width/depth, rotation degrees.
 * Used by the diagram so every item (bench, opening, heater, column) renders the same way.
 */
export interface ItemTransform {
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation: number;
}

const HEATER_DEFAULT_DEPTH = 200;
const OPENING_DEFAULT_DEPTH = 60;

function centredOffset(elementSize: number, wallSize: number) {
  return Math.max(0, Math.round((wallSize - elementSize) / 2));
}

function wallAnchoredRect(
  wall: WallId,
  startOffset: number,
  along: number,
  perpendicular: number,
  room: Room
): ItemTransform {
  if (wall === 'north') {
    return { x: startOffset, y: 0, width: along, depth: perpendicular, rotation: 0 };
  }
  if (wall === 'south') {
    return {
      x: startOffset,
      y: room.width - perpendicular,
      width: along,
      depth: perpendicular,
      rotation: 0,
    };
  }
  if (wall === 'east') {
    return {
      x: room.length - perpendicular,
      y: startOffset,
      width: perpendicular,
      depth: along,
      rotation: 0,
    };
  }
  // west
  return { x: 0, y: startOffset, width: perpendicular, depth: along, rotation: 0 };
}

export function benchTransform(b: Bench, room: Room): ItemTransform {
  if (b.x !== undefined && b.y !== undefined) {
    return {
      x: b.x,
      y: b.y,
      width: b.length,
      depth: b.depth,
      rotation: b.rotation ?? 0,
    };
  }
  const wallSize = b.wall === 'north' || b.wall === 'south' ? room.length : room.width;
  const startOffset = b.startOffset ?? centredOffset(b.length, wallSize);
  return wallAnchoredRect(b.wall, startOffset, b.length, b.depth, room);
}

export function openingTransform(o: Opening, room: Room): ItemTransform {
  if (o.x !== undefined && o.y !== undefined) {
    return {
      x: o.x,
      y: o.y,
      width: o.width,
      depth: OPENING_DEFAULT_DEPTH,
      rotation: o.rotation ?? 0,
    };
  }
  const wallSize = o.wall === 'north' || o.wall === 'south' ? room.length : room.width;
  const startOffset = o.startOffset ?? centredOffset(o.width, wallSize);
  // Openings render thinner — use a fixed perpendicular depth.
  const t = wallAnchoredRect(o.wall, startOffset, o.width, OPENING_DEFAULT_DEPTH, room);
  // Pull the opening rectangle so it straddles the wall line.
  if (o.wall === 'north') t.y -= OPENING_DEFAULT_DEPTH / 2;
  else if (o.wall === 'south') t.y += OPENING_DEFAULT_DEPTH / 2;
  else if (o.wall === 'east') t.x += OPENING_DEFAULT_DEPTH / 2;
  else t.x -= OPENING_DEFAULT_DEPTH / 2;
  return t;
}

export function heaterTransform(heater: HeaterZone, room: Room): ItemTransform {
  if (heater.x !== undefined && heater.y !== undefined) {
    return {
      x: heater.x,
      y: heater.y,
      width: heater.width,
      depth: heater.depth ?? HEATER_DEFAULT_DEPTH,
      rotation: heater.rotation ?? 0,
    };
  }
  const wallSize = heater.wall === 'north' || heater.wall === 'south' ? room.length : room.width;
  const startOffset = heater.startOffset ?? centredOffset(heater.width, wallSize);
  return wallAnchoredRect(heater.wall, startOffset, heater.width, HEATER_DEFAULT_DEPTH, room);
}

export function columnTransform(c: Column, room: Room): ItemTransform | null {
  if (c.wall === 'freestanding' && c.x === undefined) return null;
  if (c.x !== undefined && c.y !== undefined) {
    return {
      x: c.x,
      y: c.y,
      width: c.width,
      depth: c.depth,
      rotation: c.rotation ?? 0,
    };
  }
  const wall = c.wall === 'freestanding' ? 'north' : c.wall;
  const wallSize = wall === 'north' || wall === 'south' ? room.length : room.width;
  const startOffset = c.startOffset ?? centredOffset(c.width, wallSize);
  return wallAnchoredRect(wall, startOffset, c.width, c.depth, room);
}

/** Apply an inverse rotation around the origin (used to map a screen-space delta into local axes). */
export function rotatePoint(dx: number, dy: number, degrees: number): { dx: number; dy: number } {
  const r = (-degrees * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { dx: dx * cos - dy * sin, dy: dx * sin + dy * cos };
}
