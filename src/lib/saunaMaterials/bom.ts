import type {
  BOM,
  BOMLineItem,
  BOMTotals,
  Library,
  MaterialItem,
  Profile,
  Project,
} from '@/types/saunaMaterials';
import {
  totalBackrestLM,
  totalBenchFramingLM,
  totalBenchSlatFaceM2,
} from './benches';
import { totalBattenLM } from './battens';
import { ceilUnits, faceAreaToLM, round1, round2 } from './conversions';
import {
  fixingCounts,
  foilTapeLM,
  insulationCeilingM2,
  insulationWallM2,
  vapourBarrierM2,
} from './envelope';
import { ceilingNetCladdingM2, totalWallNetCladdingM2 } from './geometry';
import { estimateLabourPhases, totalLabourHours } from './labour';
import { collectWarnings } from './validation';

export interface LabourConfig {
  /** AUD per hour applied to each labour phase. */
  ratePerHour: number;
}

function findProfile(library: Library, id: string): Profile | undefined {
  return library.profiles.find(p => p.id === id);
}

function findMaterial(library: Library, id: string): MaterialItem | undefined {
  return library.materials.find(m => m.id === id);
}

function priceTotal(qty: number, unit: number | null): number | null {
  if (unit == null) return null;
  return qty * unit;
}

export function generateBom(
  project: Project,
  library: Library,
  generatedAt: string,
  labourConfig?: LabourConfig
): BOM {
  const lineItems: BOMLineItem[] = [];

  const wallResult = totalWallNetCladdingM2(project);
  const ceilingNet = ceilingNetCladdingM2(project);
  const benchFace = totalBenchSlatFaceM2(project.benches);
  const benchFraming = totalBenchFramingLM(project.benches, project.benchConstruction);
  const backrestLM = totalBackrestLM(project.benches);
  const battenLM = totalBattenLM(project.room, project.construction);

  // ── Timber ────────────────────────────────────────────────────────────────
  const wallProfile = findProfile(library, project.profiles.wallCladding);
  if (wallProfile) {
    const lm = faceAreaToLM(wallResult.total, wallProfile, project.waste.cladding);
    lineItems.push({
      id: 'wall-cladding',
      category: 'timber',
      description: `Wall cladding (${round2(wallResult.total)} m² face)`,
      profileOrMaterialName: wallProfile.name,
      quantity: round1(lm),
      unit: 'lm',
      wasteApplied: project.waste.cladding,
      unitPrice: wallProfile.pricePerLM,
      totalPrice: priceTotal(round1(lm), wallProfile.pricePerLM),
      notes: `${(project.waste.cladding * 100).toFixed(0)}% waste applied`,
    });
  }

  const ceilingProfile = findProfile(library, project.profiles.ceilingCladding);
  if (ceilingProfile) {
    const lm = faceAreaToLM(ceilingNet, ceilingProfile, project.waste.cladding);
    lineItems.push({
      id: 'ceiling-cladding',
      category: 'timber',
      description: `Ceiling cladding (${round2(ceilingNet)} m² face)`,
      profileOrMaterialName: ceilingProfile.name,
      quantity: round1(lm),
      unit: 'lm',
      wasteApplied: project.waste.cladding,
      unitPrice: ceilingProfile.pricePerLM,
      totalPrice: priceTotal(round1(lm), ceilingProfile.pricePerLM),
      notes: `${(project.waste.cladding * 100).toFixed(0)}% waste applied`,
    });
  }

  const slatProfile = findProfile(library, project.profiles.benchSlat);
  if (slatProfile) {
    const lm = faceAreaToLM(benchFace, slatProfile, project.waste.benchSlat);
    lineItems.push({
      id: 'bench-slat',
      category: 'timber',
      description: `Bench slats — tops, fronts, ends, backrests (${round2(benchFace)} m² face)`,
      profileOrMaterialName: slatProfile.name,
      quantity: round1(lm),
      unit: 'lm',
      wasteApplied: project.waste.benchSlat,
      unitPrice: slatProfile.pricePerLM,
      totalPrice: priceTotal(round1(lm), slatProfile.pricePerLM),
      notes: `${(project.waste.benchSlat * 100).toFixed(0)}% waste applied`,
    });
  }

  const framingProfile = findProfile(library, project.profiles.benchFraming);
  if (framingProfile) {
    const lm = benchFraming * (1 + project.waste.framing);
    lineItems.push({
      id: 'bench-framing',
      category: 'timber',
      description: 'Bench framing — perimeter, bearers, legs',
      profileOrMaterialName: framingProfile.name,
      quantity: round1(lm),
      unit: 'lm',
      wasteApplied: project.waste.framing,
      unitPrice: framingProfile.pricePerLM,
      totalPrice: priceTotal(round1(lm), framingProfile.pricePerLM),
      notes: `${(project.waste.framing * 100).toFixed(0)}% waste applied`,
    });
  }

  const battenProfile = findProfile(library, project.profiles.batten);
  if (battenProfile) {
    const lm = battenLM * (1 + project.waste.batten);
    lineItems.push({
      id: 'batten',
      category: 'timber',
      description: project.construction.crossBattening
        ? 'Battens (walls + ceiling, cross-battened)'
        : 'Battens (walls + ceiling)',
      profileOrMaterialName: battenProfile.name,
      quantity: round1(lm),
      unit: 'lm',
      wasteApplied: project.waste.batten,
      unitPrice: battenProfile.pricePerLM,
      totalPrice: priceTotal(round1(lm), battenProfile.pricePerLM),
      notes: `${(project.waste.batten * 100).toFixed(0)}% waste applied`,
    });
  }

  if (backrestLM > 0) {
    const backProfile = findProfile(library, project.profiles.backrest);
    if (backProfile) {
      const lm = backrestLM * (1 + project.waste.benchSlat);
      lineItems.push({
        id: 'backrest',
        category: 'timber',
        description: 'Backrest profile',
        profileOrMaterialName: backProfile.name,
        quantity: round1(lm),
        unit: 'lm',
        wasteApplied: project.waste.benchSlat,
        unitPrice: backProfile.pricePerLM,
        totalPrice: priceTotal(round1(lm), backProfile.pricePerLM),
        notes: '',
      });
    }
  }

  // ── Insulation ────────────────────────────────────────────────────────────
  const wallInsM2 = insulationWallM2(project);
  const ceilingInsM2 = insulationCeilingM2(project);

  const wallInsulation = findMaterial(library, project.profiles.insulation);
  if (wallInsulation) {
    const packs = ceilUnits(wallInsM2 / wallInsulation.unitSize);
    lineItems.push({
      id: 'wall-insulation',
      category: 'insulation',
      description: `Wall insulation (${round2(wallInsM2)} m²)`,
      profileOrMaterialName: wallInsulation.name,
      quantity: packs,
      unit: wallInsulation.unit,
      wasteApplied: 0,
      unitPrice: wallInsulation.pricePerUnit,
      totalPrice: priceTotal(packs, wallInsulation.pricePerUnit),
      notes: `${wallInsulation.unitSize} m² per ${wallInsulation.unit}`,
    });
  }

  const ceilingInsulation = findMaterial(library, project.profiles.ceilingInsulation);
  if (ceilingInsulation) {
    const packs = ceilUnits(ceilingInsM2 / ceilingInsulation.unitSize);
    lineItems.push({
      id: 'ceiling-insulation',
      category: 'insulation',
      description: `Ceiling insulation (${round2(ceilingInsM2)} m²)`,
      profileOrMaterialName: ceilingInsulation.name,
      quantity: packs,
      unit: ceilingInsulation.unit,
      wasteApplied: 0,
      unitPrice: ceilingInsulation.pricePerUnit,
      totalPrice: priceTotal(packs, ceilingInsulation.pricePerUnit),
      notes: `${ceilingInsulation.unitSize} m² per ${ceilingInsulation.unit}`,
    });
  }

  // ── Vapour barrier + tape ─────────────────────────────────────────────────
  const vbM2 = vapourBarrierM2(project);
  const vbMaterial = findMaterial(library, project.profiles.vapourBarrier);
  if (vbMaterial) {
    const rolls = ceilUnits(vbM2 / vbMaterial.unitSize);
    lineItems.push({
      id: 'vapour-barrier',
      category: 'vapourBarrier',
      description: `Vapour barrier (${round2(vbM2)} m² incl. overlap)`,
      profileOrMaterialName: vbMaterial.name,
      quantity: rolls,
      unit: vbMaterial.unit,
      wasteApplied: 0.10,
      unitPrice: vbMaterial.pricePerUnit,
      totalPrice: priceTotal(rolls, vbMaterial.pricePerUnit),
      notes: `${vbMaterial.unitSize} m² per ${vbMaterial.unit}`,
    });
  }

  const tapeLM = foilTapeLM(project);
  const tapeMaterial = findMaterial(library, project.profiles.tape);
  if (tapeMaterial) {
    const rolls = ceilUnits(tapeLM / tapeMaterial.unitSize);
    lineItems.push({
      id: 'foil-tape',
      category: 'tape',
      description: `Foil tape (${round1(tapeLM)} lm)`,
      profileOrMaterialName: tapeMaterial.name,
      quantity: rolls,
      unit: tapeMaterial.unit,
      wasteApplied: 0.10,
      unitPrice: tapeMaterial.pricePerUnit,
      totalPrice: priceTotal(rolls, tapeMaterial.pricePerUnit),
      notes: `${tapeMaterial.unitSize} lm per ${tapeMaterial.unit}`,
    });
  }

  // ── Fixings ───────────────────────────────────────────────────────────────
  const fixings = fixingCounts(project, {
    wallNet: wallResult.total,
    ceilingNet,
    benchFace,
  });

  const claddingScrews = findMaterial(library, project.profiles.claddingScrews);
  if (claddingScrews) {
    const boxes = ceilUnits(fixings.cladding / claddingScrews.unitSize);
    lineItems.push({
      id: 'cladding-fixings',
      category: 'fixings',
      description: `Cladding fixings (~${Math.round(fixings.cladding)} ea)`,
      profileOrMaterialName: claddingScrews.name,
      quantity: boxes,
      unit: claddingScrews.unit,
      wasteApplied: 0,
      unitPrice: claddingScrews.pricePerUnit,
      totalPrice: priceTotal(boxes, claddingScrews.pricePerUnit),
      notes: `${claddingScrews.unitSize} per ${claddingScrews.unit}`,
    });
  }

  const benchScrews = findMaterial(library, project.profiles.benchScrews);
  if (benchScrews) {
    const boxes = ceilUnits(fixings.bench / benchScrews.unitSize);
    lineItems.push({
      id: 'bench-fixings',
      category: 'fixings',
      description: `Bench fixings (~${Math.round(fixings.bench)} ea)`,
      profileOrMaterialName: benchScrews.name,
      quantity: boxes,
      unit: benchScrews.unit,
      wasteApplied: 0,
      unitPrice: benchScrews.pricePerUnit,
      totalPrice: priceTotal(boxes, benchScrews.pricePerUnit),
      notes: `${benchScrews.unitSize} per ${benchScrews.unit}`,
    });
  }

  // ── Labour ────────────────────────────────────────────────────────────────
  if (labourConfig) {
    const phases = estimateLabourPhases(project);
    for (const phase of phases) {
      lineItems.push({
        id: phase.id,
        category: 'labour',
        description: phase.description,
        profileOrMaterialName: '—',
        quantity: phase.hours,
        unit: 'hr',
        wasteApplied: 0,
        unitPrice: labourConfig.ratePerHour,
        totalPrice: phase.hours * labourConfig.ratePerHour,
        notes: '',
      });
    }
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const timberLM = lineItems
    .filter(li => li.category === 'timber')
    .reduce((sum, li) => sum + li.quantity, 0);

  const insulationM2Total = wallInsM2 + ceilingInsM2;

  const pricedItems = lineItems.filter(li => li.totalPrice != null);
  const allPriced = lineItems.length > 0 && pricedItems.length === lineItems.length;
  const estimatedTotalCost = allPriced
    ? pricedItems.reduce((sum, li) => sum + (li.totalPrice ?? 0), 0)
    : null;

  const labourHours = labourConfig
    ? totalLabourHours(estimateLabourPhases(project))
    : undefined;

  const totals: BOMTotals = {
    timberLM: round1(timberLM),
    insulationM2: round2(insulationM2Total),
    vapourBarrierM2: round2(vbM2),
    estimatedTotalCost,
    ...(labourHours !== undefined && { labourHours }),
  };

  const warnings = collectWarnings(project, library);

  return {
    project,
    generatedAt,
    lineItems,
    totals,
    warnings,
  };
}
