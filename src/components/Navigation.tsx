import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', label: 'Numbers' },
] as const;

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="notion-page !py-0">
        <div className="flex h-14 items-center gap-6">
          <Link to="/" className="font-semibold">
          ♨️
          </Link>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-3 py-2 text-sm rounded-md transition-colors',
                  location.pathname === item.path
                    ? 'bg-muted font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
