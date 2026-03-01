import { useState } from 'react';
import type { OperatingHours } from '@/lib/benchmarkMetrics';
import { formatOperatingHours } from '@/lib/benchmarkMetrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface OperatingHoursOverrideProps {
  inferredHours: OperatingHours;
  onOverride: (hours: OperatingHours | null) => void;
  currentOverride: OperatingHours | null;
}

export function OperatingHoursOverride({
  inferredHours,
  onOverride,
  currentOverride,
}: OperatingHoursOverrideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayHours = currentOverride || inferredHours;

  const [weekdayStart, setWeekdayStart] = useState(displayHours.weekdayStart);
  const [weekdayEnd, setWeekdayEnd] = useState(displayHours.weekdayEnd);
  const [weekendStart, setWeekendStart] = useState(displayHours.weekendStart);
  const [weekendEnd, setWeekendEnd] = useState(displayHours.weekendEnd);

  const handleApply = () => {
    onOverride({
      weekdayStart,
      weekdayEnd,
      weekendStart,
      weekendEnd,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    onOverride(null);
    setWeekdayStart(inferredHours.weekdayStart);
    setWeekdayEnd(inferredHours.weekdayEnd);
    setWeekendStart(inferredHours.weekendStart);
    setWeekendEnd(inferredHours.weekendEnd);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-muted-foreground">Operating Hours: </span>
          <span className="font-medium">{formatOperatingHours(displayHours)}</span>
          {currentOverride && (
            <span className="text-md text-amber-600 ml-2">(overridden)</span>
          )}
          {!currentOverride && (
            <span className="text-md text-muted-foreground ml-2">(inferred)</span>
          )}
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-s">
            Adjust <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="mt-3">
        <div className="p-4 bg-muted/30 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-s">Weekday Start</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={weekdayStart}
                onChange={(e) => setWeekdayStart(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-s">Weekday End</Label>
              <Input
                type="number"
                min={0}
                max={24}
                value={weekdayEnd}
                onChange={(e) => setWeekdayEnd(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-s">Weekend Start</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={weekendStart}
                onChange={(e) => setWeekendStart(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-s">Weekend End</Label>
              <Input
                type="number"
                min={0}
                max={24}
                value={weekendEnd}
                onChange={(e) => setWeekendEnd(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleApply}>Apply</Button>
            {currentOverride && (
              <Button size="sm" variant="outline" onClick={handleReset}>
                Reset to Inferred
              </Button>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
