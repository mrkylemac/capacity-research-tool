import type { Construction, Room, WallId } from '@/types/saunaMaterials';
import { mm, wallLengthMm } from './conversions';
import { WALL_IDS } from './geometry';

/** Battens per wall (vertical, perpendicular to horizontal cladding). */
export function wallBattenLM(wall: WallId, room: Room, construction: Construction): number {
  const length = wallLengthMm(wall, room);
  const count = Math.ceil(length / construction.battenSpacing) + 1;
  return mm(count * room.ceilingHeight);
}

export function totalWallBattenLM(room: Room, construction: Construction): number {
  return WALL_IDS.reduce((sum, w) => sum + wallBattenLM(w, room, construction), 0);
}

/** Ceiling battens (default running across the room width). */
export function ceilingBattenLM(room: Room, construction: Construction): number {
  const count = Math.ceil(room.length / construction.battenSpacing) + 1;
  return mm(count * room.width);
}

/**
 * Total batten LM. When cross-battening is enabled the count is doubled to
 * approximate the counter-batten layer running perpendicular to the first.
 */
export function totalBattenLM(room: Room, construction: Construction): number {
  const base = totalWallBattenLM(room, construction) + ceilingBattenLM(room, construction);
  return construction.crossBattening ? base * 2 : base;
}
