import { generateBom } from '@/lib/saunaMaterials/bom';
import { bomToCsv } from '@/lib/saunaMaterials/csv';
import { SEED_LIBRARY } from '@/lib/saunaMaterials/seedLibrary';
import { SLOW_FOLK_PROJECT } from './slowfolk-fixture';

describe('bomToCsv', () => {
  const bom = generateBom(SLOW_FOLK_PROJECT, SEED_LIBRARY, '2026-05-05T00:00:00.000Z');
  const csv = bomToCsv(bom);

  it('starts with a project header row', () => {
    expect(csv.startsWith('Project,Client,Location,Generated')).toBe(true);
  });

  it('includes the project name on the second line', () => {
    const second = csv.split('\n')[1];
    expect(second).toContain('Slow Folk Brunswick');
  });

  it('includes a line item for wall cladding', () => {
    expect(csv).toMatch(/Wall cladding[^\n]*lm/);
  });

  it('includes the totals section', () => {
    expect(csv).toContain('Totals');
    expect(csv).toContain('Timber LM');
    expect(csv).toContain('Insulation m²');
    expect(csv).toContain('Vapour barrier m²');
  });

  it('quotes fields containing commas or newlines', () => {
    const project = {
      ...SLOW_FOLK_PROJECT,
      name: 'Project, with a comma',
    };
    const tricky = generateBom(project, SEED_LIBRARY, '2026-05-05T00:00:00.000Z');
    const out = bomToCsv(tricky);
    expect(out).toContain('"Project, with a comma"');
  });

  it('omits the estimated total line when no prices are set', () => {
    expect(csv).not.toContain('Estimated total');
  });
});
