'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bomToCsv, downloadCsv } from '@/lib/saunaMaterials/csv';
import type { BOM } from '@/types/saunaMaterials';

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ExportButton({ bom }: { bom: BOM }) {
  const handleClick = () => {
    const csv = bomToCsv(bom);
    const date = bom.generatedAt.slice(0, 10);
    const filename = `${slugify(bom.project.name) || 'bom'}-${date}.csv`;
    downloadCsv(filename, csv);
  };

  return (
    <Button onClick={handleClick} className="gap-2">
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
