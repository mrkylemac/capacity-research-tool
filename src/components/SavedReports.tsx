import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MomenceSession, SessionMetrics, MonthlyData, VenueConfig } from '@/types/momence';
import type { HostInfo } from '@/lib/momenceClient';

const STORAGE_KEY = 'venue-benchmark-reports';

export interface SavedReport {
  id: string;
  name: string;
  savedAt: string;
  venueName: string;
  hostId: string;
  dateRange: { from: string; to: string };
  sessions: MomenceSession[];
  metrics: SessionMetrics | null;
  monthlyData: MonthlyData[];
  venueConfig: VenueConfig | null;
  hostInfo: HostInfo | null;
}

export function getSavedReports(): SavedReport[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveReport(report: SavedReport) {
  const reports = getSavedReports();
  const updated = [report, ...reports];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteReport(id: string) {
  const reports = getSavedReports();
  const updated = reports.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

interface SaveReportButtonProps {
  currentData: {
    sessions: MomenceSession[];
    metrics: SessionMetrics | null;
    monthlyData: MonthlyData[];
    venueConfig: VenueConfig | null;
    hostInfo: HostInfo | null;
    dateRange: { from: string; to: string };
  };
}

export function SaveReportButton({ currentData }: SaveReportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveReport = () => {
    if (!reportName.trim()) return;

    const newReport: SavedReport = {
      id: Date.now().toString(),
      name: reportName.trim(),
      savedAt: new Date().toISOString(),
      venueName: currentData.hostInfo?.name || currentData.venueConfig?.venueName || 'Unknown Venue',
      hostId: currentData.hostInfo?.id?.toString() || '',
      dateRange: currentData.dateRange,
      sessions: currentData.sessions,
      metrics: currentData.metrics,
      monthlyData: currentData.monthlyData,
      venueConfig: currentData.venueConfig,
      hostInfo: currentData.hostInfo,
    };

    saveReport(newReport);
    setReportName('');
    setIsDialogOpen(false);
    setIsSaved(true);
    
    // Reset saved state after 3 seconds
    setTimeout(() => setIsSaved(false), 3000);
  };

  const formatDateRange = (from: string, to: string) => {
    try {
      return `${format(parseISO(from), 'MMM d, yyyy')} – ${format(parseISO(to), 'MMM d, yyyy')}`;
    } catch {
      return `${from} – ${to}`;
    }
  };

  if (isSaved) {
    return (
      <Button variant="outline" size="sm" disabled className="text-green-600">
        ✓ Saved
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Save Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="reportName">Report Name</Label>
            <Input
              id="reportName"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder={`${currentData.hostInfo?.name || 'Venue'} - ${format(new Date(), 'MMM yyyy')}`}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveReport()}
            />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Venue:</strong> {currentData.hostInfo?.name || currentData.venueConfig?.venueName}</p>
            <p><strong>Period:</strong> {formatDateRange(currentData.dateRange.from, currentData.dateRange.to)}</p>
            <p><strong>Sessions:</strong> {currentData.sessions.length}</p>
          </div>
          <Button onClick={handleSaveReport} disabled={!reportName.trim()} className="w-full">
            Save Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
