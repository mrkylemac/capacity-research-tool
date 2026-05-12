import {
  clampRectToRoom,
  rotateDelta,
  snapPosition,
  snapToGrid,
  snapToWall,
} from '@/lib/saunaMaterials/floorPlanCoords';

const ROOM = { length: 5000, width: 3000 } as const;

describe('snapToGrid', () => {
  it('rounds to the nearest grid step', () => {
    expect(snapToGrid(123, 50)).toBe(100);
    expect(snapToGrid(126, 50)).toBe(150);
    expect(snapToGrid(125, 50)).toBe(150); // half rounds up
  });
  it('is a no-op when step <= 0', () => {
    expect(snapToGrid(123, 0)).toBe(123);
    expect(snapToGrid(123, -5)).toBe(123);
  });
});

describe('snapToWall', () => {
  it('snaps to 0 when within threshold', () => {
    expect(snapToWall(30, 5000, 50)).toBe(0);
    expect(snapToWall(-10, 5000, 50)).toBe(0);
  });
  it('snaps to the wall size when close', () => {
    expect(snapToWall(4970, 5000, 50)).toBe(5000);
  });
  it('leaves values in the middle alone', () => {
    expect(snapToWall(2500, 5000, 50)).toBe(2500);
  });
});

describe('clampRectToRoom', () => {
  it('clamps negative positions to zero', () => {
    const out = clampRectToRoom({ x: -100, y: -50, width: 600, depth: 400 }, ROOM);
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
  });
  it('clamps positions so the rect stays inside the room', () => {
    const out = clampRectToRoom({ x: 4800, y: 2800, width: 600, depth: 400 }, ROOM);
    expect(out.x).toBe(5000 - 600);
    expect(out.y).toBe(3000 - 400);
  });
  it('passes through valid rects', () => {
    const out = clampRectToRoom({ x: 1000, y: 1000, width: 600, depth: 400 }, ROOM);
    expect(out).toEqual({ x: 1000, y: 1000, width: 600, depth: 400 });
  });
});

describe('snapPosition', () => {
  it('snaps to the grid first then to walls', () => {
    const out = snapPosition({ x: 24, y: 2576, width: 600, depth: 400 }, ROOM, 50, 50);
    // Grid: x=0 (closest to 24→50, wall snap then forces 0 since 50<=threshold).
    // y: 2576 → 2600 grid → wall (3000-400)=2600 → 2600.
    expect(out.x).toBe(0);
    expect(out.y).toBe(2600);
  });
  it('leaves mid-room positions alone after grid snap', () => {
    const out = snapPosition({ x: 1234, y: 1234, width: 600, depth: 400 }, ROOM, 50, 50);
    expect(out.x).toBe(1250);
    expect(out.y).toBe(1250);
  });
});

describe('rotateDelta', () => {
  it('passes through with zero rotation', () => {
    expect(rotateDelta(10, 20, 0)).toEqual({ dx: 10, dy: 20 });
  });
  it('rotates by 90 degrees clockwise', () => {
    const out = rotateDelta(10, 0, 90);
    expect(out.dx).toBeCloseTo(0, 6);
    expect(out.dy).toBeCloseTo(-10, 6);
  });
  it('round-trips with a -degrees rotation', () => {
    const fwd = rotateDelta(7, -3, 37);
    const back = rotateDelta(fwd.dx, fwd.dy, -37);
    expect(back.dx).toBeCloseTo(7, 6);
    expect(back.dy).toBeCloseTo(-3, 6);
  });
});
