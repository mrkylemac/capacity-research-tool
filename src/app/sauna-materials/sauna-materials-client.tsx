'use client';

import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BenchConstructionDiagram } from '@/components/sauna-materials/BenchConstructionDiagram';
import { BenchConstructionMethod, BenchesEditor } from '@/components/sauna-materials/BenchesEditor';
import { BomSummaryCards } from '@/components/sauna-materials/BomSummaryCards';
import { BomTable } from '@/components/sauna-materials/BomTable';
import { ConstructionToggles } from '@/components/sauna-materials/ConstructionToggles';
import { ExportButton } from '@/components/sauna-materials/ExportButton';
import { HeaterColumnsEditor } from '@/components/sauna-materials/HeaterColumnsEditor';
import { LibraryManagerSheet } from '@/components/sauna-materials/LibraryManagerSheet';
import { OpeningsEditor } from '@/components/sauna-materials/OpeningsEditor';
import { ProfilesPanel } from '@/components/sauna-materials/ProfilesPanel';
import { ProjectSetupForm } from '@/components/sauna-materials/ProjectSetupForm';
import { RoomDiagram } from '@/components/sauna-materials/RoomDiagram';
import {
  SaunaMaterialsNav,
  type SaunaSection,
} from '@/components/sauna-materials/SaunaMaterialsNav';
import { WarningsPanel } from '@/components/sauna-materials/WarningsPanel';
import { generateBom } from '@/lib/saunaMaterials/bom';
import {
  SaunaMaterialsProvider,
  useSaunaMaterials,
} from '@/lib/saunaMaterials/store';

function Header() {
  const { dispatchProject } = useSaunaMaterials();
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-1 text-purple-4 border border-purple-2 tracking-wide uppercase">
              Materials
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sauna materials</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Slow Folk, 101/219 Albion Street Brunswick VIC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatchProject({ type: 'RESET_TO_DEMO' })}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <LibraryManagerSheet />
        </div>
      </div>
    </div>
  );
}

function ContentRouter() {
  const { project, library } = useSaunaMaterials();
  const [section, setSection] = useState<SaunaSection>('setup');
  const [labourEnabled, setLabourEnabled] = useState(false);
  const [labourRate, setLabourRate] = useState(100);

  const bom = useMemo(
    () => generateBom(
      project,
      library,
      new Date().toISOString(),
      labourEnabled ? { ratePerHour: labourRate } : undefined,
    ),
    [project, library, labourEnabled, labourRate]
  );

  return (
    <>
      <SaunaMaterialsNav active={section} onChange={setSection} />

      {section === 'setup' && (
        <div className="space-y-4">
          <div className="section-animate" style={{ animationDelay: '0ms' }}>
            <ProjectSetupForm />
          </div>
          <div className="section-animate" style={{ animationDelay: '60ms' }}>
            <RoomDiagram />
          </div>
        </div>
      )}

      {section === 'geometry' && (
        <div className="space-y-4 section-animate">
          <OpeningsEditor />
          <HeaterColumnsEditor />
        </div>
      )}

      {section === 'benches' && (
        <div className="space-y-4 section-animate">
          <BenchesEditor />
          <BenchConstructionMethod />
          <BenchConstructionDiagram />
        </div>
      )}

      {section === 'profiles' && (
        <div className="space-y-4 section-animate">
          <ProfilesPanel />
          <ConstructionToggles />
        </div>
      )}

      {section === 'bom' && (
        <div className="space-y-4">
          <div className="section-animate" style={{ animationDelay: '0ms' }}>
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <Switch checked={labourEnabled} onCheckedChange={setLabourEnabled} />
                    <span className="text-sm font-medium text-fg-4">Include labour estimate</span>
                  </label>
                  {labourEnabled && (
                    <div className="flex items-center gap-2 ml-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Rate</Label>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">$</span>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 pl-6 pr-8 text-sm"
                          value={labourRate}
                          onChange={e => setLabourRate(Number(e.target.value) || 0)}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">/hr</span>
                      </div>
                    </div>
                  )}
                  {labourEnabled && (
                    <p className="text-xs text-muted-foreground ml-auto">
                      Estimates are indicative — commercial Melbourne rates, 2026
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="section-animate" style={{ animationDelay: '60ms' }}>
            <BomSummaryCards bom={bom} />
          </div>
          {bom.warnings.length > 0 && (
            <div className="section-animate" style={{ animationDelay: '120ms' }}>
              <WarningsPanel warnings={bom.warnings} />
            </div>
          )}
          <div className="section-animate" style={{ animationDelay: '180ms' }}>
            <BomTable bom={bom} />
          </div>
          <div className="flex justify-end section-animate" style={{ animationDelay: '240ms' }}>
            <ExportButton bom={bom} />
          </div>
        </div>
      )}
    </>
  );
}

export function SaunaMaterialsClient() {
  return (
    <SaunaMaterialsProvider>
      <main className="min-h-screen">
        <div className="page-container">
          <Header />
          <ContentRouter />
        </div>
      </main>
    </SaunaMaterialsProvider>
  );
}
