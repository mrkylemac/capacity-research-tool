'use client';

import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BenchConstructionDiagram } from '@/components/sauna-materials/BenchConstructionDiagram';
import { BenchesEditor } from '@/components/sauna-materials/BenchesEditor';
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
            Slow Folk Brunswick · 219 Albion St
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

  const bom = useMemo(
    () => generateBom(project, library, new Date().toISOString()),
    [project, library]
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
            <BomSummaryCards bom={bom} />
          </div>
          {bom.warnings.length > 0 && (
            <div className="section-animate" style={{ animationDelay: '60ms' }}>
              <WarningsPanel warnings={bom.warnings} />
            </div>
          )}
          <div className="section-animate" style={{ animationDelay: '120ms' }}>
            <BomTable bom={bom} />
          </div>
          <div className="flex justify-end section-animate" style={{ animationDelay: '180ms' }}>
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
