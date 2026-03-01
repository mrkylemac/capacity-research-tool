import type { ClassTypeData } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ClassTypeAnalysisProps {
  data: ClassTypeData[];
}

export function ClassTypeAnalysis({ data }: ClassTypeAnalysisProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-muted-foreground text-sm">No class type data available.</p>
        </CardContent>
      </Card>
    );
  }

  const totalVisitors = data.reduce((sum, d) => sum + d.totalVisitors, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-md text-muted-foreground mb-1">Class Types</p>
            <p className="text-xl font-semibold text-foreground">{data.length}</p>
            <p className="text-md text-muted-foreground">unique types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-md text-muted-foreground mb-1">Total Visitors</p>
            <p className="text-xl font-semibold text-foreground">{totalVisitors.toLocaleString()}</p>
            <p className="text-md text-muted-foreground">across all types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-md text-muted-foreground mb-1">Top Class</p>
            <p className="text-xl font-semibold text-foreground truncate" title={data[0]?.className}>
              {data[0]?.className || '-'}
            </p>
            <p className="text-md text-muted-foreground">{data[0]?.totalVisitors.toLocaleString() || 0} visitors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-md text-muted-foreground mb-1">Avg Utilisation</p>
            <p className="text-xl font-semibold text-foreground">
              {(data.reduce((sum, d) => sum + d.avgUtilisation, 0) / data.length).toFixed(1)}%
            </p>
            <p className="text-md text-muted-foreground">across types</p>
          </CardContent>
        </Card>
      </div>

      {/* Class Type Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Type</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Visitors</TableHead>
                <TableHead className="text-right">Avg/Session</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead className="text-right">Occupancy</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => {
                const sharePercent = totalVisitors > 0 ? (row.totalVisitors / totalVisitors) * 100 : 0;
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.className}</TableCell>
                    <TableCell className="text-right">{row.sessionCount}</TableCell>
                    <TableCell className="text-right font-semibold">{row.totalVisitors.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.avgVisitorsPerSession.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{row.totalCapacity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={
                          row.avgUtilisation >= 70 ? 'default' : 
                          row.avgUtilisation >= 40 ? 'secondary' : 
                          'outline'
                        }
                      >
                        {row.avgUtilisation.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{sharePercent.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
