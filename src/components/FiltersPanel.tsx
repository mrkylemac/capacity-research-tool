import { useState } from 'react';
import { format, subMonths, subYears } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DateRange } from 'react-day-picker';
import { VENUES, type Platform } from '@/config/api';

const PRESETS = [
  { label: 'Last 1 month', from: () => subMonths(new Date(), 1), to: () => new Date() },
  { label: 'Last 3 months', from: () => subMonths(new Date(), 3), to: () => new Date() },
  { label: 'Last 6 months', from: () => subMonths(new Date(), 6), to: () => new Date() },
  { label: 'Last 12 months', from: () => subMonths(new Date(), 12), to: () => new Date() },
  { label: 'All time', from: () => subYears(new Date(), 10), to: () => new Date() },
] as const;

interface FiltersPanelProps {
  onFetchData: (hostId: string, fromDate: string, toDate: string, platform: Platform) => void;
  isLoading: boolean;
}

export function FiltersPanel({ onFetchData, isLoading }: FiltersPanelProps) {
  const [selectedVenue, setSelectedVenue] = useState<string>(VENUES[0].id);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });

  const handleVenueChange = (value: string) => {
    setSelectedVenue(value);
  };

  const handlePreset = (preset: typeof PRESETS[number]) => {
    setDateRange({ from: preset.from(), to: preset.to() });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue || !dateRange.from || !dateRange.to) return;

    onFetchData(
      selectedVenue,
      format(dateRange.from, 'yyyy-MM-dd'),
      format(dateRange.to, 'yyyy-MM-dd'),
      'momence'
    );
  };

  const dateLabel = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}`
    : 'Select dates';

  return (
    <form onSubmit={handleSubmit} className="notion-card mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Venue Selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Venue</Label>
          <Select value={selectedVenue} onValueChange={handleVenueChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent>
              {VENUES.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Picker with Presets */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="truncate">{dateLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
              <div className="flex flex-col sm:flex-row">
                <div className="flex sm:flex-col gap-1 sm:border-r border-b sm:border-b-0 p-3 overflow-x-auto">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="justify-start text-xs whitespace-nowrap"
                      onClick={() => handlePreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => range && setDateRange(range)}
                  numberOfMonths={1}
                  defaultMonth={dateRange.from}
                  className="sm:hidden"
                />
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => range && setDateRange(range)}
                  numberOfMonths={2}
                  defaultMonth={dateRange.from}
                  className="hidden sm:block"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Fetch Button */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground opacity-0">Action</Label>
          <Button
            type="submit"
            disabled={isLoading || !dateRange.from || !dateRange.to}
            className="w-full"
          >
            {isLoading ? 'Loading...' : 'Fetch Data'}
          </Button>
        </div>
      </div>
    </form>
  );
}
