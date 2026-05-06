import {
  ceilingBattenLM,
  totalBattenLM,
  totalWallBattenLM,
  wallBattenLM,
} from '@/lib/saunaMaterials/battens';
import type { Construction, Room } from '@/types/saunaMaterials';

const room: Room = { length: 5000, width: 3000, ceilingHeight: 2400 };
const construction: Construction = {
  behindBenchClad: true,
  crossBattening: false,
  battenSpacing: 600,
  insulationDepth: 90,
  vapourBarrierType: 'foilPaper',
  ceilingInsulationDepth: 140,
  fixingsDensityCladding: 20,
  fixingsDensityBench: 8,
};

describe('wallBattenLM', () => {
  it('counts ceil(length / spacing) + 1 verticals at full ceiling height', () => {
    // 5000 / 600 = 8.33 → ceil 9 → +1 = 10 verticals × 2.4 = 24 lm
    expect(wallBattenLM('north', room, construction)).toBeCloseTo(24, 3);
    // 3000 / 600 = 5 → +1 = 6 verticals × 2.4 = 14.4 lm
    expect(wallBattenLM('east', room, construction)).toBeCloseTo(14.4, 3);
  });
});

describe('ceilingBattenLM', () => {
  it('counts perpendicular runs across the room', () => {
    // ceil(5000/600) + 1 = 10 runs × 3.0 width = 30 lm
    expect(ceilingBattenLM(room, construction)).toBeCloseTo(30, 3);
  });
});

describe('totalBattenLM', () => {
  it('sums walls + ceiling without cross-battening', () => {
    const wall = totalWallBattenLM(room, construction);
    const ceil = ceilingBattenLM(room, construction);
    const total = totalBattenLM(room, construction);
    expect(total).toBeCloseTo(wall + ceil, 3);
  });

  it('doubles when cross-battening is enabled', () => {
    const base = totalBattenLM(room, construction);
    const crossed = totalBattenLM(room, { ...construction, crossBattening: true });
    expect(crossed).toBeCloseTo(base * 2, 3);
  });
});
