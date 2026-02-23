module.exports = [
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn,
    "formatDecimalHour",
    ()=>formatDecimalHour,
    "logDataQuality",
    ()=>logDataQuality,
    "normalizeCapacity",
    ()=>normalizeCapacity,
    "sanitizeSessions",
    ()=>sanitizeSessions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
function formatDecimalHour(hour) {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60) % 60;
    const period = h >= 12 ? 'pm' : 'am';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const minStr = m > 0 ? `:${m.toString().padStart(2, '0')}` : '';
    return `${hour12}${minStr}${period}`;
}
function sanitizeSessions(sessions, operatingHoursBounds) {
    const report = {
        inputCount: sessions.length,
        outputCount: 0,
        dropped: {
            cancelled: 0,
            invalidDate: 0,
            zeroCapacity: 0,
            outsideOperatingHours: 0
        },
        clamped: {
            ticketsExceededCapacity: 0,
            capacityNormalized: 0
        }
    };
    const clean = sessions.reduce((acc, s)=>{
        // Drop cancelled sessions (Momence sets isCancelled; other platforms leave undefined)
        if (s.isCancelled) {
            report.dropped.cancelled++;
            return acc;
        }
        // Drop sessions with invalid/missing startsAt
        if (!s.startsAt || isNaN(new Date(s.startsAt).getTime())) {
            report.dropped.invalidDate++;
            return acc;
        }
        // Drop sessions with zero capacity (misconfigured / placeholder)
        if (s.capacity <= 0) {
            report.dropped.zeroCapacity++;
            return acc;
        }
        // Drop sessions outside operating hours (if bounds provided)
        if (operatingHoursBounds) {
            const startDate = new Date(s.startsAt);
            const startHour = startDate.getHours() + startDate.getMinutes() / 60;
            if (startHour < operatingHoursBounds.earliestStart || startHour > operatingHoursBounds.latestEnd) {
                report.dropped.outsideOperatingHours++;
                return acc;
            }
        }
        // Clamp ticketsSold to capacity (waitlist overflow / data quirk)
        if (s.ticketsSold > s.capacity) {
            report.clamped.ticketsExceededCapacity++;
            s = {
                ...s,
                ticketsSold: s.capacity
            };
        }
        acc.push(s);
        return acc;
    }, []);
    report.outputCount = clean.length;
    return {
        sessions: clean,
        report
    };
}
function normalizeCapacity(sessions, deviationThreshold = 0.5, applyNormalization = true) {
    if (sessions.length === 0) {
        return {
            sessions,
            normalizedCount: 0,
            modalCapacity: 0
        };
    }
    // Find modal capacity (most common value)
    const capacityCounts = new Map();
    sessions.forEach((s)=>{
        capacityCounts.set(s.capacity, (capacityCounts.get(s.capacity) || 0) + 1);
    });
    let modalCapacity = 0;
    let maxCount = 0;
    capacityCounts.forEach((count, capacity)=>{
        if (count > maxCount) {
            maxCount = count;
            modalCapacity = capacity;
        }
    });
    // Normalize sessions that deviate significantly from modal capacity
    let normalizedCount = 0;
    const normalized = sessions.map((s)=>{
        const deviation = Math.abs(s.capacity - modalCapacity) / modalCapacity;
        if (deviation > deviationThreshold) {
            normalizedCount++;
            if (applyNormalization) {
                return {
                    ...s,
                    capacity: modalCapacity
                };
            }
        }
        return s;
    });
    return {
        sessions: normalized,
        normalizedCount,
        modalCapacity
    };
}
function logDataQuality(label, report) {
    const { dropped, clamped } = report;
    const issues = dropped.cancelled + dropped.invalidDate + dropped.zeroCapacity + dropped.outsideOperatingHours + clamped.ticketsExceededCapacity + clamped.capacityNormalized;
    if (issues === 0) {
        console.log(`[${label}] ${report.outputCount} sessions — no data quality issues`);
        return;
    }
    console.warn(`[${label}] ${report.inputCount} → ${report.outputCount} sessions` + (dropped.cancelled ? ` | ${dropped.cancelled} dropped (cancelled)` : '') + (dropped.invalidDate ? ` | ${dropped.invalidDate} dropped (invalid date)` : '') + (dropped.zeroCapacity ? ` | ${dropped.zeroCapacity} dropped (zero capacity)` : '') + (dropped.outsideOperatingHours ? ` | ${dropped.outsideOperatingHours} dropped (outside hours)` : '') + (clamped.ticketsExceededCapacity ? ` | ${clamped.ticketsExceededCapacity} clamped (tickets > capacity)` : '') + (clamped.capacityNormalized ? ` | ${clamped.capacityNormalized} normalized (capacity variance)` : ''));
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/avatar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Avatar",
    ()=>Avatar,
    "AvatarFallback",
    ()=>AvatarFallback,
    "AvatarImage",
    ()=>AvatarImage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
function Avatar({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('relative inline-flex shrink-0 overflow-hidden rounded-xl bg-muted', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/avatar.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, this);
}
function AvatarImage({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('h-full w-full object-cover', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/avatar.tsx",
        lineNumber: 17,
        columnNumber: 10
    }, this);
}
function AvatarFallback({ className, children, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('flex h-full w-full items-center justify-center text-muted-foreground font-semibold', className),
        ...props,
        children: children
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/avatar.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "VenueHeader",
    ()=>VenueHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/format.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/parseISO.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/avatar.tsx [app-ssr] (ecmascript)");
;
;
;
function formatDateRange(from, to) {
    try {
        return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(from), 'MMM d, yyyy')} – ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(to), 'MMM d, yyyy')}`;
    } catch  {
        return `${from} – ${to}`;
    }
}
function occupancyColor(rate) {
    if (rate >= 0.7) return 'text-green-600';
    if (rate >= 0.4) return 'text-amber-600';
    return 'text-red-500';
}
function VenueHeader({ metrics, venueConfig, hostInfo, dateRange }) {
    const venueName = hostInfo?.name || venueConfig?.venueName || 'Venue';
    const initials = venueName.split(' ').map((w)=>w[0]).join('').slice(0, 2).toUpperCase();
    const location = hostInfo?.countryCode ?? null;
    const pills = [
        {
            label: 'Occupancy',
            value: `${(metrics.occupancyRate * 100).toFixed(1)}%`,
            valueClass: occupancyColor(metrics.occupancyRate)
        },
        {
            label: 'Weekly Visitors',
            value: Math.round(metrics.weeklyVisits).toLocaleString(),
            valueClass: 'text-foreground'
        },
        ...metrics.impliedArpv > 0 ? [
            {
                label: 'ARPV',
                value: `$${metrics.impliedArpv.toFixed(2)}`,
                valueClass: 'text-foreground'
            }
        ] : []
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col sm:flex-row sm:items-center gap-4 py-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-4 flex-1 min-w-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                        className: "h-14 w-14 shrink-0",
                        children: [
                            hostInfo?.profileImage && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                src: hostInfo.profileImage,
                                alt: venueName
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                                lineNumber: 55,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                                className: "text-lg",
                                children: initials
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                                lineNumber: 57,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-xl font-bold leading-tight truncate",
                                children: venueName
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                                lineNumber: 62,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-muted-foreground mt-0.5",
                                children: [
                                    location,
                                    dateRange && formatDateRange(dateRange.from, dateRange.to)
                                ].filter(Boolean).join(' · ')
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                                lineNumber: 63,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                        lineNumber: 61,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-px shrink-0",
                children: pills.map((pill, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `px-4 py-2 text-center ${i < pills.length - 1 ? 'border-r border-border' : ''}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: `text-lg font-bold tabular-nums leading-tight ${pill.valueClass}`,
                                children: pill.value
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                                lineNumber: 78,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-muted-foreground mt-0.5",
                                children: pill.label
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                                lineNumber: 81,
                                columnNumber: 13
                            }, this)
                        ]
                    }, pill.label, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                        lineNumber: 74,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
                lineNumber: 72,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardContent",
    ()=>CardContent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
function Card({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('rounded-xl border border-border bg-card text-card-foreground shadow-sm', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, this);
}
function CardContent({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('p-5', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx",
        lineNumber: 17,
        columnNumber: 10
    }, this);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PerformanceScorecard",
    ()=>PerformanceScorecard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx [app-ssr] (ecmascript)");
;
;
function OccupancyCard({ rate }) {
    const pct = rate * 100;
    const color = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500';
    const sublabel = pct >= 70 ? 'Sessions filling well' : pct >= 40 ? 'Consistent, with room to grow' : 'Significant capacity still available';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
            className: "p-5",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs text-muted-foreground uppercase tracking-wider mb-3",
                    children: "Occupancy"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                    lineNumber: 18,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: `text-4xl font-bold tabular-nums tracking-tight ${color}`,
                    children: [
                        pct.toFixed(1),
                        "%"
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                    lineNumber: 19,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs text-muted-foreground mt-2",
                    children: sublabel
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                    lineNumber: 22,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
            lineNumber: 17,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
function PerformanceScorecard({ metrics }) {
    const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
    const weeklyRevenue = metrics.weeklyVisits * metrics.impliedArpv;
    const revenueCeiling = sessionsPerWeek * metrics.avgCapacityPerSession * metrics.impliedArpv;
    const ceilingCaptured = revenueCeiling > 0 ? weeklyRevenue / revenueCeiling * 100 : 0;
    const hasRevenue = metrics.impliedArpv > 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-2 md:grid-cols-4 gap-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(OccupancyCard, {
                rate: metrics.occupancyRate
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-muted-foreground uppercase tracking-wider mb-3",
                            children: "Weekly Visitors"
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                            lineNumber: 41,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-4xl font-bold tabular-nums tracking-tight",
                            children: Math.round(metrics.weeklyVisits).toLocaleString()
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                            lineNumber: 42,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-muted-foreground mt-2",
                            children: [
                                metrics.totalVisits.toLocaleString(),
                                " total over ",
                                Math.round(metrics.weeksInRange),
                                " weeks"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                            lineNumber: 45,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                    lineNumber: 40,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, this),
            hasRevenue ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                            className: "p-5",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-muted-foreground uppercase tracking-wider mb-3",
                                    children: "Weekly Revenue"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                                    lineNumber: 55,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-4xl font-bold tabular-nums tracking-tight",
                                    children: [
                                        "$",
                                        Math.round(weeklyRevenue).toLocaleString()
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                                    lineNumber: 56,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-muted-foreground mt-2",
                                    children: [
                                        "$",
                                        metrics.impliedArpv.toFixed(2),
                                        " per visitor"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                                    lineNumber: 59,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                            lineNumber: 54,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                        lineNumber: 53,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                            className: "p-5",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-muted-foreground uppercase tracking-wider mb-3",
                                    children: "Revenue ceiling"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                                    lineNumber: 67,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-4xl font-bold tabular-nums tracking-tight",
                                    children: [
                                        "$",
                                        Math.round(revenueCeiling).toLocaleString()
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                                    lineNumber: 68,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-muted-foreground mt-2",
                                    children: [
                                        (100 - ceilingCaptured).toFixed(0),
                                        "% headroom remaining"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                                    lineNumber: 71,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                            lineNumber: 66,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                        lineNumber: 65,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                className: "col-span-2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-5 flex items-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground",
                        children: "No pricing data — revenue estimates not available"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                        lineNumber: 80,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                    lineNumber: 79,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
                lineNumber: 78,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/benchmarkMetrics.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateBenchmarkMetrics",
    ()=>calculateBenchmarkMetrics,
    "formatOperatingHours",
    ()=>formatOperatingHours,
    "inferOperatingHours",
    ()=>inferOperatingHours
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/parseISO.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getDay.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getHours.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getMinutes.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$differenceInDays$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/differenceInDays.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
/**
 * Calculate percentile value from sorted array
 */ function percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [
        ...arr
    ].sort((a, b)=>a - b);
    const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)));
    return sorted[index];
}
/**
 * Round to nearest half hour for clean display
 */ function roundToHalfHour(hour, roundUp) {
    const rounded = roundUp ? Math.ceil(hour * 2) / 2 : Math.floor(hour * 2) / 2;
    return rounded;
}
function inferOperatingHours(sessions) {
    const weekdayStartTimes = [];
    const weekdayEndTimes = [];
    const weekendStartTimes = [];
    const weekendEndTimes = [];
    sessions.forEach((session)=>{
        const startDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(session.startsAt);
        const startHour = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getHours"])(startDate) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMinutes"])(startDate) / 60;
        // Use session duration to calculate actual end time
        const endHour = startHour + (session.durationMinutes || 60) / 60;
        const dayOfWeek = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDay"])(startDate);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend) {
            weekendStartTimes.push(startHour);
            weekendEndTimes.push(endHour);
        } else {
            weekdayStartTimes.push(startHour);
            weekdayEndTimes.push(endHour);
        }
    });
    // Use percentile-based bounds (5th/95th) to drop outliers, then round to half-hour
    const safePercentileMin = (arr, defaultHour = 6)=>{
        if (arr.length === 0) return defaultHour;
        const p5 = percentile(arr, 0.05);
        return roundToHalfHour(p5, false); // Round down for start times
    };
    const safePercentileMax = (arr, defaultHour = 21)=>{
        if (arr.length === 0) return defaultHour;
        const p95 = percentile(arr, 0.95);
        return roundToHalfHour(p95, true); // Round up for end times
    };
    return {
        weekdayStart: safePercentileMin(weekdayStartTimes, 6),
        weekdayEnd: safePercentileMax(weekdayEndTimes, 21),
        weekendStart: safePercentileMin(weekendStartTimes, 6),
        weekendEnd: safePercentileMax(weekendEndTimes, 21)
    };
}
/**
 * Calculate weekly open hours from operating hours
 */ function calculateWeeklyOpenHours(hours) {
    const weekdayHours = (hours.weekdayEnd - hours.weekdayStart) * 5;
    const weekendHours = (hours.weekendEnd - hours.weekendStart) * 2;
    return weekdayHours + weekendHours;
}
function calculateBenchmarkMetrics(sessions, fromDate, toDate, operatingHoursOverride) {
    const from = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(fromDate);
    const to = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(toDate);
    const daysInRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$differenceInDays$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["differenceInDays"])(to, from) + 1;
    // Use fractional weeks for accuracy instead of truncated integer
    // e.g. 10 days = 1.43 weeks, not 2 weeks (which would halve weeklyVisits)
    const weeksInRange = Math.max(1, daysInRange / 7);
    // Volume
    const totalVisits = sessions.reduce((sum, s)=>sum + s.ticketsSold, 0);
    const weeklyVisits = totalVisits / weeksInRange;
    const dailyVisits = totalVisits / daysInRange;
    // Capacity
    const totalSessions = sessions.length;
    const totalCapacity = sessions.reduce((sum, s)=>sum + s.capacity, 0);
    const occupancyRate = totalCapacity > 0 ? totalVisits / totalCapacity : 0;
    const avgVisitorsPerSession = totalSessions > 0 ? totalVisits / totalSessions : 0;
    const avgCapacityPerSession = totalSessions > 0 ? totalCapacity / totalSessions : 0;
    // Operating hours
    const operatingHours = operatingHoursOverride || inferOperatingHours(sessions);
    const weeklyOpenHours = calculateWeeklyOpenHours(operatingHours);
    const visitsPerOpenHour = weeklyOpenHours > 0 ? weeklyVisits / weeklyOpenHours : 0;
    // Weekday vs Weekend
    let weekdayVisits = 0;
    let weekendVisits = 0;
    sessions.forEach((session)=>{
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(session.startsAt);
        const dayOfWeek = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDay"])(date);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend) {
            weekendVisits += session.ticketsSold;
        } else {
            weekdayVisits += session.ticketsSold;
        }
    });
    const weekdayShare = totalVisits > 0 ? weekdayVisits / totalVisits : 0;
    const weekendShare = totalVisits > 0 ? weekendVisits / totalVisits : 0;
    // Pricing
    const pricesWithVolume = sessions.filter((s)=>s.fixedTicketPrice > 0 && s.ticketsSold > 0).map((s)=>({
            price: s.fixedTicketPrice,
            volume: s.ticketsSold
        }));
    const totalPriceVolume = pricesWithVolume.reduce((sum, p)=>sum + p.price * p.volume, 0);
    const totalVolume = pricesWithVolume.reduce((sum, p)=>sum + p.volume, 0);
    const avgPrice = sessions.length > 0 ? sessions.reduce((sum, s)=>sum + s.fixedTicketPrice, 0) / sessions.length : 0;
    const impliedArpv = totalVolume > 0 ? totalPriceVolume / totalVolume : avgPrice;
    return {
        totalVisits,
        weeklyVisits,
        dailyVisits,
        totalSessions,
        totalCapacity,
        occupancyRate,
        avgVisitorsPerSession,
        avgCapacityPerSession,
        operatingHours,
        weeklyOpenHours,
        visitsPerOpenHour,
        weekdayVisits,
        weekendVisits,
        weekdayShare,
        weekendShare,
        daysInRange,
        weeksInRange,
        avgPrice,
        impliedArpv
    };
}
function formatOperatingHours(hours) {
    const weekday = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDecimalHour"])(hours.weekdayStart)}–${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDecimalHour"])(hours.weekdayEnd)}`;
    const weekend = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDecimalHour"])(hours.weekendStart)}–${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDecimalHour"])(hours.weekendEnd)}`;
    if (weekday === weekend) {
        return weekday;
    }
    return `Weekdays ${weekday}, Weekends ${weekend}`;
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/OperationalBlueprint.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OperationalBlueprint",
    ()=>OperationalBlueprint
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$benchmarkMetrics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/benchmarkMetrics.ts [app-ssr] (ecmascript)");
;
;
function OperationalBlueprint({ metrics, venueConfig }) {
    const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
    const items = [
        ...venueConfig?.duration ? [
            {
                label: 'Duration',
                value: `${venueConfig.duration} min`
            }
        ] : [],
        ...venueConfig?.price ? [
            {
                label: 'Ticket price',
                value: `$${venueConfig.price}`
            }
        ] : [],
        {
            label: 'Seats per session',
            value: `${metrics.avgCapacityPerSession.toFixed(0)}`
        },
        {
            label: 'Sessions/week',
            value: sessionsPerWeek.toFixed(1)
        },
        {
            label: 'Open hours/week',
            value: `${metrics.weeklyOpenHours.toFixed(0)} hrs`
        },
        {
            label: 'Hours',
            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$benchmarkMetrics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatOperatingHours"])(metrics.operatingHours)
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "border border-border rounded-lg px-5 py-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3",
                children: "How they operate"
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/OperationalBlueprint.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap gap-x-8 gap-y-3",
                children: items.map(({ label, value })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-muted-foreground",
                                children: label
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/OperationalBlueprint.tsx",
                                lineNumber: 35,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm font-semibold mt-0.5",
                                children: value
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/OperationalBlueprint.tsx",
                                lineNumber: 36,
                                columnNumber: 13
                            }, this)
                        ]
                    }, label, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/OperationalBlueprint.tsx",
                        lineNumber: 34,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/OperationalBlueprint.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/OperationalBlueprint.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, this);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/metricsCalculator.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateClassTypeData",
    ()=>calculateClassTypeData,
    "calculateDemandPatterns",
    ()=>calculateDemandPatterns,
    "calculateMetrics",
    ()=>calculateMetrics,
    "calculateMonthlyData",
    ()=>calculateMonthlyData,
    "calculateVenueConfig",
    ()=>calculateVenueConfig,
    "generateTimeSlots",
    ()=>generateTimeSlots
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/format.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/parseISO.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$differenceInDays$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/differenceInDays.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$startOfMonth$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/startOfMonth.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getHours.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getMinutes.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
function calculateMetrics(sessions, fromDate, toDate) {
    if (sessions.length === 0) {
        return {
            totalSessions: 0,
            totalTicketsSold: 0,
            totalCapacity: 0,
            avgUtilisation: 0,
            totalRevenue: 0,
            avgRevenuePerVisit: 0,
            avgRevenuePerSession: 0,
            sessionsPerDay: 0,
            sessionsPerWeek: 0,
            operatingSince: '-'
        };
    }
    const totalSessions = sessions.length;
    const totalTicketsSold = sessions.reduce((sum, s)=>sum + s.ticketsSold, 0);
    const totalCapacity = sessions.reduce((sum, s)=>sum + s.capacity, 0);
    const avgUtilisation = totalCapacity > 0 ? totalTicketsSold / totalCapacity * 100 : 0;
    const totalRevenue = sessions.reduce((sum, s)=>sum + s.ticketsSold * s.fixedTicketPrice, 0);
    const avgRevenuePerVisit = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;
    const avgRevenuePerSession = totalSessions > 0 ? totalRevenue / totalSessions : 0;
    const daysDiff = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$differenceInDays$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["differenceInDays"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(toDate), (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(fromDate)) + 1;
    const sessionsPerDay = daysDiff > 0 ? totalSessions / daysDiff : 0;
    const sessionsPerWeek = sessionsPerDay * 7;
    const sortedSessions = [
        ...sessions
    ].sort((a, b)=>new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const operatingSince = sortedSessions.length > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(sortedSessions[0].startsAt), 'MMMM yyyy') : '-';
    return {
        totalSessions,
        totalTicketsSold,
        totalCapacity,
        avgUtilisation,
        totalRevenue,
        avgRevenuePerVisit,
        avgRevenuePerSession,
        sessionsPerDay,
        sessionsPerWeek,
        operatingSince
    };
}
function calculateMonthlyData(sessions) {
    const monthlyMap = new Map();
    sessions.forEach((session)=>{
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(session.startsAt);
        const monthKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$startOfMonth$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["startOfMonth"])(date), 'yyyy-MM');
        if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, {
                sessions: []
            });
        }
        monthlyMap.get(monthKey).sessions.push(session);
    });
    const monthlyData = [];
    monthlyMap.forEach((data, key)=>{
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(key + '-01');
        const sessionsCount = data.sessions.length;
        const ticketsSold = data.sessions.reduce((sum, s)=>sum + s.ticketsSold, 0);
        const capacity = data.sessions.reduce((sum, s)=>sum + s.capacity, 0);
        const utilisation = capacity > 0 ? ticketsSold / capacity * 100 : 0;
        const revenue = data.sessions.reduce((sum, s)=>sum + s.ticketsSold * s.fixedTicketPrice, 0);
        monthlyData.push({
            month: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(date, 'MMMM'),
            year: date.getFullYear(),
            sessions: sessionsCount,
            ticketsSold,
            capacity,
            utilisation,
            revenue
        });
    });
    return monthlyData.sort((a, b)=>{
        if (a.year !== b.year) return a.year - b.year;
        return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth();
    });
}
/**
 * Default time slots for demand analysis (used as fallback)
 */ const DEFAULT_TIME_SLOTS = [
    {
        label: '4:30 – 6:30am',
        start: 4.5,
        end: 6.5
    },
    {
        label: '6:30 – 8:30am',
        start: 6.5,
        end: 8.5
    },
    {
        label: '8:30 – 10:30am',
        start: 8.5,
        end: 10.5
    },
    {
        label: '10:30am – 12:30pm',
        start: 10.5,
        end: 12.5
    },
    {
        label: '12:30 – 2:30pm',
        start: 12.5,
        end: 14.5
    },
    {
        label: '2:30 – 4:30pm',
        start: 14.5,
        end: 16.5
    },
    {
        label: '4:30 – 6:30pm',
        start: 16.5,
        end: 18.5
    },
    {
        label: '6:30 – 8:30pm',
        start: 18.5,
        end: 20.5
    },
    {
        label: '8:30 – 10:30pm',
        start: 20.5,
        end: 22.5
    }
];
function generateTimeSlots(operatingHours, slotDuration = 2) {
    // Use the earlier start and later end across weekday/weekend
    const earliestStart = Math.min(operatingHours.weekdayStart, operatingHours.weekendStart);
    const latestEnd = Math.max(operatingHours.weekdayEnd, operatingHours.weekendEnd);
    // Round down start to nearest half hour, round up end to nearest half hour
    const start = Math.floor(earliestStart * 2) / 2;
    const end = Math.ceil(latestEnd * 2) / 2;
    const slots = [];
    for(let slotStart = start; slotStart < end; slotStart += slotDuration){
        const slotEnd = Math.min(slotStart + slotDuration, end);
        const label = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDecimalHour"])(slotStart)} – ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDecimalHour"])(slotEnd)}`;
        slots.push({
            label,
            start: slotStart,
            end: slotEnd
        });
    }
    return slots.length > 0 ? slots : DEFAULT_TIME_SLOTS;
}
function calculateDemandPatterns(sessions, timeSlots) {
    const slots = timeSlots || DEFAULT_TIME_SLOTS;
    const slotData = new Map();
    slots.forEach((slot)=>{
        slotData.set(slot.label, {
            tickets: [],
            capacities: []
        });
    });
    sessions.forEach((session)=>{
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(session.startsAt);
        const hours = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getHours"])(date) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMinutes"])(date) / 60;
        for (const slot of slots){
            if (hours >= slot.start && hours < slot.end) {
                const data = slotData.get(slot.label);
                data.tickets.push(session.ticketsSold);
                data.capacities.push(session.capacity);
                break;
            }
        }
    });
    const results = [];
    slotData.forEach((data, slot)=>{
        if (data.tickets.length > 0) {
            const avgTickets = data.tickets.reduce((a, b)=>a + b, 0) / data.tickets.length;
            const avgCapacity = data.capacities.reduce((a, b)=>a + b, 0) / data.capacities.length;
            const utilisation = avgCapacity > 0 ? avgTickets / avgCapacity * 100 : 0;
            let utilisationBand;
            if (utilisation >= 70) utilisationBand = 'High';
            else if (utilisation >= 40) utilisationBand = 'Medium';
            else utilisationBand = 'Low';
            results.push({
                slot,
                avgTickets: Math.round(avgTickets * 10) / 10,
                capacity: Math.round(avgCapacity),
                utilisation: Math.round(utilisation * 10) / 10,
                utilisationBand
            });
        }
    });
    return results;
}
function calculateVenueConfig(sessions, fromDate, toDate) {
    if (sessions.length === 0) {
        return {
            venueName: '-',
            sessionType: 'Sauna & Ice',
            duration: 60,
            price: 35,
            capacity: 12,
            sessionsPerDay: 0,
            operatingHours: '-'
        };
    }
    // Get venue name from location
    const locations = sessions.map((s)=>s.location).filter((l)=>l);
    const venueName = getMostCommon(locations) || 'Unknown Venue';
    // Get most common values
    const sessionTypes = sessions.map((s)=>s.sessionName);
    const sessionType = getMostCommon(sessionTypes) || 'Sauna & Ice';
    const durations = sessions.map((s)=>s.durationMinutes);
    const duration = getMostCommon(durations) || 60;
    const prices = sessions.map((s)=>s.fixedTicketPrice);
    const price = getMostCommon(prices) || 35;
    const capacities = sessions.map((s)=>s.capacity);
    const capacity = getMostCommon(capacities) || 12;
    const daysDiff = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$differenceInDays$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["differenceInDays"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(toDate), (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(fromDate)) + 1;
    const sessionsPerDay = daysDiff > 0 ? Math.round(sessions.length / daysDiff * 10) / 10 : 0;
    // Find operating hours using session start and end times
    const startTimes = sessions.map((s)=>{
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(s.startsAt);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getHours"])(date) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMinutes"])(date) / 60;
    });
    const endTimes = sessions.map((s)=>{
        const startDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(s.startsAt);
        const startHour = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getHours"])(startDate) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMinutes"])(startDate) / 60;
        return startHour + (s.durationMinutes || 60) / 60;
    });
    const minTime = Math.min(...startTimes);
    const maxTime = Math.max(...endTimes);
    const operatingHours = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDecimalHour"])(minTime)} – ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDecimalHour"])(maxTime)}`;
    return {
        venueName,
        sessionType,
        duration,
        price,
        capacity,
        sessionsPerDay,
        operatingHours
    };
}
function getMostCommon(arr) {
    const counts = new Map();
    arr.forEach((item)=>{
        counts.set(item, (counts.get(item) || 0) + 1);
    });
    let maxCount = 0;
    let maxItem;
    counts.forEach((count, item)=>{
        if (count > maxCount) {
            maxCount = count;
            maxItem = item;
        }
    });
    return maxItem;
}
function calculateClassTypeData(sessions) {
    const classMap = new Map();
    sessions.forEach((session)=>{
        const className = session.sessionName || 'Unknown';
        if (!classMap.has(className)) {
            classMap.set(className, []);
        }
        classMap.get(className).push(session);
    });
    const results = [];
    classMap.forEach((classSessions, className)=>{
        const sessionCount = classSessions.length;
        const totalVisitors = classSessions.reduce((sum, s)=>sum + s.ticketsSold, 0);
        const totalCapacity = classSessions.reduce((sum, s)=>sum + s.capacity, 0);
        const avgUtilisation = totalCapacity > 0 ? totalVisitors / totalCapacity * 100 : 0;
        const totalRevenue = classSessions.reduce((sum, s)=>sum + s.ticketsSold * s.fixedTicketPrice, 0);
        results.push({
            className,
            sessionCount,
            totalVisitors,
            avgVisitorsPerSession: sessionCount > 0 ? totalVisitors / sessionCount : 0,
            totalCapacity,
            avgUtilisation,
            totalRevenue
        });
    });
    // Sort by total visitors descending
    return results.sort((a, b)=>b.totalVisitors - a.totalVisitors);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/badge.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Badge",
    ()=>Badge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
function Badge({ className, variant = 'neutral', ...props }) {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    const styles = variant === 'brand' ? 'bg-primary/10 text-primary' : variant === 'success' ? 'bg-green-500/10 text-green-700' : variant === 'warning' ? 'bg-amber-500/10 text-amber-700' : 'bg-muted text-muted-foreground';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(base, styles, className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/badge.tsx",
        lineNumber: 19,
        columnNumber: 10
    }, this);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/disclosure.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Disclosure",
    ()=>Disclosure,
    "DisclosurePanel",
    ()=>DisclosurePanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
function Disclosure({ className, defaultOpen, summary, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("details", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('group', className),
        defaultOpen: defaultOpen,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("summary", {
                className: "list-none cursor-pointer select-none",
                children: summary
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/disclosure.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-2",
                children: children
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/disclosure.tsx",
                lineNumber: 20,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/disclosure.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
function DisclosurePanel({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('rounded-lg border border-border bg-muted/10 p-3', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/disclosure.tsx",
        lineNumber: 26,
        columnNumber: 10
    }, this);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DemandIntelligence",
    ()=>DemandIntelligence
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/parseISO.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getHours.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getMinutes.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getDay.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$metricsCalculator$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/metricsCalculator.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/badge.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$disclosure$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/disclosure.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-ssr] (ecmascript) <export default as ChevronDown>");
;
;
;
;
;
;
;
;
function buildSlotSummaries(sessions, hours, weekend) {
    const timeSlots = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$metricsCalculator$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["generateTimeSlots"])(hours);
    const slotMap = new Map();
    timeSlots.forEach((s)=>slotMap.set(s.label, {
            tickets: [],
            capacities: []
        }));
    sessions.filter((s)=>{
        const day = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDay"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(s.startsAt));
        return weekend ? day === 0 || day === 6 : day >= 1 && day <= 5;
    }).forEach((s)=>{
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(s.startsAt);
        const h = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getHours"])(date) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMinutes"])(date) / 60;
        for (const slot of timeSlots){
            if (h >= slot.start && h < slot.end) {
                const data = slotMap.get(slot.label);
                data.tickets.push(s.ticketsSold);
                data.capacities.push(s.capacity);
                break;
            }
        }
    });
    const results = [];
    slotMap.forEach((data, slot)=>{
        if (data.tickets.length === 0) return;
        const avgTickets = data.tickets.reduce((a, b)=>a + b, 0) / data.tickets.length;
        const avgCap = data.capacities.reduce((a, b)=>a + b, 0) / data.capacities.length;
        results.push({
            slot,
            utilisation: avgCap > 0 ? avgTickets / avgCap * 100 : 0,
            sessionCount: data.tickets.length
        });
    });
    return results.sort((a, b)=>b.utilisation - a.utilisation);
}
function DaySplitBar({ label, share, visitors, isWeekend }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-between text-sm mb-1.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-muted-foreground",
                        children: label
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                        lineNumber: 74,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-medium",
                        children: [
                            (share * 100).toFixed(0),
                            "%"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                        lineNumber: 75,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "h-2 bg-muted rounded-full overflow-hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: `h-full rounded-full ${isWeekend ? 'bg-blue-500' : 'bg-primary'}`,
                    style: {
                        width: `${share * 100}%`
                    }
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                    lineNumber: 78,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                lineNumber: 77,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-muted-foreground mt-1",
                children: [
                    visitors.toLocaleString(),
                    " visitors"
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
        lineNumber: 72,
        columnNumber: 5
    }, this);
}
function PeakSlotList({ slots, title }) {
    const top3 = slots.slice(0, 3);
    const rest = slots.slice(3);
    const max = top3[0]?.utilisation ?? 0;
    if (top3.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs font-medium text-muted-foreground mb-2",
                    children: title
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                    lineNumber: 96,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs text-muted-foreground",
                    children: "No sessions found"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                    lineNumber: 97,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
            lineNumber: 95,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs font-medium text-muted-foreground mb-3",
                children: title
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                lineNumber: 104,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2",
                children: top3.map((s, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-muted-foreground w-4 shrink-0",
                                children: i + 1
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                lineNumber: 108,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between items-center mb-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs font-medium truncate",
                                                children: s.slot
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                                lineNumber: 111,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                                variant: s.utilisation >= 70 ? 'success' : s.utilisation >= 40 ? 'warning' : 'neutral',
                                                className: "text-xs ml-2 shrink-0",
                                                children: [
                                                    s.utilisation.toFixed(0),
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                                lineNumber: 112,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                        lineNumber: 110,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "h-1.5 bg-muted rounded-full overflow-hidden",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "h-full bg-primary rounded-full",
                                            style: {
                                                width: `${max > 0 ? s.utilisation / max * 100 : 0}%`
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                            lineNumber: 120,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                        lineNumber: 119,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                lineNumber: 109,
                                columnNumber: 13
                            }, this)
                        ]
                    }, s.slot, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                        lineNumber: 107,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                lineNumber: 105,
                columnNumber: 7
            }, this),
            rest.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$disclosure$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Disclosure"], {
                className: "mt-3",
                summary: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                            className: "h-3 w-3 transition-transform group-open:rotate-180"
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                            lineNumber: 135,
                            columnNumber: 15
                        }, void 0),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: [
                                "+",
                                rest.length,
                                " more"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                            lineNumber: 136,
                            columnNumber: 15
                        }, void 0)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                    lineNumber: 134,
                    columnNumber: 13
                }, void 0),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-2 mt-2",
                    children: rest.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs text-muted-foreground w-4 shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                    lineNumber: 143,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 min-w-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-between items-center mb-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs text-muted-foreground truncate",
                                                    children: s.slot
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                                    lineNumber: 146,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs text-muted-foreground ml-2 shrink-0",
                                                    children: [
                                                        s.utilisation.toFixed(0),
                                                        "%"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                                    lineNumber: 147,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                            lineNumber: 145,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "h-1.5 bg-muted rounded-full overflow-hidden",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "h-full bg-muted-foreground/30 rounded-full",
                                                style: {
                                                    width: `${max > 0 ? s.utilisation / max * 100 : 0}%`
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                                lineNumber: 152,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                            lineNumber: 151,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                    lineNumber: 144,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, s.slot, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                            lineNumber: 142,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                    lineNumber: 140,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                lineNumber: 131,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
        lineNumber: 103,
        columnNumber: 5
    }, this);
}
function DemandIntelligence({ sessions, metrics }) {
    const { weekdaySlots, weekendSlots } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            weekdaySlots: buildSlotSummaries(sessions, metrics.operatingHours, false),
            weekendSlots: buildSlotSummaries(sessions, metrics.operatingHours, true)
        }), [
        sessions,
        metrics.operatingHours
    ]);
    if (sessions.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-1 md:grid-cols-3 gap-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4",
                            children: "Day split"
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                            lineNumber: 180,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DaySplitBar, {
                                    label: "Weekday",
                                    share: metrics.weekdayShare,
                                    visitors: metrics.weekdayVisits,
                                    isWeekend: false
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                    lineNumber: 184,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DaySplitBar, {
                                    label: "Weekend",
                                    share: metrics.weekendShare,
                                    visitors: metrics.weekendVisits,
                                    isWeekend: true
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                                    lineNumber: 190,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                            lineNumber: 183,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-muted-foreground mt-4 pt-3 border-t",
                            children: metrics.weekendShare > 0.55 ? 'Weekend-heavy. Most visits happen Sat–Sun.' : metrics.weekdayShare > 0.55 ? 'Weekday-heavy. Strong Mon–Fri base.' : 'Balanced across the week.'
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                            lineNumber: 197,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                    lineNumber: 179,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                lineNumber: 178,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-5",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PeakSlotList, {
                        slots: weekdaySlots,
                        title: "Top weekday slots"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                        lineNumber: 210,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                    lineNumber: 209,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                lineNumber: 208,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-5",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PeakSlotList, {
                        slots: weekendSlots,
                        title: "Top weekend slots"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                        lineNumber: 217,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                    lineNumber: 216,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
                lineNumber: 215,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx",
        lineNumber: 176,
        columnNumber: 5
    }, this);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GrowthStory",
    ()=>GrowthStory
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$AreaChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/chart/AreaChart.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/cartesian/Area.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/cartesian/XAxis.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/cartesian/YAxis.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/cartesian/CartesianGrid.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/component/Tooltip.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/component/ResponsiveContainer.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$ReferenceLine$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/cartesian/ReferenceLine.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx [app-ssr] (ecmascript)");
;
;
;
;
function analyzeGrowth(data) {
    if (data.length === 0) return {
        peakMonth: '',
        growthRate: 0,
        rampUpMonths: 0
    };
    const sorted = [
        ...data
    ].sort((a, b)=>{
        if (a.year !== b.year) return a.year - b.year;
        return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth();
    });
    const peak = sorted.reduce((best, m)=>m.ticketsSold > best.ticketsSold ? m : best);
    const peakMonth = `${peak.month} ${peak.year}`;
    const n = Math.min(3, sorted.length);
    const firstAvg = sorted.slice(0, n).reduce((s, m)=>s + m.ticketsSold, 0) / n;
    const lastAvg = sorted.slice(-n).reduce((s, m)=>s + m.ticketsSold, 0) / n;
    const growthRate = firstAvg > 0 ? (lastAvg - firstAvg) / firstAvg * 100 : 0;
    const peakVisitors = Math.max(...data.map((m)=>m.ticketsSold));
    const threshold = peakVisitors * 0.8;
    let rampUpMonths = 0;
    for (const m of sorted){
        if (m.ticketsSold >= threshold) break;
        rampUpMonths++;
    }
    return {
        peakMonth,
        growthRate,
        rampUpMonths
    };
}
function GrowthStory({ monthlyData }) {
    const analysis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>analyzeGrowth(monthlyData), [
        monthlyData
    ]);
    const chartData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>monthlyData.map((m)=>({
                name: `${m.month.slice(0, 3)} '${m.year.toString().slice(-2)}`,
                visitors: m.ticketsSold
            })), [
        monthlyData
    ]);
    if (monthlyData.length < 2) return null;
    const activeMonths = monthlyData.filter((m)=>m.ticketsSold > 0);
    const avgVisitors = activeMonths.length > 0 ? activeMonths.reduce((s, m)=>s + m.ticketsSold, 0) / activeMonths.length : 0;
    const { peakMonth, growthRate, rampUpMonths } = analysis;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-muted-foreground mb-4",
                            children: "Visitors per month"
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                            lineNumber: 76,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-52",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                                width: "100%",
                                height: "100%",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$AreaChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AreaChart"], {
                                    data: chartData,
                                    margin: {
                                        top: 8,
                                        right: 8,
                                        left: -24,
                                        bottom: 0
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                                                id: "growthVisitorsGradient",
                                                x1: "0",
                                                y1: "0",
                                                x2: "0",
                                                y2: "1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                                        offset: "5%",
                                                        stopColor: "hsl(var(--primary))",
                                                        stopOpacity: 0.25
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                                        lineNumber: 82,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                                        offset: "95%",
                                                        stopColor: "hsl(var(--primary))",
                                                        stopOpacity: 0
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                                        lineNumber: 83,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                                lineNumber: 81,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                            lineNumber: 80,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                            strokeDasharray: "3 3",
                                            stroke: "hsl(0 0% 90%)"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                            lineNumber: 86,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                                            dataKey: "name",
                                            tick: {
                                                fill: 'hsl(0 0% 45%)',
                                                fontSize: 11
                                            },
                                            axisLine: {
                                                stroke: 'hsl(0 0% 90%)'
                                            },
                                            tickLine: false
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                            lineNumber: 87,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                                            tick: {
                                                fill: 'hsl(0 0% 45%)',
                                                fontSize: 11
                                            },
                                            axisLine: false,
                                            tickLine: false
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                            lineNumber: 93,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                            contentStyle: {
                                                backgroundColor: 'hsl(0 0% 100%)',
                                                border: '1px solid hsl(0 0% 90%)',
                                                borderRadius: '6px',
                                                fontSize: 12
                                            },
                                            formatter: (v)=>[
                                                    v.toLocaleString(),
                                                    'Visitors'
                                                ]
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                            lineNumber: 98,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$ReferenceLine$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ReferenceLine"], {
                                            y: avgVisitors,
                                            stroke: "hsl(0 0% 60%)",
                                            strokeDasharray: "5 5",
                                            label: {
                                                value: 'avg',
                                                position: 'right',
                                                fontSize: 10,
                                                fill: 'hsl(0 0% 60%)'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                            lineNumber: 107,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Area"], {
                                            type: "monotone",
                                            dataKey: "visitors",
                                            stroke: "hsl(var(--primary))",
                                            strokeWidth: 2,
                                            fill: "url(#growthVisitorsGradient)"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                            lineNumber: 113,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                    lineNumber: 79,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                lineNumber: 78,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                            lineNumber: 77,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                    lineNumber: 75,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-3 gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border border-border rounded-lg px-4 py-3 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-muted-foreground",
                                children: "Strongest month"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                lineNumber: 129,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm font-semibold mt-1",
                                children: peakMonth || '—'
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                lineNumber: 130,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                        lineNumber: 128,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border border-border rounded-lg px-4 py-3 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-muted-foreground",
                                children: "Visitor growth"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                lineNumber: 133,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: `text-sm font-semibold mt-1 ${growthRate >= 0 ? 'text-green-600' : 'text-red-500'}`,
                                children: [
                                    growthRate >= 0 ? '+' : '',
                                    growthRate.toFixed(0),
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                lineNumber: 134,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                        lineNumber: 132,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border border-border rounded-lg px-4 py-3 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-muted-foreground",
                                children: "Time to peak"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                lineNumber: 139,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm font-semibold mt-1",
                                children: rampUpMonths === 0 ? 'From launch' : `${rampUpMonths} months`
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                                lineNumber: 140,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                        lineNumber: 138,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
                lineNumber: 127,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx",
        lineNumber: 73,
        columnNumber: 5
    }, this);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/button.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
function Button({ className, variant = 'primary', size = 'md', type = 'button', ...props }) {
    const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';
    const sizes = size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm';
    const styles = variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : variant === 'secondary' ? 'bg-muted text-foreground hover:bg-muted/70' : variant === 'outline' ? 'border border-border bg-background hover:bg-muted/40' : 'hover:bg-muted/40';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: type,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(base, sizes, styles, className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/button.tsx",
        lineNumber: 30,
        columnNumber: 10
    }, this);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MonthlyTable",
    ()=>MonthlyTable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/parseISO.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/format.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$startOfWeek$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/startOfWeek.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getWeek$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getWeek.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/chart/LineChart.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/cartesian/Line.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/cartesian/XAxis.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/cartesian/YAxis.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/cartesian/CartesianGrid.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/component/Tooltip.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/component/ResponsiveContainer.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$ReferenceLine$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/recharts/es6/cartesian/ReferenceLine.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/badge.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-ssr] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$disclosure$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/disclosure.tsx [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
;
;
function analyzeSeasonalPatterns(monthlyData) {
    if (monthlyData.length === 0) {
        return {
            patterns: [],
            peakSeason: '',
            growthRate: 0,
            rampUpMonths: 0
        };
    }
    // Group by season (by month name, across years)
    const seasonMap = new Map();
    monthlyData.forEach((m)=>{
        const monthName = m.month;
        if (!seasonMap.has(monthName)) {
            seasonMap.set(monthName, []);
        }
        seasonMap.get(monthName).push(m.ticketsSold);
    });
    // Calculate average visitors per calendar month
    const monthAverages = [];
    seasonMap.forEach((visitors, month)=>{
        const avg = visitors.reduce((sum, v)=>sum + v, 0) / visitors.length;
        monthAverages.push({
            month,
            avg
        });
    });
    // Sort by average visitors
    monthAverages.sort((a, b)=>b.avg - a.avg);
    const overallAvg = monthAverages.reduce((sum, m)=>sum + m.avg, 0) / monthAverages.length;
    // Identify peak season
    const peakSeason = monthAverages[0]?.month || '';
    // Calculate growth rate (first 3 months vs last 3 months)
    const sortedByDate = [
        ...monthlyData
    ].sort((a, b)=>{
        if (a.year !== b.year) return a.year - b.year;
        return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth();
    });
    const firstThree = sortedByDate.slice(0, Math.min(3, sortedByDate.length));
    const lastThree = sortedByDate.slice(-Math.min(3, sortedByDate.length));
    const firstAvg = firstThree.reduce((sum, m)=>sum + m.ticketsSold, 0) / firstThree.length;
    const lastAvg = lastThree.reduce((sum, m)=>sum + m.ticketsSold, 0) / lastThree.length;
    const growthRate = firstAvg > 0 ? (lastAvg - firstAvg) / firstAvg * 100 : 0;
    // Count ramp-up months (months before hitting 80% of peak)
    const peakVisitors = Math.max(...monthlyData.map((m)=>m.ticketsSold));
    const threshold = peakVisitors * 0.8;
    let rampUpMonths = 0;
    for (const month of sortedByDate){
        if (month.ticketsSold >= threshold) break;
        rampUpMonths++;
    }
    // Create seasonal patterns
    const patterns = monthAverages.map((m)=>({
            season: m.month,
            months: monthlyData.filter((d)=>d.month === m.month).map((d)=>`${d.month} ${d.year}`),
            avgVisitors: Math.round(m.avg),
            trend: m.avg >= overallAvg * 1.15 ? 'high' : m.avg <= overallAvg * 0.85 ? 'low' : 'medium'
        }));
    return {
        patterns,
        peakSeason,
        growthRate,
        rampUpMonths
    };
}
function calculateWeeklyDataWithSessions(sessions, month, year) {
    const filtered = month && year ? sessions.filter((s)=>{
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(s.startsAt);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(date, 'MMMM') === month && date.getFullYear() === year;
    }) : sessions;
    const weeklyMap = new Map();
    filtered.forEach((session)=>{
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(session.startsAt);
        const weekStart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$startOfWeek$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["startOfWeek"])(date, {
            weekStartsOn: 1
        });
        const weekKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(weekStart, 'yyyy-ww');
        if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, {
                sessions: [],
                weekStart
            });
        }
        weeklyMap.get(weekKey).sessions.push(session);
    });
    const results = [];
    weeklyMap.forEach((data, weekKey)=>{
        const visitors = data.sessions.reduce((sum, s)=>sum + s.ticketsSold, 0);
        const capacity = data.sessions.reduce((sum, s)=>sum + s.capacity, 0);
        const occupancy = capacity > 0 ? visitors / capacity * 100 : 0;
        // Sort sessions by start time
        const sortedSessions = [
            ...data.sessions
        ].sort((a, b)=>new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
        results.push({
            weekKey,
            weekLabel: `W${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getWeek$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getWeek"])(data.weekStart, {
                weekStartsOn: 1
            })}`,
            weekStart: data.weekStart,
            sessionCount: data.sessions.length,
            visitors,
            capacity,
            occupancy,
            rawSessions: sortedSessions
        });
    });
    return results.sort((a, b)=>a.weekStart.getTime() - b.weekStart.getTime());
}
function formatSessionTime(startsAt, durationMinutes) {
    const start = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(startsAt);
    const endTime = new Date(start.getTime() + durationMinutes * 60000);
    const formatTime = (date)=>{
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return minutes > 0 ? `${hour12}:${minutes.toString().padStart(2, '0')}${period}` : `${hour12}${period}`;
    };
    return `${formatTime(start)}–${formatTime(endTime)}`;
}
function MonthlyTable({ data, sessions, collapsible = false }) {
    const [selectedMonth, setSelectedMonth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [viewMode, setViewMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('timeline');
    const seasonalAnalysis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>analyzeSeasonalPatterns(data), [
        data
    ]);
    const weeklyData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (selectedMonth) {
            return calculateWeeklyDataWithSessions(sessions, selectedMonth.month, selectedMonth.year);
        }
        return calculateWeeklyDataWithSessions(sessions);
    }, [
        sessions,
        selectedMonth
    ]);
    const chartData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (viewMode === 'timeline') {
            // Show all months in chronological order
            return data.map((m)=>({
                    name: `${m.month.slice(0, 3)} '${m.year.toString().slice(-2)}`,
                    occupancy: Math.round(m.utilisation * 10) / 10,
                    visitors: m.ticketsSold
                }));
        }
        if (viewMode === 'weekly') {
            return weeklyData.map((w)=>({
                    name: selectedMonth ? w.weekLabel : `${w.weekLabel} ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(w.weekStart, 'MMM')}`,
                    occupancy: Math.round(w.occupancy * 10) / 10,
                    visitors: w.visitors
                }));
        }
        return data.map((m)=>({
                name: `${m.month.slice(0, 3)} ${m.year}`,
                occupancy: Math.round(m.utilisation * 10) / 10,
                visitors: m.ticketsSold
            }));
    }, [
        data,
        weeklyData,
        viewMode,
        selectedMonth
    ]);
    if (data.length === 0) return null;
    // Filter to only active months (those with visitors) for accurate averages
    const activeMonths = data.filter((row)=>row.ticketsSold > 0);
    const inactiveMonthCount = data.length - activeMonths.length;
    const totals = data.reduce((acc, row)=>({
            sessions: acc.sessions + row.sessions,
            visitors: acc.visitors + row.ticketsSold,
            capacity: acc.capacity + row.capacity
        }), {
        sessions: 0,
        visitors: 0,
        capacity: 0
    });
    // Calculate average occupancy from active months only
    const activeTotals = activeMonths.reduce((acc, row)=>({
            visitors: acc.visitors + row.ticketsSold,
            capacity: acc.capacity + row.capacity
        }), {
        visitors: 0,
        capacity: 0
    });
    const avgOccupancy = activeTotals.capacity > 0 ? activeTotals.visitors / activeTotals.capacity * 100 : 0;
    const inner = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                variant: viewMode === 'timeline' ? 'primary' : 'outline',
                                size: "sm",
                                onClick: ()=>{
                                    setViewMode('timeline');
                                    setSelectedMonth(null);
                                },
                                children: "Timeline"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                lineNumber: 241,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                variant: viewMode === 'monthly' ? 'primary' : 'outline',
                                size: "sm",
                                onClick: ()=>{
                                    setViewMode('monthly');
                                    setSelectedMonth(null);
                                },
                                children: "Monthly"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                lineNumber: 248,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                variant: viewMode === 'weekly' ? 'primary' : 'outline',
                                size: "sm",
                                onClick: ()=>setViewMode('weekly'),
                                children: "Weekly"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                lineNumber: 255,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                        lineNumber: 240,
                        columnNumber: 9
                    }, this),
                    viewMode === 'weekly' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap gap-1 ml-auto",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                variant: selectedMonth === null ? 'secondary' : 'ghost',
                                size: "sm",
                                onClick: ()=>{
                                    setSelectedMonth(null);
                                },
                                children: "All"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                lineNumber: 266,
                                columnNumber: 13
                            }, this),
                            data.map((m, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    variant: selectedMonth?.month === m.month && selectedMonth?.year === m.year ? 'secondary' : 'ghost',
                                    size: "sm",
                                    onClick: ()=>{
                                        setSelectedMonth({
                                            month: m.month,
                                            year: m.year
                                        });
                                    },
                                    children: [
                                        m.month.slice(0, 3),
                                        " ",
                                        m.year.toString().slice(2)
                                    ]
                                }, i, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 274,
                                    columnNumber: 15
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                        lineNumber: 265,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                lineNumber: 239,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between mb-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-muted-foreground",
                                    children: viewMode === 'timeline' ? 'Visitor Growth & Seasonal Patterns' : viewMode === 'weekly' ? selectedMonth ? `Weekly Occupancy – ${selectedMonth.month} ${selectedMonth.year}` : 'Weekly Occupancy (All Time)' : 'Monthly Occupancy Trend'
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 291,
                                    columnNumber: 13
                                }, this),
                                viewMode === 'timeline' && data.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                    className: "text-xs",
                                    children: [
                                        data.length,
                                        " months tracked"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 302,
                                    columnNumber: 15
                                }, this),
                                selectedMonth && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                    className: "text-xs",
                                    children: [
                                        weeklyData.length,
                                        " weeks"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 307,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                            lineNumber: 290,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-64",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                                width: "100%",
                                height: "100%",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LineChart"], {
                                    data: chartData,
                                    margin: {
                                        top: 10,
                                        right: 10,
                                        left: -20,
                                        bottom: 0
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                            strokeDasharray: "3 3",
                                            stroke: "hsl(0 0% 90%)"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 315,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                                            dataKey: "name",
                                            tick: {
                                                fill: 'hsl(0 0% 45%)',
                                                fontSize: 11
                                            },
                                            axisLine: {
                                                stroke: 'hsl(0 0% 90%)'
                                            },
                                            tickLine: {
                                                stroke: 'hsl(0 0% 90%)'
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 316,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                                            tick: {
                                                fill: 'hsl(0 0% 45%)',
                                                fontSize: 11
                                            },
                                            axisLine: {
                                                stroke: 'hsl(0 0% 90%)'
                                            },
                                            tickLine: {
                                                stroke: 'hsl(0 0% 90%)'
                                            },
                                            domain: [
                                                0,
                                                100
                                            ]
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 322,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                            contentStyle: {
                                                backgroundColor: 'hsl(0 0% 100%)',
                                                border: '1px solid hsl(0 0% 90%)',
                                                borderRadius: '6px',
                                                color: 'hsl(0 0% 9%)'
                                            },
                                            formatter: (value, name)=>[
                                                    name === 'occupancy' ? `${value}%` : value.toLocaleString(),
                                                    name === 'occupancy' ? 'Occupancy' : 'Visitors'
                                                ]
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 328,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$ReferenceLine$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ReferenceLine"], {
                                            y: avgOccupancy,
                                            stroke: "hsl(0 0% 60%)",
                                            strokeDasharray: "5 5"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 340,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Line"], {
                                            type: "monotone",
                                            dataKey: "occupancy",
                                            stroke: "hsl(142 71% 45%)",
                                            strokeWidth: 2,
                                            dot: {
                                                fill: 'hsl(142 71% 45%)',
                                                strokeWidth: 0,
                                                r: 4
                                            },
                                            activeDot: {
                                                r: 6
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 341,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 314,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                lineNumber: 313,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                            lineNumber: 312,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-muted-foreground text-center mt-2",
                            children: [
                                "Dashed line = ",
                                avgOccupancy.toFixed(1),
                                "% average occupancy"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                            lineNumber: 352,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                    lineNumber: 289,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                lineNumber: 288,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-0",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto",
                        children: viewMode === 'timeline' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "notion-table min-w-full",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: "bg-muted/30",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Month"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 366,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Visitors"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 367,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "vs Prev Month"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 368,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Occupancy"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 369,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Trend"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 370,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                        lineNumber: 365,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 364,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    children: data.map((row, index)=>{
                                        const prevMonth = index > 0 ? data[index - 1] : null;
                                        const growth = prevMonth && prevMonth.ticketsSold > 0 ? (row.ticketsSold - prevMonth.ticketsSold) / prevMonth.ticketsSold * 100 : null;
                                        const pattern = seasonalAnalysis.patterns.find((p)=>p.months.includes(`${row.month} ${row.year}`));
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            className: "cursor-pointer hover:bg-muted/20",
                                            onClick: ()=>{
                                                setViewMode('weekly');
                                                setSelectedMonth({
                                                    month: row.month,
                                                    year: row.year
                                                });
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "font-medium",
                                                    children: [
                                                        row.month,
                                                        " ",
                                                        row.year,
                                                        pattern?.trend === 'high' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                                            variant: "success",
                                                            className: "ml-2 text-xs",
                                                            children: "Peak"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                            lineNumber: 393,
                                                            columnNumber: 29
                                                        }, this),
                                                        pattern?.trend === 'low' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                                            variant: "warning",
                                                            className: "ml-2 text-xs",
                                                            children: "Off"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                            lineNumber: 396,
                                                            columnNumber: 29
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 390,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "font-medium",
                                                    children: row.ticketsSold.toLocaleString()
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 399,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    children: growth !== null ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-muted-foreground',
                                                        children: [
                                                            growth > 0 ? '+' : '',
                                                            growth.toFixed(0),
                                                            "%"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                        lineNumber: 402,
                                                        columnNumber: 29
                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-muted-foreground",
                                                        children: "-"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                        lineNumber: 406,
                                                        columnNumber: 29
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 400,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: getOccupancyClass(row.utilisation),
                                                    children: [
                                                        row.utilisation.toFixed(1),
                                                        "%"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 409,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "text-xs text-muted-foreground",
                                                    children: [
                                                        index === 0 && 'Launch',
                                                        index > 0 && index < seasonalAnalysis.rampUpMonths && 'Ramp-up',
                                                        index >= seasonalAnalysis.rampUpMonths && 'Established'
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 412,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, index, true, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 385,
                                            columnNumber: 23
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 373,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                            lineNumber: 363,
                            columnNumber: 15
                        }, this) : viewMode === 'weekly' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "divide-y",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-6 gap-4 px-4 py-3 bg-muted/30 text-sm font-medium",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: "Week"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 426,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-right",
                                            children: "Sessions"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 427,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-right",
                                            children: "Visitors"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 428,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-right",
                                            children: "Total Seats"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 429,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-right",
                                            children: "Seats/Session"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 430,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-right",
                                            children: "Occupancy"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 431,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 425,
                                    columnNumber: 17
                                }, this),
                                weeklyData.map((row)=>{
                                    const seatsPerSession = row.sessionCount > 0 ? row.capacity / row.sessionCount : 0;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$disclosure$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Disclosure"], {
                                        summary: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-6 gap-4 px-4 py-3 text-sm hover:bg-muted/20 transition-colors",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "font-medium flex items-center gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                            className: "h-3 w-3 text-muted-foreground transition-transform group-open:rotate-180"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                            lineNumber: 444,
                                                            columnNumber: 29
                                                        }, void 0),
                                                        row.weekLabel,
                                                        " – ",
                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(row.weekStart, 'MMM d')
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 443,
                                                    columnNumber: 27
                                                }, void 0),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-right",
                                                    children: row.sessionCount
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 447,
                                                    columnNumber: 27
                                                }, void 0),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-right",
                                                    children: row.visitors.toLocaleString()
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 448,
                                                    columnNumber: 27
                                                }, void 0),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-right text-muted-foreground",
                                                    children: row.capacity.toLocaleString()
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 449,
                                                    columnNumber: 27
                                                }, void 0),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-right text-muted-foreground",
                                                    children: seatsPerSession.toFixed(0)
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 450,
                                                    columnNumber: 27
                                                }, void 0),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `text-right ${getOccupancyClass(row.occupancy)}`,
                                                    children: [
                                                        row.occupancy.toFixed(1),
                                                        "%"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 451,
                                                    columnNumber: 27
                                                }, void 0)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 442,
                                            columnNumber: 25
                                        }, void 0),
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-muted/10 border-t px-4 py-3",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2",
                                                children: row.rawSessions.map((session)=>{
                                                    const occupancyPct = session.capacity > 0 ? session.ticketsSold / session.capacity * 100 : 0;
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center justify-between text-xs bg-background rounded px-3 py-2 border",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "font-medium",
                                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(session.startsAt), 'MMM d')
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                                        lineNumber: 469,
                                                                        columnNumber: 35
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-muted-foreground ml-2",
                                                                        children: formatSessionTime(session.startsAt, session.durationMinutes)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                                        lineNumber: 472,
                                                                        columnNumber: 35
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                                lineNumber: 468,
                                                                columnNumber: 33
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                                                variant: occupancyPct >= 70 ? 'success' : occupancyPct >= 40 ? 'warning' : 'neutral',
                                                                className: "text-xs",
                                                                children: [
                                                                    session.ticketsSold,
                                                                    "/",
                                                                    session.capacity
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                                lineNumber: 476,
                                                                columnNumber: 33
                                                            }, this)
                                                        ]
                                                    }, session.id, true, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                        lineNumber: 464,
                                                        columnNumber: 31
                                                    }, this);
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 458,
                                                columnNumber: 25
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 457,
                                            columnNumber: 23
                                        }, this)
                                    }, row.weekKey, false, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                        lineNumber: 439,
                                        columnNumber: 21
                                    }, this);
                                })
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                            lineNumber: 423,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "notion-table min-w-full",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: "bg-muted/30",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Month"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 495,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-right",
                                                children: "Sessions"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 496,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-right",
                                                children: "Visitors"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 497,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-right",
                                                children: "Total Seats"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 498,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-right",
                                                children: "Seats/Session"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 499,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "text-right",
                                                children: "Occupancy"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 500,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                        lineNumber: 494,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 493,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    children: data.map((row, index)=>{
                                        const seatsPerSession = row.sessions > 0 ? row.capacity / row.sessions : 0;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            className: "cursor-pointer hover:bg-muted/20",
                                            onClick: ()=>{
                                                setViewMode('weekly');
                                                setSelectedMonth({
                                                    month: row.month,
                                                    year: row.year
                                                });
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "font-medium",
                                                    children: [
                                                        row.month,
                                                        " ",
                                                        row.year
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 512,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "text-right",
                                                    children: row.sessions
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 515,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "text-right",
                                                    children: row.ticketsSold.toLocaleString()
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 516,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "text-right text-muted-foreground",
                                                    children: row.capacity.toLocaleString()
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 517,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "text-right text-muted-foreground",
                                                    children: seatsPerSession.toFixed(0)
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 518,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: `text-right ${getOccupancyClass(row.utilisation)}`,
                                                    children: [
                                                        row.utilisation.toFixed(1),
                                                        "%"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                    lineNumber: 519,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, index, true, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 507,
                                            columnNumber: 23
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 503,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tfoot", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: "bg-muted/50 font-semibold",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: [
                                                    "Total / Average",
                                                    inactiveMonthCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-normal text-xs text-muted-foreground ml-1",
                                                        children: [
                                                            "(",
                                                            inactiveMonthCount,
                                                            " inactive month",
                                                            inactiveMonthCount > 1 ? 's' : '',
                                                            " excluded)"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                        lineNumber: 531,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 528,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "text-right",
                                                children: totals.sessions.toLocaleString()
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 536,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "text-right",
                                                children: activeTotals.visitors.toLocaleString()
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 537,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "text-right text-muted-foreground",
                                                children: activeTotals.capacity.toLocaleString()
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 538,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "text-right text-muted-foreground",
                                                children: activeMonths.length > 0 ? (activeTotals.capacity / activeMonths.reduce((sum, m)=>sum + m.sessions, 0)).toFixed(0) : '-'
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 539,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: `text-right ${getOccupancyClass(avgOccupancy)}`,
                                                children: [
                                                    avgOccupancy.toFixed(1),
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                                lineNumber: 545,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                        lineNumber: 527,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 526,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                            lineNumber: 492,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                        lineNumber: 361,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                    lineNumber: 360,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                lineNumber: 359,
                columnNumber: 7
            }, this),
            viewMode === 'timeline' && data.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-muted/30 rounded-lg p-4 space-y-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-muted-foreground",
                                            children: "Peak Season"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 561,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm font-semibold",
                                            children: seasonalAnalysis.peakSeason || '-'
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 562,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 560,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-muted-foreground",
                                            children: "Growth Rate"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 565,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: `text-sm font-semibold ${seasonalAnalysis.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`,
                                            children: [
                                                seasonalAnalysis.growthRate > 0 ? '+' : '',
                                                seasonalAnalysis.growthRate.toFixed(0),
                                                "%"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 566,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 564,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-muted-foreground",
                                            children: "Ramp-up Period"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 571,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm font-semibold",
                                            children: [
                                                seasonalAnalysis.rampUpMonths,
                                                " months"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 572,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 570,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-muted-foreground",
                                            children: "Total Tracked"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 575,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm font-semibold",
                                            children: [
                                                data.length,
                                                " months"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 576,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 574,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                            lineNumber: 559,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "pt-3 border-t space-y-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs font-medium",
                                    children: "Insights:"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 580,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-muted-foreground",
                                    children: [
                                        "• ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-medium",
                                            children: seasonalAnalysis.peakSeason
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 582,
                                            columnNumber: 19
                                        }, this),
                                        " shows strongest visitation patterns"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 581,
                                    columnNumber: 15
                                }, this),
                                seasonalAnalysis.growthRate > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-muted-foreground",
                                    children: [
                                        "• ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-medium",
                                            children: "Positive momentum:"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 586,
                                            columnNumber: 21
                                        }, this),
                                        " visitors growing ",
                                        seasonalAnalysis.growthRate.toFixed(0),
                                        "% from early to recent months"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 585,
                                    columnNumber: 17
                                }, this),
                                seasonalAnalysis.rampUpMonths > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-muted-foreground",
                                    children: [
                                        "• ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-medium",
                                            children: "Launch phase:"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                            lineNumber: 591,
                                            columnNumber: 21
                                        }, this),
                                        " took ",
                                        seasonalAnalysis.rampUpMonths,
                                        " months to reach 80% of peak performance"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                                    lineNumber: 590,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                            lineNumber: 579,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                    lineNumber: 558,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                lineNumber: 557,
                columnNumber: 9
            }, this),
            viewMode === 'monthly' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-muted-foreground text-center",
                children: "Click any month row to see weekly breakdown"
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                lineNumber: 599,
                columnNumber: 9
            }, this),
            viewMode === 'weekly' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-muted-foreground text-center",
                children: "Click any week to see individual sessions"
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                lineNumber: 604,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
        lineNumber: 237,
        columnNumber: 5
    }, this);
    if (!collapsible) return inner;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$disclosure$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Disclosure"], {
        summary: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                    className: "h-4 w-4 transition-transform group-open:rotate-180"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                    lineNumber: 617,
                    columnNumber: 11
                }, void 0),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: "Show session data"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                    lineNumber: 618,
                    columnNumber: 11
                }, void 0),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-xs font-normal",
                    children: [
                        "(",
                        data.length,
                        " months · ",
                        sessions.length,
                        " sessions)"
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
                    lineNumber: 619,
                    columnNumber: 11
                }, void 0)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
            lineNumber: 616,
            columnNumber: 9
        }, void 0),
        children: inner
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx",
        lineNumber: 614,
        columnNumber: 5
    }, this);
}
function getOccupancyClass(util) {
    if (util >= 70) return 'text-green-600 font-medium';
    if (util >= 40) return 'text-amber-600';
    return 'text-red-600';
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/venueCache.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getCacheKey",
    ()=>getCacheKey,
    "getCachedEntry",
    ()=>getCachedEntry,
    "getRecentSearches",
    ()=>getRecentSearches,
    "removeFromRecent",
    ()=>removeFromRecent,
    "setCachedEntry",
    ()=>setCachedEntry
]);
const CACHE_KEY = 'venue-cache';
const RECENT_KEY = 'venue-recent';
const MAX_RECENT = 9;
function canUseStorage() {
    return ("TURBOPACK compile-time value", "undefined") !== 'undefined' && typeof localStorage !== 'undefined';
}
function getCacheKey(hostId, platform, from, to) {
    return `${hostId}|${platform}|${from}|${to}`;
}
function getCache() {
    if (!canUseStorage()) return {};
    //TURBOPACK unreachable
    ;
}
function getRecentKeys() {
    if (!canUseStorage()) return [];
    //TURBOPACK unreachable
    ;
}
function getCachedEntry(key) {
    const cache = getCache();
    return cache[key] ?? null;
}
function setCachedEntry(entry) {
    if (!canUseStorage()) {
        const key = getCacheKey(entry.hostId, entry.platform, entry.dateRange.from, entry.dateRange.to);
        return {
            ...entry,
            key,
            cachedAt: new Date().toISOString()
        };
    }
    //TURBOPACK unreachable
    ;
    const key = undefined;
    const full = undefined;
    const cache = undefined;
    const recent = undefined;
    const updated = undefined;
}
function getRecentSearches() {
    const keys = getRecentKeys();
    const cache = getCache();
    return keys.map((k)=>cache[k]).filter((e)=>!!e);
}
function removeFromRecent(key) {
    if (!canUseStorage()) return;
    //TURBOPACK unreachable
    ;
    const updated = undefined;
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ReportClient",
    ()=>ReportClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$VenueHeader$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/VenueHeader.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$PerformanceScorecard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/PerformanceScorecard.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$OperationalBlueprint$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/OperationalBlueprint.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$DemandIntelligence$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DemandIntelligence.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$GrowthStory$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/GrowthStory.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$MonthlyTable$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/MonthlyTable.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$benchmarkMetrics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/benchmarkMetrics.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$venueCache$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/venueCache.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
function pickEntry({ hostId, from, to, platform }) {
    if (hostId && from && to && platform) {
        const key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$venueCache$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCacheKey"])(hostId, platform, from, to);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$venueCache$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCachedEntry"])(key);
    }
    const recent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$venueCache$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getRecentSearches"])();
    return recent[0] ?? null;
}
function ReportClient() {
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const [entry, setEntry] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const hostId = params.get('hostId');
    const from = params.get('from');
    const to = params.get('to');
    const platform = params.get('platform') ?? 'momence';
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setEntry(pickEntry({
            hostId,
            from,
            to,
            platform
        }));
    }, [
        hostId,
        from,
        to,
        platform
    ]);
    const benchmarkMetrics = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!entry) return null;
        const activeSessions = entry.sessions.filter((s)=>s.ticketsSold > 0);
        if (activeSessions.length === 0) return null;
        const sorted = [
            ...activeSessions
        ].sort((a, b)=>new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$benchmarkMetrics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["calculateBenchmarkMetrics"])(activeSessions, sorted[0].startsAt, sorted[sorted.length - 1].startsAt);
    }, [
        entry
    ]);
    if (!entry) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "notion-page",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "notion-title",
                    children: "Report"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                    lineNumber: 65,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "notion-text",
                    children: "No cached venue found for this URL."
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                    lineNumber: 66,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "notion-muted",
                    children: "Start by fetching a venue in the old app (or open a report link with hostId/from/to)."
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                    lineNumber: 69,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                        children: "Back home"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                        lineNumber: 73,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                    lineNumber: 72,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
            lineNumber: 64,
            columnNumber: 7
        }, this);
    }
    if (!benchmarkMetrics) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "notion-page",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "notion-title",
                    children: "Report"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                    lineNumber: 87,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "notion-text",
                    children: "No active sessions in this dataset."
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                    lineNumber: 88,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                        children: "Back home"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                        lineNumber: 90,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                    lineNumber: 89,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
            lineNumber: 86,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-background",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "notion-page",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-8 flex items-center justify-between gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            href: "/",
                            className: "text-sm text-muted-foreground hover:text-foreground",
                            children: "Home"
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                            lineNumber: 105,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-muted-foreground",
                            children: "Report view (Next.js)"
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                            lineNumber: 108,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                    lineNumber: 104,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-10",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$VenueHeader$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VenueHeader"], {
                            metrics: benchmarkMetrics,
                            venueConfig: entry.venueConfig,
                            hostInfo: entry.hostInfo,
                            dateRange: entry.dateRange
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                            lineNumber: 114,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "notion-section-h1",
                                    children: "Performance"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                                    lineNumber: 122,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$PerformanceScorecard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PerformanceScorecard"], {
                                    metrics: benchmarkMetrics
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                                    lineNumber: 123,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                            lineNumber: 121,
                            columnNumber: 11
                        }, this),
                        entry.venueConfig && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$OperationalBlueprint$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OperationalBlueprint"], {
                            metrics: benchmarkMetrics,
                            venueConfig: entry.venueConfig
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                            lineNumber: 127,
                            columnNumber: 13
                        }, this),
                        entry.sessions.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "notion-section-h1",
                                    children: "Demand"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                                    lineNumber: 135,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$DemandIntelligence$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DemandIntelligence"], {
                                    sessions: entry.sessions,
                                    metrics: benchmarkMetrics
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                                    lineNumber: 136,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                            lineNumber: 134,
                            columnNumber: 13
                        }, this),
                        entry.monthlyData.length >= 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "notion-section-h1",
                                    children: "Growth"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                                    lineNumber: 142,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$GrowthStory$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GrowthStory"], {
                                    monthlyData: entry.monthlyData
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                                    lineNumber: 143,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                            lineNumber: 141,
                            columnNumber: 13
                        }, this),
                        entry.monthlyData.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$MonthlyTable$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MonthlyTable"], {
                                data: entry.monthlyData,
                                sessions: entry.sessions,
                                collapsible: true
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                                lineNumber: 149,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                            lineNumber: 148,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
                    lineNumber: 113,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
            lineNumber: 103,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/report/report-client.tsx",
        lineNumber: 102,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=Documents_Sites_Slow%20Folk_Untitled_sauna-session-stats_src_d9294999._.js.map