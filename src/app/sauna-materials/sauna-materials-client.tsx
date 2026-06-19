'use client';

import { createPortal } from 'react-dom';
import { useRef, useMemo, useState } from 'react';
import { Download, RotateCcw, FileUp, FileText, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BenchConstructionMethod, BenchesEditor } from '@/components/sauna-materials/BenchesEditor';
import { PdfViewer } from '@/components/sauna-materials/PdfViewer';
import { BomSummaryCards } from '@/components/sauna-materials/BomSummaryCards';
import { BomTable } from '@/components/sauna-materials/BomTable';
import { ConstructionToggles } from '@/components/sauna-materials/ConstructionToggles';
import { HeaterColumnsEditor } from '@/components/sauna-materials/HeaterColumnsEditor';
import { LibraryManagerSheet } from '@/components/sauna-materials/LibraryManagerSheet';
import { OpeningsEditor } from '@/components/sauna-materials/OpeningsEditor';
import { ProfilesPanel } from '@/components/sauna-materials/ProfilesPanel';
import { ProjectSetupForm } from '@/components/sauna-materials/ProjectSetupForm';
import {
  SaunaMaterialsNav,
  type SaunaSection,
} from '@/components/sauna-materials/SaunaMaterialsNav';
import { WarningsPanel } from '@/components/sauna-materials/WarningsPanel';
import { bomToCsv, downloadCsv } from '@/lib/saunaMaterials/csv';
import { generateBom } from '@/lib/saunaMaterials/bom';
import {
  SaunaMaterialsProvider,
  useSaunaMaterials,
} from '@/lib/saunaMaterials/store';

// ── Shared header bar ─────────────────────────────────────────────────────────

function HeaderBar() {
  const { dispatchProject } = useSaunaMaterials();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sauna Materials</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <LibraryManagerSheet />
      </div>
    </div>
  );
}

// ── Take-off header ───────────────────────────────────────────────────────────

function TakeoffHeader({ bom }: { bom: ReturnType<typeof generateBom> }) {
  const { project } = useSaunaMaterials();
  const date = new Date(bom.generatedAt).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function handleExport() {
    const csv = bomToCsv(bom);
    const filename = `${slugify(project.name) || 'takeoff'}-${bom.generatedAt.slice(0, 10)}.csv`;
    downloadCsv(filename, csv);
  }

  return (
    <div className="flex items-end justify-between gap-4 pb-4 border-b border-gray-2">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
          Quantity take-off
        </p>
        <h2 className="text-lg font-bold tracking-tight leading-tight">{project.name}</h2>
        {project.location && (
          <p className="text-sm text-muted-foreground">{project.location}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">Generated {date}</p>
      </div>
      <Button onClick={handleExport} className="gap-2 shrink-0">
        <Download className="h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
}

// ── Drawings section with portal modal ───────────────────────────────────────

function DrawingsSection() {
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setOpen(true);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') handleFile(f);
  }

  return (
    <>
      {!file ? (
        <Card
          className="border-2 border-dashed border-gray-2 bg-muted/30 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
        >
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <FileUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Upload a PDF drawing</p>
              <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse</p>
            </div>
            <input
              ref={inputRef}
              type="file" accept="application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <Button size="sm" className="gap-2 shrink-0" onClick={() => setOpen(true)}>
              <Maximize2 className="h-4 w-4" />
              Open viewer
            </Button>
            <Button
              variant="ghost" size="sm"
              className="text-muted-foreground shrink-0"
              onClick={() => { setFile(null); setOpen(false); }}
            >
              Remove
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Keep PdfViewer mounted once a file is loaded — measurements survive close/reopen */}
      {file && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-50 flex flex-col bg-background ${!open ? 'hidden' : ''}`}>
          <PdfViewer file={file} onClose={() => setOpen(false)} />
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Main inner component (has access to store context) ────────────────────────

function SaunaMaterialsInner() {
  const { project, library } = useSaunaMaterials();
  const [section, setSection] = useState<SaunaSection>('room');
  const [labourEnabled, setLabourEnabled] = useState(false);
  const [labourRate, setLabourRate] = useState(100);

  const bom = useMemo(
    () => generateBom(
      project,
      library,
      new Date().toISOString(),
      labourEnabled ? { ratePerHour: labourRate } : undefined,
    ),
    [project, library, labourEnabled, labourRate],
  );

  return (
    <main className="min-h-screen">
      <div className="page-container">
        <div className="mb-6">
          <HeaderBar />
        </div>
        <SaunaMaterialsNav active={section} onChange={setSection} />

        {section === 'room' && (
          <div className="space-y-4 section-animate">
            <ProjectSetupForm />
            <OpeningsEditor />
            <HeaterColumnsEditor />
          </div>
        )}

        {section === 'benches' && (
          <div className="space-y-4 section-animate">
            <BenchesEditor />
            <BenchConstructionMethod />
          </div>
        )}

        {section === 'walls' && (
          <div className="space-y-4 section-animate">
            <ConstructionToggles />
          </div>
        )}

        {section === 'supplies' && (
          <div className="space-y-4 section-animate">
            <ProfilesPanel />
          </div>
        )}

        {/* Always mounted — CSS hidden preserves file + measurement state across tab switches */}
        <div className={`space-y-4 ${section === 'drawings' ? 'section-animate' : 'hidden'}`}>
          <DrawingsSection />
        </div>

        {section === 'takeoff' && (
          <div className="space-y-4">
            <div className="section-animate" style={{ animationDelay: '0ms' }}>
              <TakeoffHeader bom={bom} />
            </div>
            <div className="section-animate" style={{ animationDelay: '40ms' }}>
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
                        Indicative — commercial Melbourne rates, 2026
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="section-animate" style={{ animationDelay: '80ms' }}>
              <BomSummaryCards bom={bom} />
            </div>
            {bom.warnings.length > 0 && (
              <div className="section-animate" style={{ animationDelay: '120ms' }}>
                <WarningsPanel warnings={bom.warnings} />
              </div>
            )}
            <div className="section-animate" style={{ animationDelay: '160ms' }}>
              <BomTable bom={bom} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export function SaunaMaterialsClient() {
  return (
    <SaunaMaterialsProvider>
      <SaunaMaterialsInner />
    </SaunaMaterialsProvider>
  );
}
