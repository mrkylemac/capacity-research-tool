import type {
  Finding,
  FindingCategory,
  GreenNote,
  HeatMapRow,
  LayupBrief,
  Severity,
} from '@/types/tileFindings';
import type { TilePlanConfig, TileStats } from '@/types/tiles';
import { computeDeckGeometry, fitTilesAcross } from './tilePlanner';

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  cutEfficiency: 'Cut efficiency and waste',
  perimeterEdges: 'Perimeter edges',
  poolDimensions: 'Pool floor and walls',
  skimmerFit: 'Skimmer fit (lid + body)',
  waterline: 'Waterline alignment',
  topCourse: 'Top course of pool wall',
  fittings: 'Handrails and suctions',
  footprint: 'Room footprint',
};

const CATEGORY_ORDER: FindingCategory[] = [
  'cutEfficiency',
  'footprint',
  'perimeterEdges',
  'poolDimensions',
  'skimmerFit',
  'waterline',
  'topCourse',
  'fittings',
];

const SEVERITY_RANK: Record<Severity, number> = {
  red: 3,
  amber: 2,
  green: 1,
  clear: 0,
};

function worst(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function round(n: number, dp = 0): number {
  const m = Math.pow(10, dp);
  return Math.round(n * m) / m;
}

interface Accumulator {
  findings: Finding[];
  greenNotes: GreenNote[];
  perCategory: Record<FindingCategory, Severity>;
}

function newAccumulator(): Accumulator {
  const perCategory = {} as Record<FindingCategory, Severity>;
  for (const c of CATEGORY_ORDER) perCategory[c] = 'clear';
  return { findings: [], greenNotes: [], perCategory };
}

function addFinding(acc: Accumulator, f: Finding) {
  acc.findings.push(f);
  acc.perCategory[f.category] = worst(acc.perCategory[f.category], f.severity);
}

function addGreen(acc: Accumulator, g: GreenNote) {
  acc.greenNotes.push(g);
  acc.perCategory[g.category] = worst(acc.perCategory[g.category], 'green');
}

export function evaluateLayup(
  config: TilePlanConfig,
  stats: TileStats,
): LayupBrief {
  const acc = newAccumulator();
  const geo = computeDeckGeometry(config);
  const tile = config.tileSize;
  const grout = config.groutWidth;
  const pitch = tile + grout;

  evaluateCutEfficiency(acc, stats);
  evaluateFootprint(acc, config);
  evaluatePerimeterEdges(acc, config);
  evaluatePoolDimensions(acc, config);
  evaluateSkimmerDressRings(acc, config, geo);
  evaluateSkimmerBodyFit(acc, config, geo);
  evaluateWaterline(acc, config);
  evaluateTopCourse(acc, config);
  evaluateFittings(acc, config);

  const counts = {
    red: acc.findings.filter(f => f.severity === 'red').length,
    amber: acc.findings.filter(f => f.severity === 'amber').length,
    green: acc.greenNotes.length,
  };

  const heatMap: HeatMapRow[] = CATEGORY_ORDER.map(category => {
    const sev = acc.perCategory[category];
    const reds = acc.findings.filter(f => f.category === category && f.severity === 'red').length;
    const ambers = acc.findings.filter(f => f.category === category && f.severity === 'amber').length;
    let statusText = 'Nothing of concern';
    if (sev === 'red') statusText = `${reds} to fix before pour`;
    else if (sev === 'amber') statusText = `${ambers} to negotiate with the tiler`;
    else if (sev === 'green') statusText = 'Standard, on module';
    return { category, label: CATEGORY_LABELS[category], severity: sev, statusText };
  });

  const posture: LayupBrief['posture'] =
    counts.red > 0 ? 'pause-and-fix' : counts.amber > 0 ? 'lay-with-tweaks' : 'lay-as-is';

  const bottomLine = buildBottomLine(posture, counts, acc.findings, config, stats);
  const questions = buildQuestions(acc.findings);
  const housekeeping = buildHousekeeping(config);

  return {
    bottomLine,
    posture,
    counts,
    heatMap,
    findings: acc.findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]),
    greenNotes: acc.greenNotes,
    questions,
    housekeeping,
  };
}

function evaluateCutEfficiency(acc: Accumulator, stats: TileStats) {
  const yieldPct = 100 - stats.wastePercent;
  if (yieldPct < 60) {
    addFinding(acc, {
      id: 'cut-yield-poor',
      severity: 'red',
      category: 'cutEfficiency',
      title: `Material yield at ${round(yieldPct, 1)}%`,
      location: 'Deck top surface',
      whatItSays: `Of the ${stats.total} tiles you would purchase, only ${round(yieldPct, 1)}% of the tile face actually sits on the deck. The remaining ${round(stats.wastePercent, 1)}% is offcut.`,
      whyItMatters: `That is ${stats.cut} cut tiles, and you are paying for the full face on every one. At a 10% wastage buffer you are still short by ${round(stats.wastePercent - 10, 1)} percentage points.`,
      marketNorm: 'A clean rectangular layup with raw-edge tiles should land in the 80 to 90% yield range. Below 70% says the room dimensions are fighting the tile module.',
      whatToDo: 'Resize one or two perimeter dimensions to whole-tile modules before locking the slab. The biggest savings come from the longest perimeter runs.',
    });
  } else if (yieldPct < 75) {
    addFinding(acc, {
      id: 'cut-yield-amber',
      severity: 'amber',
      category: 'cutEfficiency',
      title: `Material yield at ${round(yieldPct, 1)}%`,
      location: 'Deck top surface',
      whatItSays: `${stats.cut} of ${stats.total} tiles need a cut, leaving ${round(stats.wastePercent, 1)}% of the purchased face as offcut.`,
      whyItMatters: `You will spend roughly ${Math.ceil(stats.cut / 30)} extra hours at the wet saw and need to order at least ${round(stats.wastePercent, 0)}% over.`,
      marketNorm: 'A well-set rectangular layup sits between 80 and 90% yield. Anything under 80% is usually fixable by nudging one or two dimensions.',
      whatToDo: 'Open the issues below. Most of the waste compounds from the perimeter edges. Fixing those usually pulls yield above 85%.',
    });
  } else {
    addGreen(acc, {
      id: 'cut-yield-green',
      category: 'cutEfficiency',
      item: 'Material yield',
      location: 'Deck',
      note: `${round(yieldPct, 1)}% used, ${round(stats.wastePercent, 1)}% offcut. Order 10% over and you are safe.`,
    });
  }
}

function evaluatePerimeterEdges(acc: Accumulator, config: TilePlanConfig) {
  const tile = config.tileSize;
  const grout = config.groutWidth;
  const edgeFit = fitTilesAcross(config.edgeWidth, tile, grout);
  const slot = edgeFit.hasCut ? edgeFit.cutSize : 0;
  const klass = classifyRemainder(slot, edgeFit.hasCut);

  if (klass === 'whole') {
    addGreen(acc, {
      id: 'edge-on-module',
      category: 'perimeterEdges',
      item: 'Outer edge width',
      location: 'All four sides of the deck',
      note: `${config.edgeWidth} mm = ${edgeFit.full} whole tile${edgeFit.full === 1 ? '' : 's'}. No cut.`,
    });
  } else if (klass === 'sliver') {
    addFinding(acc, {
      id: 'edge-sliver',
      severity: 'red',
      category: 'perimeterEdges',
      title: `${round(slot)} mm sliver around every perimeter edge`,
      location: 'Outer deck, all four sides',
      whatItSays: `Your ${config.edgeWidth} mm edge fits ${edgeFit.full} whole tile${edgeFit.full === 1 ? '' : 's'} and leaves a ${round(slot)} mm strip. Under 25 mm is the sliver zone.`,
      whyItMatters: `Every perimeter row carries this cut. A sliver under 25 mm chips on the raw edge and reads as a mistake right where the eye lands first.`,
      marketNorm: 'Slow Folk module rule: remainders under 25 mm are slivers. Either lift to whole tiles or push out to a band of 40 mm or more.',
      whatToDo: `Pull the edge to ${wholeRun(edgeFit.full, config)} mm (whole tiles, no cut), or push it out to ${wholeRun(edgeFit.full + 1, config)} mm (one more whole tile).`,
    });
  } else if (klass === 'awkward') {
    addFinding(acc, {
      id: 'edge-awkward',
      severity: 'amber',
      category: 'perimeterEdges',
      title: `${round(slot)} mm awkward cut on every perimeter row`,
      location: 'Outer deck, all four sides',
      whatItSays: `${edgeFit.full} whole tile${edgeFit.full === 1 ? '' : 's'} plus a ${round(slot)} mm strip. That sits in the 25 to 40 mm range, neither a clean cap nor a proper border.`,
      whyItMatters: `It reads as a forced cut. Either commit to a wider deliberate band, or close it down to whole tiles only.`,
      marketNorm: 'Slow Folk module rule: 25 to 40 mm is the awkward band. Choose a side.',
      whatToDo: `Either drop the edge to ${wholeRun(edgeFit.full, config)} mm (whole tiles), or open it to ≥ ${wholeRun(edgeFit.full, config) + 40 + grout} mm so the strip reads as a deliberate border.`,
    });
  } else {
    addGreen(acc, {
      id: 'edge-band',
      category: 'perimeterEdges',
      item: 'Outer edge width',
      location: 'Perimeter',
      note: `${edgeFit.full} whole tile${edgeFit.full === 1 ? '' : 's'} plus a ${round(slot)} mm band. Reads as a deliberate border.`,
    });
  }
}

function evaluatePoolDimensions(acc: Accumulator, config: TilePlanConfig) {
  const tile = config.tileSize;
  const grout = config.groutWidth;
  const pools: { key: 'hotPool' | 'coldPool'; label: string }[] = [
    { key: 'hotPool', label: 'Hot pool' },
    { key: 'coldPool', label: 'Cold pool' },
  ];
  for (const p of pools) {
    for (const dim of ['length', 'width'] as const) {
      const value = config[p.key][dim];
      const fit = fitTilesAcross(value, tile, grout);
      const slot = fit.hasCut ? fit.cutSize : 0;
      const axis = dim === 'length' ? 'long wall' : 'end wall';
      const idBase = `${p.key}-${dim}`;
      const klass = classifyRemainder(slot, fit.hasCut);

      if (klass === 'whole') {
        addGreen(acc, {
          id: `${idBase}-on-module`,
          category: 'poolDimensions',
          item: `${p.label} ${axis}`,
          location: `${p.label} interior`,
          note: `${value} mm = ${fit.full} whole tiles. No cut.`,
        });
      } else if (klass === 'sliver') {
        addFinding(acc, {
          id: `${idBase}-sliver`,
          severity: 'red',
          category: 'poolDimensions',
          title: `${round(slot)} mm sliver on the ${p.label.toLowerCase()} ${axis}`,
          location: `${p.label} interior, ${axis}`,
          whatItSays: `${value} mm fits ${fit.full} whole tiles and a ${round(slot)} mm cut at one end. Under 25 mm is the sliver zone.`,
          whyItMatters: `The cut sits underwater at eye-level for anyone sitting on the bench opposite. A ${round(slot)} mm strip will chip on the raw edge and trap grime in the grout joint.`,
          marketNorm: 'Slow Folk module rule: pool interior dims snap to a whole-tile run. 14 tiles = 1442 mm. 29 tiles = 2987 mm.',
          whatToDo: `Pull the ${axis} dim to ${wholeRun(fit.full, config)} mm before the form work goes up, or push to ${wholeRun(fit.full + 1, config)} mm for one more whole tile.`,
        });
      } else if (klass === 'awkward') {
        addFinding(acc, {
          id: `${idBase}-awkward`,
          severity: 'amber',
          category: 'poolDimensions',
          title: `${round(slot)} mm awkward cut on the ${p.label.toLowerCase()} ${axis}`,
          location: `${p.label} interior, ${axis}`,
          whatItSays: `${value} mm gives ${fit.full} whole tiles plus a ${round(slot)} mm cut. Sits in the 25 to 40 mm awkward range.`,
          whyItMatters: `Workable, but the cut reads as forced rather than chosen. The far end of the pool catches the eye every session.`,
          marketNorm: 'Slow Folk module rule: 25 to 40 mm is awkward. Land on whole tiles or commit to a ≥ 40 mm band.',
          whatToDo: `Lift to ${wholeRun(fit.full, config)} mm for whole tiles only, or push to ${wholeRun(fit.full + 1, config)} mm for one more whole tile.`,
        });
      } else {
        addGreen(acc, {
          id: `${idBase}-band`,
          category: 'poolDimensions',
          item: `${p.label} ${axis}`,
          location: `${p.label} interior`,
          note: `${fit.full} whole tiles plus a ${round(slot)} mm band. Reads as a deliberate border.`,
        });
      }
    }
  }
}

function evaluateSkimmerDressRings(
  acc: Accumulator,
  config: TilePlanConfig,
  _geo: ReturnType<typeof computeDeckGeometry>,
) {
  const pitch = pitchOf(config);
  const checks: { key: 'hotSkimmer' | 'coldSkimmer'; label: string }[] = [
    { key: 'hotSkimmer', label: 'Hot skimmer' },
    { key: 'coldSkimmer', label: 'Cold skimmer' },
  ];
  for (const s of checks) {
    const sk = config[s.key];

    if (sk.lidType === 'hide') {
      addGreen(acc, {
        id: `${s.key}-hide-lid`,
        category: 'skimmerFit',
        item: `${s.label} HIDE lid`,
        location: 'Centre divider',
        note: `${sk.width}×${sk.depth} mm recessed frame, tiles flow over. No deck cut around the lid.`,
      });
      continue;
    }

    const fitW = fitTilesAcross(sk.width, config.tileSize, config.groutWidth);
    const fitD = fitTilesAcross(sk.depth, config.tileSize, config.groutWidth);
    const wSlot = fitW.hasCut ? fitW.cutSize : 0;
    const dSlot = fitD.hasCut ? fitD.cutSize : 0;
    const wClass = classifyRemainder(wSlot, fitW.hasCut);
    const dClass = classifyRemainder(dSlot, fitD.hasCut);
    const worstClass: ModuleClass =
      wClass === 'sliver' || dClass === 'sliver'
        ? 'sliver'
        : wClass === 'awkward' || dClass === 'awkward'
          ? 'awkward'
          : wClass === 'band' || dClass === 'band'
            ? 'band'
            : 'whole';
    const worstSlot = Math.min(
      wClass === 'whole' ? Infinity : wSlot,
      dClass === 'whole' ? Infinity : dSlot,
    );

    if (worstClass === 'whole') {
      addGreen(acc, {
        id: `${s.key}-dim-clean`,
        category: 'skimmerFit',
        item: `${s.label} dress ring`,
        location: 'Centre divider',
        note: `${sk.width}×${sk.depth} mm lines up with the tile grid on both axes.`,
      });
    } else if (worstClass === 'sliver') {
      addFinding(acc, {
        id: `${s.key}-dim-sliver`,
        severity: 'red',
        category: 'skimmerFit',
        title: `${s.label} leaves a ${round(worstSlot)} mm sliver around the dress ring`,
        location: 'Centre divider, dress ring perimeter',
        whatItSays: `The ${sk.width}×${sk.depth} mm dress ring does not land on the ${pitch} mm grid. The tighter axis leaves a ${round(worstSlot)} mm strip.`,
        whyItMatters: 'A sliver around the access ring crumbles at the saw and sits exposed every time you lift the lid to clear the basket.',
        marketNorm: 'Slow Folk module rule: nudge the dress ring offset until the surrounding cut is either zero or ≥ 40 mm.',
        whatToDo: 'Shift the dress ring offset X or Y by 5 to 60 mm until the cut lands at zero or above 40 mm. Re-check both axes after the move.',
      });
    } else if (worstClass === 'awkward') {
      addFinding(acc, {
        id: `${s.key}-dim-awkward`,
        severity: 'amber',
        category: 'skimmerFit',
        title: `${s.label} sits awkwardly on the tile grid`,
        location: 'Centre divider, dress ring perimeter',
        whatItSays: `One axis around the dress ring leaves a ${round(worstSlot)} mm cut. Sits in the 25 to 40 mm awkward range.`,
        whyItMatters: 'Workable, but the cut around the lid is the most-touched edge in the centre divider. It is worth landing it cleanly.',
        marketNorm: 'Slow Folk module rule: dress ring cuts should be 0 mm or ≥ 40 mm.',
        whatToDo: 'Nudge the dress ring offset by 5 to 30 mm in the tighter axis to land on a grout line, or open the cut into a deliberate band.',
      });
    } else {
      addGreen(acc, {
        id: `${s.key}-dim-band`,
        category: 'skimmerFit',
        item: `${s.label} dress ring`,
        location: 'Centre divider',
        note: `Cuts land at ${round(wSlot)} and ${round(dSlot)} mm. Both wide enough to read as a chosen band.`,
      });
    }
  }
}

function evaluateSkimmerBodyFit(
  acc: Accumulator,
  config: TilePlanConfig,
  geo: ReturnType<typeof computeDeckGeometry>,
) {
  const cold = geo.coldSkimmerBody;
  const hot = geo.hotSkimmerBody;

  const xOverlap = !(cold.x + cold.width <= hot.x || hot.x + hot.width <= cold.x);
  const yOverlap = !(cold.y + cold.height <= hot.y || hot.y + hot.height <= cold.y);

  if (xOverlap && yOverlap) {
    addFinding(acc, {
      id: 'skimmer-body-collide',
      severity: 'red',
      category: 'skimmerFit',
      title: 'Skimmer bodies physically collide in the centre divider',
      location: 'Centre 600 mm allowance',
      whatItSays: `The hot and cold Megaskim bodies (${config.hotSkimmer.bodySize}×${config.hotSkimmer.bodySize} mm each) overlap in both X and Y. They cannot both be installed.`,
      whyItMatters: 'You will find this on the day of the pour. You cannot shrink a Megaskim body. One unit has to move, which means re-cutting the form work and likely a delay.',
      marketNorm: 'Skimmer bodies sit clear of each other by at least 100 mm of concrete on every face.',
      whatToDo: 'Stagger their Y positions so one body sits in the upper half of the centre and the other in the lower half. Default offsets are 200 mm (cold) and 860 mm (hot).',
    });
    return;
  }

  if (xOverlap || yOverlap) {
    const gapX = Math.max(
      0,
      Math.max(cold.x, hot.x) - Math.min(cold.x + cold.width, hot.x + hot.width),
    );
    const gapY = Math.max(
      0,
      Math.max(cold.y, hot.y) - Math.min(cold.y + cold.height, hot.y + hot.height),
    );
    const gap = Math.max(gapX, gapY);
    if (gap < 100) {
      addFinding(acc, {
        id: 'skimmer-body-tight',
        severity: 'amber',
        category: 'skimmerFit',
        title: `Only ${round(gap)} mm of concrete between the two skimmer bodies`,
        location: 'Centre divider, between the two bodies',
        whatItSays: `The cold and hot Megaskim bodies sit ${round(gap)} mm apart at the nearest point. The strip between them is the only concrete holding both in place.`,
        whyItMatters: 'Under 100 mm of concrete between heavy fittings is below the AS1926.3 reinforcement guidance and a known crack initiation point.',
        marketNorm: 'Pool builders leave at least 100 mm, and prefer 150 mm, of reinforced concrete between embedded fittings.',
        whatToDo: 'Open the gap to at least 100 mm by shifting one skimmer Y position. The cold default at 200 mm and hot at 860 mm gives roughly 190 mm of clear concrete.',
      });
    } else {
      addGreen(acc, {
        id: 'skimmer-body-clear',
        category: 'skimmerFit',
        item: 'Body clearance',
        location: 'Centre',
        note: `${round(gap)} mm of clear concrete between the two bodies. Safe for the pour.`,
      });
    }
  } else {
    addGreen(acc, {
      id: 'skimmer-body-staggered',
      category: 'skimmerFit',
      item: 'Body clearance',
      location: 'Centre',
      note: 'Bodies staggered in Y and do not overlap on either axis. Concrete pours cleanly around both.',
    });
  }

  // Check body fits inside centre on its X axis (sanity).
  const centreLeft = geo.centre.x;
  const centreRight = geo.centre.x + geo.centre.width;
  for (const [name, body] of [['Cold', cold], ['Hot', hot]] as const) {
    if (body.x < centreLeft - 1 || body.x + body.width > centreRight + 1) {
      addFinding(acc, {
        id: `${name.toLowerCase()}-body-overhang`,
        severity: 'amber',
        category: 'skimmerFit',
        title: `${name} skimmer body extends past the centre allowance`,
        location: 'Centre divider',
        whatItSays: `The ${name.toLowerCase()} body needs ${config.coldSkimmer.bodySize} mm front-to-back. It runs past the ${config.centreWidth} mm centre by ${round(Math.max(centreLeft - body.x, body.x + body.width - centreRight))} mm on one side.`,
        whyItMatters: 'The body is meant to sit fully inside the centre concrete. Overhanging into the pool means the throat is no longer flush with the inside pool face.',
        marketNorm: 'The Megaskim body sits with one face flush against the pool wall and the rest fully buried in the centre concrete.',
        whatToDo: `Either widen the centre to at least ${config.coldSkimmer.bodySize} mm, or pick a smaller skimmer.`,
      });
    }
  }
}

function evaluateWaterline(acc: Accumulator, config: TilePlanConfig) {
  const pools = [
    { key: 'hotPool' as const, label: 'Hot pool' },
    { key: 'coldPool' as const, label: 'Cold pool' },
  ];
  for (const p of pools) {
    const pool = config[p.key];
    const tile = config.tileSize;
    const grout = config.groutWidth;
    const pitch = tile + grout;
    const fullCourses = Math.floor((pool.waterDepth + grout) / pitch);
    const heightBelow = fullCourses * tile + Math.max(0, fullCourses - 1) * grout;
    const intoNextCourse = pool.waterDepth - heightBelow;

    // distance from waterline to nearest grout line
    const distBelow = intoNextCourse - grout; // 0 if exactly at top of nth grout
    const distAbove = intoNextCourse > 0 ? tile + grout - intoNextCourse : tile + grout;
    const minDist = Math.min(Math.abs(distBelow), Math.abs(distAbove));

    if (minDist < 5) {
      addGreen(acc, {
        id: `${p.key}-waterline-clean`,
        category: 'waterline',
        item: `${p.label} waterline`,
        location: `Pool wall, ${pool.waterDepth} mm`,
        note: `Lands on the grout line at the top of course ${fullCourses}. Visually the grout reads as the water surface.`,
      });
    } else if (minDist < 15) {
      addFinding(acc, {
        id: `${p.key}-waterline-sliver`,
        severity: 'red',
        category: 'waterline',
        title: `${p.label} waterline lands ${round(minDist)} mm from the grout line`,
        location: `Pool wall, ${pool.waterDepth} mm depth`,
        whatItSays: `The waterline sits ${round(intoNextCourse)} mm into course ${fullCourses + 1}. The nearest grout joint is ${round(minDist)} mm away.`,
        whyItMatters: `That puts a hard horizontal line ${round(minDist)} mm above (or below) the grout, visible from every direction in the room. It reads as a defect, not a feature.`,
        marketNorm: 'A clean job lands the still-water line directly on a grout joint or at the midpoint of a course where the wet/dry split sits centred.',
        whatToDo: `Adjust the water depth by ${round(minDist)} mm in either direction. For ${p.label.toLowerCase()}, try ${pool.waterDepth - Math.round(distBelow)} mm or ${pool.waterDepth + Math.round(distAbove)} mm so the line lands on a grout joint.`,
      });
    } else if (minDist < tile / 2 - 5) {
      addFinding(acc, {
        id: `${p.key}-waterline-mid`,
        severity: 'amber',
        category: 'waterline',
        title: `${p.label} waterline sits mid-tile`,
        location: `Pool wall, ${pool.waterDepth} mm depth`,
        whatItSays: `Waterline lands ${round(intoNextCourse)} mm into course ${fullCourses + 1}. Nearest grout is ${round(minDist)} mm.`,
        whyItMatters: `Visually fine. The split between permanently wet and permanently dry tile sits across one course, which is a common look. Mineral build-up will trace a line at the still-water mark, not on a grout joint.`,
        marketNorm: 'Either land on a grout joint or accept the visible wet/dry tile band. Both are common, neither is wrong.',
        whatToDo: `If you want the joint look, drop the water depth to ${pool.waterDepth - Math.round(distBelow)} mm or raise it to ${pool.waterDepth + Math.round(distAbove)} mm.`,
      });
    } else {
      addGreen(acc, {
        id: `${p.key}-waterline-centred`,
        category: 'waterline',
        item: `${p.label} waterline`,
        location: `Pool wall, ${pool.waterDepth} mm`,
        note: `Sits roughly centred on course ${fullCourses + 1}. The wet/dry split lands cleanly across the middle of the tile.`,
      });
    }
  }
}

function evaluateTopCourse(acc: Accumulator, config: TilePlanConfig) {
  const pools = [
    { key: 'hotPool' as const, label: 'Hot pool' },
    { key: 'coldPool' as const, label: 'Cold pool' },
  ];
  for (const p of pools) {
    const pool = config[p.key];
    const fit = fitTilesAcross(pool.shellHeight, config.tileSize, config.groutWidth);
    const slot = fit.hasCut ? fit.cutSize : 0;
    const klass = classifyRemainder(slot, fit.hasCut);

    if (klass === 'whole') {
      addGreen(acc, {
        id: `${p.key}-top-clean`,
        category: 'topCourse',
        item: `${p.label} wall height`,
        location: 'Pool wall, top course',
        note: `${pool.shellHeight} mm = ${fit.full} whole courses. No cut at the top.`,
      });
    } else if (klass === 'sliver') {
      addFinding(acc, {
        id: `${p.key}-top-sliver`,
        severity: 'red',
        category: 'topCourse',
        title: `${round(slot)} mm sliver at the top of the ${p.label.toLowerCase()} wall`,
        location: 'Pool wall, top course',
        whatItSays: `${pool.shellHeight} mm fits ${fit.full} whole courses and a ${round(slot)} mm cut at the top.`,
        whyItMatters: `The top course is the most-seen tile on the wall. Under 25 mm is the sliver zone and tends to chip on the raw edge.`,
        marketNorm: 'Slow Folk module rule: shell height snaps to a whole-course run. 8 courses = 824 mm. 9 courses = 927 mm.',
        whatToDo: `Drop the shell to ${wholeRun(fit.full, config)} mm for a clean top, or raise to ${wholeRun(fit.full + 1, config)} mm for one more whole course.`,
      });
    } else if (klass === 'awkward') {
      addFinding(acc, {
        id: `${p.key}-top-awkward`,
        severity: 'amber',
        category: 'topCourse',
        title: `${round(slot)} mm awkward cut at the top of the ${p.label.toLowerCase()} wall`,
        location: 'Pool wall, top course',
        whatItSays: `${pool.shellHeight} mm gives ${fit.full} whole courses plus a ${round(slot)} mm cap. Sits in the 25 to 40 mm awkward range.`,
        whyItMatters: `Workable, but the top course reads as a forced cap rather than a chosen band.`,
        marketNorm: 'Slow Folk module rule: 25 to 40 mm is awkward. Land on whole tiles or commit to a ≥ 40 mm cap.',
        whatToDo: `Drop the shell to ${wholeRun(fit.full, config)} mm for whole courses, or raise to ${wholeRun(fit.full + 1, config)} mm.`,
      });
    } else {
      addGreen(acc, {
        id: `${p.key}-top-band`,
        category: 'topCourse',
        item: `${p.label} wall height`,
        location: 'Top course',
        note: `${fit.full} whole courses plus a ${round(slot)} mm cap. Reads as a deliberate top band.`,
      });
    }
  }
}

function evaluateFootprint(acc: Accumulator, config: TilePlanConfig) {
  const overallLong =
    config.edgeWidth * 2 +
    config.coldPool.length +
    config.centreWidth +
    config.hotPool.length;
  const cap = config.maxOverallLength;
  const over = overallLong - cap;

  if (over <= 0) {
    addGreen(acc, {
      id: 'footprint-within',
      category: 'footprint',
      item: 'Overall long dim',
      location: 'Room',
      note: `${overallLong} mm within the ${cap} mm room limit. ${cap - overallLong} mm of headroom.`,
    });
    return;
  }

  // Suggest the largest single dimension reduction that brings the layout back under the cap,
  // and round it to the nearest whole-tile run so the suggestion is module-clean.
  const targetSavings = over;
  const ideas: string[] = [];
  // Trim hot pool length down to a whole-tile run
  const hotFit = fitTilesAcross(config.hotPool.length - targetSavings, config.tileSize, config.groutWidth);
  const hotNew = wholeRun(Math.max(1, hotFit.full), config);
  if (hotNew < config.hotPool.length) {
    ideas.push(`shrink the hot pool length from ${config.hotPool.length} mm to ${hotNew} mm (${hotFit.full} whole tiles)`);
  }
  // Trim cold pool length
  const coldFit = fitTilesAcross(config.coldPool.length - targetSavings, config.tileSize, config.groutWidth);
  const coldNew = wholeRun(Math.max(1, coldFit.full), config);
  if (coldNew < config.coldPool.length) {
    ideas.push(`shrink the cold pool length from ${config.coldPool.length} mm to ${coldNew} mm (${coldFit.full} whole tiles)`);
  }
  // Tighten edge or centre as alternatives
  if (config.edgeWidth - over / 2 >= 100) {
    ideas.push(`pull both deck edges from ${config.edgeWidth} mm to ${Math.floor(config.edgeWidth - over / 2)} mm`);
  }
  if (config.centreWidth - over >= 470) {
    ideas.push(`narrow the centre from ${config.centreWidth} mm to ${config.centreWidth - over} mm (still clears the Megaskim body)`);
  }

  addFinding(acc, {
    id: 'footprint-over',
    severity: 'red',
    category: 'footprint',
    title: `Overall long dim is ${overallLong} mm, over the ${cap} mm room limit by ${over} mm`,
    location: 'Room, long axis',
    whatItSays: `Edges (${config.edgeWidth} × 2) + cold (${config.coldPool.length}) + centre (${config.centreWidth}) + hot (${config.hotPool.length}) = ${overallLong} mm. The room caps at ${cap} mm.`,
    whyItMatters: `The deck does not physically fit. The wall behind one of the pools needs to move, or one dimension comes in.`,
    marketNorm: `Hard build constraint, not a tile rule. ${cap} mm is the longest wall the room will accept without altering structure.`,
    whatToDo:
      ideas.length > 0
        ? `Choose one: ${ideas.join('; or ')}.`
        : `Either trim the room dimensions or commit to altering the surrounding wall.`,
  });
}

function evaluateFittings(acc: Accumulator, config: TilePlanConfig) {
  if (config.fittings.length === 0) {
    addFinding(acc, {
      id: 'fittings-silent',
      severity: 'amber',
      category: 'fittings',
      title: 'No handrails or suctions placed yet',
      location: 'Throughout',
      whatItSays: 'The current configuration has zero handrails, return jets, or suction outlets.',
      whyItMatters: 'AS1926.3 requires dual outlets on the floor of each pool. Handrails are a safety preference but standard on commercial bathhouses.',
      marketNorm: 'Two floor suctions per pool at least 600 mm apart centre to centre, plus a return jet on the opposite wall to the skimmer for circulation.',
      whatToDo: 'Add at least two suctions per pool floor and decide on handrails before tiling. Their positions affect tile cuts.',
    });
  } else {
    addGreen(acc, {
      id: 'fittings-noted',
      category: 'fittings',
      item: 'Fittings placed',
      location: 'Throughout',
      note: `${config.fittings.length} fittings configured. Cross-check each against AS1926.3 dual-outlet requirements before final pour.`,
    });
  }
}

function buildBottomLine(
  posture: LayupBrief['posture'],
  counts: { red: number; amber: number; green: number },
  findings: Finding[],
  config: TilePlanConfig,
  stats: TileStats,
): string {
  const yieldPct = round(100 - stats.wastePercent, 1);
  const topAmberOrRed = findings
    .filter(f => f.severity === 'red' || f.severity === 'amber')
    .slice(0, 3);
  const topAsks = Array.from(
    new Set(topAmberOrRed.map(f => f.whatToDo.split('.')[0].toLowerCase())),
  ).join(', then ');

  if (posture === 'pause-and-fix') {
    return `Pause and fix ${counts.red} red item${counts.red === 1 ? '' : 's'} before the slab goes down. Material yield sits at ${yieldPct}%, which is below the 80% you should be aiming for. The biggest move is to ${topAmberOrRed[0]?.whatToDo.split('.')[0].toLowerCase() ?? 'review the perimeter dimensions'}.`;
  }
  if (posture === 'lay-with-tweaks') {
    return `Lay with ${counts.amber} tweak${counts.amber === 1 ? '' : 's'}. Material yield is ${yieldPct}% and pulls above 85% if you ${topAsks}. Outside those, the layup is standard for a ${config.coldPool.length}×${config.coldPool.width} cold and ${config.hotPool.length}×${config.hotPool.width} hot bathhouse.`;
  }
  return `Lay as designed. Material yield sits at ${yieldPct}% with every dimension on or near a tile module. Order ${stats.total} tiles plus 10% wastage and have your tiler start at the centre divider.`;
}

function buildQuestions(findings: Finding[]): string[] {
  const seen = new Set<string>();
  const qs: string[] = [];
  for (const f of findings) {
    const text = f.whatToDo.trim();
    if (seen.has(text)) continue;
    seen.add(text);
    if (f.severity === 'red') qs.push(`Before pour: ${text}`);
    else if (f.severity === 'amber') qs.push(`Confirm with tiler: ${text}`);
  }
  return qs;
}

function buildHousekeeping(config: TilePlanConfig): string[] {
  const items: string[] = [];
  const totalLong = config.edgeWidth * 2 + config.coldPool.length + config.centreWidth + config.hotPool.length;
  const totalShort = config.edgeWidth * 2 + Math.max(config.coldPool.width, config.hotPool.width);
  items.push(`Working off Slow Folk current spec only. Overall footprint ${totalLong} × ${totalShort} mm, ${config.tileSize} mm tile, ${config.groutWidth} mm grout, raw-edge finish.`);
  if (config.hotSkimmer.bodySize !== config.coldSkimmer.bodySize) {
    items.push(`Hot and cold skimmer body sizes differ (${config.hotSkimmer.bodySize} vs ${config.coldSkimmer.bodySize} mm). Confirm both are Megaskim units.`);
  }
  if (config.tileThickness !== 7) {
    items.push(`Tile thickness is ${config.tileThickness} mm. Confirm with the slab heights, since the deck finish height carries the tile + adhesive + screed.`);
  }
  return items;
}

function pitchOf(c: TilePlanConfig) {
  return c.tileSize + c.groutWidth;
}

function wholeRun(n: number, c: TilePlanConfig) {
  if (n <= 0) return 0;
  return n * c.tileSize + (n - 1) * c.groutWidth;
}

// Slow Folk Tile Module System — unified remainder classifier.
//   whole   →  zero / negligible cut  →  green
//   sliver  →  0 < remainder < 25 mm  →  red    (too narrow to lay cleanly)
//   awkward →  25 ≤ remainder < 40 mm →  amber  (readable, but neither one thing nor the other)
//   band    →  remainder ≥ 40 mm      →  green  (wide enough to read as a deliberate border)
export type ModuleClass = 'whole' | 'sliver' | 'awkward' | 'band';

export function classifyRemainder(remainderMm: number, hasCut: boolean): ModuleClass {
  if (!hasCut || remainderMm < 1) return 'whole';
  if (remainderMm < 25) return 'sliver';
  if (remainderMm < 40) return 'awkward';
  return 'band';
}

function perimeterPerSide(c: TilePlanConfig) {
  const totalLong = c.edgeWidth * 2 + c.coldPool.length + c.centreWidth + c.hotPool.length;
  const totalShort = c.edgeWidth * 2 + Math.max(c.coldPool.width, c.hotPool.width);
  return Math.round(2 * (totalLong + totalShort) / (c.tileSize + c.groutWidth));
}

export { CATEGORY_LABELS };
