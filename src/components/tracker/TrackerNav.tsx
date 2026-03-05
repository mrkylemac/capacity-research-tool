'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavTab {
  label: string;
  href: string;
  soon?: boolean;
}

const TABS: NavTab[] = [
  { label: 'CapEx',    href: '/tracker' },
  { label: 'OpEx',     href: '/tracker/opex',    soon: true },
  { label: 'Pricing',  href: '/tracker/pricing',  soon: true },
];

export function TrackerNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-gray-2 mb-6">
      {TABS.map(tab => {
        const active = pathname === tab.href;
        return (
          <div key={tab.href} className="relative">
            {tab.soon ? (
              <button
                disabled
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-50"
              >
                {tab.label}
                <span className="text-xs bg-gray-2 text-muted-foreground px-1.5 py-0.5 rounded-full leading-none">
                  soon
                </span>
              </button>
            ) : (
              <Link
                href={tab.href}
                className={[
                  'flex items-center px-4 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'text-primary border-b-2 border-primary -mb-px'
                    : 'text-muted-foreground hover:text-fg-4',
                ].join(' ')}
              >
                {tab.label}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
