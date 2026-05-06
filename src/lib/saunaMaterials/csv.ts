import type { BOM } from '@/types/saunaMaterials';

function escape(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serialise a BOM into a single CSV string suitable for emailing to a supplier. */
export function bomToCsv(bom: BOM): string {
  const lines: string[] = [];

  lines.push('Project,Client,Location,Generated');
  lines.push(
    [
      escape(bom.project.name),
      escape(bom.project.client),
      escape(bom.project.location),
      escape(bom.generatedAt),
    ].join(',')
  );
  lines.push('');

  lines.push(
    'Category,Description,Profile / Material,Quantity,Unit,Waste %,Unit Price,Total,Notes'
  );

  for (const li of bom.lineItems) {
    lines.push(
      [
        escape(li.category),
        escape(li.description),
        escape(li.profileOrMaterialName),
        escape(li.quantity),
        escape(li.unit),
        escape(Math.round(li.wasteApplied * 100)),
        escape(li.unitPrice),
        escape(li.totalPrice),
        escape(li.notes),
      ].join(',')
    );
  }

  lines.push('');
  lines.push('Totals');
  lines.push(`Timber LM,${escape(bom.totals.timberLM)}`);
  lines.push(`Insulation m²,${escape(bom.totals.insulationM2)}`);
  lines.push(`Vapour barrier m²,${escape(bom.totals.vapourBarrierM2)}`);
  if (bom.totals.estimatedTotalCost !== null) {
    lines.push(`Estimated total,${escape(bom.totals.estimatedTotalCost)}`);
  }

  if (bom.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings');
    for (const w of bom.warnings) {
      lines.push(`${escape(w.severity)},${escape(w.code)},${escape(w.message)}`);
    }
  }

  return lines.join('\n');
}

/** Trigger a CSV download in the browser. */
export function downloadCsv(filename: string, csv: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
