(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/config/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Momence API Configuration
__turbopack_context__.s([
    "API_CONFIG",
    ()=>API_CONFIG,
    "VENUES",
    ()=>VENUES
]);
const API_CONFIG = {
    baseUrl: 'https://readonly-api.momence.com/host-plugins/host',
    defaultHostId: '37867',
    sessionTypes: [
        'course-class',
        'fitness',
        'retreat',
        'special-event',
        'special-event-new'
    ],
    pageSize: 100
};
const VENUES = [
    {
        id: '37867',
        name: 'Inner Studio, Collingwood',
        platform: 'momence',
        location: 'Melbourne'
    },
    {
        id: '190198',
        name: 'Inner Studio, South Yarra',
        platform: 'momence',
        location: 'Melbourne'
    },
    {
        id: '59636',
        name: 'Sol Sauna',
        platform: 'momence',
        location: 'Melbourne'
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/momenceClient.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MomenceClient",
    ()=>MomenceClient,
    "momenceClient",
    ()=>momenceClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/config/api.ts [app-client] (ecmascript)");
;
/**
 * Momence API Client
 * Handles all API calls to the Momence readonly API
 */ class MomenceClient {
    baseUrl;
    constructor(baseUrl = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].baseUrl){
        this.baseUrl = baseUrl;
    }
    /**
   * Fetch host info from the Momence API
   */ async fetchHostInfo(hostId) {
        const url = `${this.baseUrl}/${hostId}/host-schedule`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn('Could not fetch host info:', response.status);
                return null;
            }
            const data = await response.json();
            if (data.host) {
                return {
                    id: data.host.id,
                    name: data.host.name || 'Unknown Venue',
                    currency: data.host.currency || 'aud',
                    countryCode: data.host.countryCode || 'AU',
                    timeZone: data.host.timeZone || 'Australia/Melbourne',
                    industry: data.host.industry?.name || 'Wellness',
                    profileImage: data.host.profileImage || data.host.logo || data.host.image || null
                };
            }
            return null;
        } catch (error) {
            console.warn('Error fetching host info:', error);
            return null;
        }
    }
    /**
   * Fetch sessions from the Momence API
   */ async fetchSessions(params) {
        const queryParams = new URLSearchParams();
        // Add session types
        __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].sessionTypes.forEach((type)=>{
            queryParams.append('sessionTypes[]', type);
        });
        // Add date range
        queryParams.set('fromDate', params.startsAtFrom);
        if (params.startsAtTo) {
            queryParams.set('toDate', params.startsAtTo);
        }
        // Pagination (0-indexed)
        queryParams.set('page', String((params.page || 1) - 1));
        queryParams.set('pageSize', String(params.pageSize || __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize));
        const url = `${this.baseUrl}/${params.hostId}/host-schedule/sessions?${queryParams.toString()}`;
        console.log('API Request URL:', url);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            // Log sample session for debugging
            if (data.payload?.[0]) {
                console.log('Sample session from API:', data.payload[0]);
            }
            return this.transformResponse(data, params);
        } catch (error) {
            console.error('Momence API Error:', error);
            throw error;
        }
    }
    /**
   * Transform API response to typed format.
   * Note: cancelled sessions are kept here to preserve page counts for pagination.
   * They are filtered out by sanitizeSessions() after all pages are fetched.
   */ transformResponse(data, params) {
        // Handle response with 'payload' array (Momence readonly API format)
        if (data.payload && Array.isArray(data.payload)) {
            return {
                sessions: data.payload.map(this.transformSession),
                totalCount: data.total || data.payload.length,
                page: (data.page ?? 0) + 1,
                pageSize: data.pageSize || params.pageSize || __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize,
                totalPages: data.totalPages || Math.ceil((data.total || data.payload.length) / (params.pageSize || __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize))
            };
        }
        // Handle paginated response with 'data' array
        if (data.data && Array.isArray(data.data)) {
            return {
                sessions: data.data.map(this.transformSession),
                totalCount: data.total || data.data.length,
                page: (data.page || 0) + 1,
                pageSize: data.pageSize || params.pageSize || __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize,
                totalPages: data.totalPages || Math.ceil((data.total || data.data.length) / (params.pageSize || __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize))
            };
        }
        // Handle if data has 'sessions' key
        if (data.sessions && Array.isArray(data.sessions)) {
            return {
                sessions: data.sessions.map(this.transformSession),
                totalCount: data.total || data.totalCount || data.sessions.length,
                page: (data.page || 0) + 1,
                pageSize: data.pageSize || params.pageSize || __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize,
                totalPages: data.totalPages || Math.ceil((data.total || data.sessions.length) / (params.pageSize || __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize))
            };
        }
        // Handle if data is an array directly
        if (Array.isArray(data)) {
            return {
                sessions: data.map(this.transformSession),
                totalCount: data.length,
                page: params.page || 1,
                pageSize: params.pageSize || __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize,
                totalPages: 1
            };
        }
        // Fallback
        return {
            sessions: [],
            totalCount: 0,
            page: 1,
            pageSize: params.pageSize || __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize,
            totalPages: 0
        };
    }
    /**
   * Transform a single session to typed format
   */ transformSession(session) {
        // Prefer API's own ticketsSold (actual sales) over registrationsCount (may include cancellations/no-shows)
        const ticketsSold = session.ticketsSold ?? session.registrationsCount ?? session.attendeesCount ?? session.bookedCount ?? 0;
        // Prefer fixedTicketPrice (API returns this reliably alongside price: null)
        const price = session.fixedTicketPrice ?? session.price ?? session.ticketPrice ?? 0;
        const capacity = session.spotsTotal ?? session.capacity ?? session.maxAttendees ?? 0;
        return {
            id: session.id || session._id || String(Math.random()),
            sessionName: session.name || session.sessionName || session.title || 'Unknown',
            startsAt: session.startDate || session.startsAt || session.startTime || session.start,
            endsAt: session.endDate || session.endsAt || session.endTime || session.end,
            durationMinutes: session.duration || session.durationMinutes || 60,
            capacity,
            ticketsSold,
            fixedTicketPrice: price,
            location: session.locationName || session.location || session.venue || '',
            inPerson: session.inPerson !== false,
            level: session.level || session.type || session.sessionType,
            isCancelled: session.isCancelled === true
        };
    }
}
const momenceClient = new MomenceClient();
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/metricsCalculator.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/format.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/parseISO.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$differenceInDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/differenceInDays.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$startOfMonth$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/startOfMonth.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getHours.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getMinutes.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-client] (ecmascript)");
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
    const daysDiff = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$differenceInDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["differenceInDays"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(toDate), (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(fromDate)) + 1;
    const sessionsPerDay = daysDiff > 0 ? totalSessions / daysDiff : 0;
    const sessionsPerWeek = sessionsPerDay * 7;
    const sortedSessions = [
        ...sessions
    ].sort((a, b)=>new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const operatingSince = sortedSessions.length > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(sortedSessions[0].startsAt), 'MMMM yyyy') : '-';
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
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(session.startsAt);
        const monthKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$startOfMonth$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startOfMonth"])(date), 'yyyy-MM');
        if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, {
                sessions: []
            });
        }
        monthlyMap.get(monthKey).sessions.push(session);
    });
    const monthlyData = [];
    monthlyMap.forEach((data, key)=>{
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(key + '-01');
        const sessionsCount = data.sessions.length;
        const ticketsSold = data.sessions.reduce((sum, s)=>sum + s.ticketsSold, 0);
        const capacity = data.sessions.reduce((sum, s)=>sum + s.capacity, 0);
        const utilisation = capacity > 0 ? ticketsSold / capacity * 100 : 0;
        const revenue = data.sessions.reduce((sum, s)=>sum + s.ticketsSold * s.fixedTicketPrice, 0);
        monthlyData.push({
            month: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(date, 'MMMM'),
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
        const label = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDecimalHour"])(slotStart)} – ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDecimalHour"])(slotEnd)}`;
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
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(session.startsAt);
        const hours = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getHours"])(date) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMinutes"])(date) / 60;
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
    const daysDiff = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$differenceInDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["differenceInDays"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(toDate), (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(fromDate)) + 1;
    const sessionsPerDay = daysDiff > 0 ? Math.round(sessions.length / daysDiff * 10) / 10 : 0;
    // Find operating hours using session start and end times
    const startTimes = sessions.map((s)=>{
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(s.startsAt);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getHours"])(date) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMinutes"])(date) / 60;
    });
    const endTimes = sessions.map((s)=>{
        const startDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(s.startsAt);
        const startHour = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getHours"])(startDate) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMinutes"])(startDate) / 60;
        return startHour + (s.durationMinutes || 60) / 60;
    });
    const minTime = Math.min(...startTimes);
    const maxTime = Math.max(...endTimes);
    const operatingHours = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDecimalHour"])(minTime)} – ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDecimalHour"])(maxTime)}`;
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/benchmarkMetrics.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateBenchmarkMetrics",
    ()=>calculateBenchmarkMetrics,
    "formatOperatingHours",
    ()=>formatOperatingHours,
    "inferOperatingHours",
    ()=>inferOperatingHours
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/parseISO.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getDay.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getHours.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/getMinutes.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$differenceInDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/differenceInDays.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-client] (ecmascript)");
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
        const startDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(session.startsAt);
        const startHour = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getHours$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getHours"])(startDate) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getMinutes$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMinutes"])(startDate) / 60;
        // Use session duration to calculate actual end time
        const endHour = startHour + (session.durationMinutes || 60) / 60;
        const dayOfWeek = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDay"])(startDate);
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
    const from = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(fromDate);
    const to = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(toDate);
    const daysInRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$differenceInDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["differenceInDays"])(to, from) + 1;
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
        const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(session.startsAt);
        const dayOfWeek = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$getDay$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDay"])(date);
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
    const weekday = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDecimalHour"])(hours.weekdayStart)}–${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDecimalHour"])(hours.weekdayEnd)}`;
    const weekend = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDecimalHour"])(hours.weekendStart)}–${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDecimalHour"])(hours.weekendEnd)}`;
    if (weekday === weekend) {
        return weekday;
    }
    return `Weekdays ${weekday}, Weekends ${weekend}`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/hooks/useSessions.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSessions",
    ()=>useSessions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$momenceClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/momenceClient.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$metricsCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/metricsCalculator.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$benchmarkMetrics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/benchmarkMetrics.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/config/api.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
function filterByDateRange(sessions, fromDate, toDate) {
    const from = new Date(fromDate).getTime();
    // Parse toDate and extend to end-of-day if it resolves to midnight
    const toParsed = new Date(toDate);
    const toTime = toParsed.getHours() === 0 && toParsed.getMinutes() === 0 && toParsed.getSeconds() === 0 ? new Date(toParsed.getFullYear(), toParsed.getMonth(), toParsed.getDate(), 23, 59, 59, 999).getTime() : toParsed.getTime();
    return sessions.filter((session)=>{
        const sessionDate = new Date(session.startsAt).getTime();
        return sessionDate >= from && sessionDate <= toTime;
    });
}
function filterToLastMonths(sessions, months) {
    if (sessions.length === 0) return [];
    // Find the most recent session date
    const maxDate = Math.max(...sessions.map((s)=>new Date(s.startsAt).getTime()));
    const cutoffDate = new Date(maxDate);
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    return sessions.filter((s)=>new Date(s.startsAt).getTime() >= cutoffDate.getTime());
}
function useSessions() {
    _s();
    const [allSessions, setAllSessions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [queryParams, setQueryParams] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [hostInfo, setHostInfo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [totalCount, setTotalCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [totalPages, setTotalPages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [fetchingCount, setFetchingCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [dataRange, setDataRange] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        from: null,
        to: null,
        rawFrom: null,
        rawTo: null,
        effectiveFromISO: null,
        effectiveToISO: null
    });
    const fetchData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useSessions.useCallback[fetchData]": async (params)=>{
            setIsLoading(true);
            setError(null);
            setFetchingCount(0);
            setQueryParams({
                ...params,
                page: 1,
                pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize
            });
            console.log('Requested date range:', params.startsAtFrom, 'to', params.startsAtTo);
            try {
                // Fetch host info in parallel with first page of sessions
                const hostInfoPromise = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$momenceClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["momenceClient"].fetchHostInfo(params.hostId);
                const allData = [];
                let page = 1;
                let pagesLoaded = 0;
                while(true){
                    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$momenceClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["momenceClient"].fetchSessions({
                        ...params,
                        page,
                        pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize
                    });
                    const sessionCount = response.sessions.length;
                    allData.push(...response.sessions);
                    pagesLoaded++;
                    setFetchingCount(allData.length);
                    console.log(`Page ${page}: fetched ${sessionCount} sessions (total so far: ${allData.length})`);
                    // Stop if: no results, less than full page (end of data), or safety limit
                    // Note: Inner Studio has 218+ pages, so limit needs to be high enough
                    if (sessionCount === 0 || sessionCount < __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize || pagesLoaded >= 250) {
                        break;
                    }
                    page++;
                }
                // Get host info result
                const fetchedHostInfo = await hostInfoPromise;
                setHostInfo(fetchedHostInfo);
                // Calculate date range of raw API data
                let rawMinDate = null;
                let rawMaxDate = null;
                if (allData.length > 0) {
                    const dates = allData.map({
                        "useSessions.useCallback[fetchData].dates": (s)=>new Date(s.startsAt).getTime()
                    }["useSessions.useCallback[fetchData].dates"]);
                    rawMinDate = new Date(Math.min(...dates));
                    rawMaxDate = new Date(Math.max(...dates));
                    console.log('API returned data range:', rawMinDate.toISOString(), 'to', rawMaxDate.toISOString());
                }
                // Apply client-side date filtering since API ignores date params
                let filteredData = filterByDateRange(allData, params.startsAtFrom, params.startsAtTo);
                let fallbackApplied = false;
                let fallbackMonths = 0;
                console.log(`Filtered: ${allData.length} → ${filteredData.length} sessions within requested range`);
                // If no data in requested range but API has data, fall back to last available months
                if (filteredData.length === 0 && allData.length > 0) {
                    // Try last 6 months of available data first, then 3 if still sparse
                    const last6 = filterToLastMonths(allData, 6);
                    if (last6.length >= 10) {
                        filteredData = last6;
                        fallbackMonths = 6;
                    } else {
                        filteredData = filterToLastMonths(allData, 3);
                        fallbackMonths = 3;
                    }
                    fallbackApplied = true;
                    console.log(`Fallback applied: showing last ${fallbackMonths} months of available data (${filteredData.length} sessions)`);
                }
                // Calculate date range of filtered data
                let filteredMinDate = null;
                let filteredMaxDate = null;
                if (filteredData.length > 0) {
                    const dates = filteredData.map({
                        "useSessions.useCallback[fetchData].dates": (s)=>new Date(s.startsAt).getTime()
                    }["useSessions.useCallback[fetchData].dates"]);
                    filteredMinDate = new Date(Math.min(...dates));
                    filteredMaxDate = new Date(Math.max(...dates));
                }
                // When fallback is applied, use the actual filtered data range for calculations
                // instead of the original query dates which don't match the data
                const effectiveFrom = fallbackApplied && filteredMinDate ? filteredMinDate.toISOString() : params.startsAtFrom;
                const effectiveTo = fallbackApplied && filteredMaxDate ? filteredMaxDate.toISOString() : params.startsAtTo;
                // Sanitization pipeline:
                // 1. Basic sanitization (cancelled, invalid dates, zero capacity)
                const { sessions: basicClean, report: basicReport } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sanitizeSessions"])(filteredData);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logDataQuality"])('Basic sanitization', basicReport);
                // 2. Infer operating hours using percentile-based bounds (eliminates outliers)
                const operatingHours = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$benchmarkMetrics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["inferOperatingHours"])(basicClean);
                const earliestStart = Math.min(operatingHours.weekdayStart, operatingHours.weekendStart);
                const latestEnd = Math.max(operatingHours.weekdayEnd, operatingHours.weekendEnd);
                console.log(`Inferred operating hours: ${earliestStart.toFixed(1)}–${latestEnd.toFixed(1)}`);
                // 3. Filter sessions outside operating hours (prevents phantom time slots)
                const hoursBounds = {
                    earliestStart,
                    latestEnd
                };
                const { sessions: hoursFiltered, report: hoursReport } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sanitizeSessions"])(basicClean, hoursBounds);
                if (hoursReport.dropped.outsideOperatingHours > 0) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logDataQuality"])('Operating hours filter', hoursReport);
                }
                // 4. Normalize capacity to modal value (reduces variance from special events)
                const { sessions: cleanData, normalizedCount, modalCapacity } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["normalizeCapacity"])(hoursFiltered, 0.5, true);
                if (normalizedCount > 0) {
                    console.log(`Normalized ${normalizedCount} sessions to modal capacity ${modalCapacity}`);
                }
                setDataRange({
                    from: filteredMinDate,
                    to: filteredMaxDate,
                    rawFrom: rawMinDate,
                    rawTo: rawMaxDate,
                    fallbackApplied,
                    fallbackMonths,
                    effectiveFromISO: effectiveFrom,
                    effectiveToISO: effectiveTo
                });
                setTotalCount(cleanData.length);
                setTotalPages(pagesLoaded);
                setAllSessions(cleanData);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch sessions'));
            } finally{
                setIsLoading(false);
            }
        }
    }["useSessions.useCallback[fetchData]"], []);
    // Use effective dates (actual data range) rather than raw query params
    // This ensures calculations are accurate when fallback dates are applied
    const effectiveFrom = dataRange.effectiveFromISO || queryParams?.startsAtFrom;
    const effectiveTo = dataRange.effectiveToISO || queryParams?.startsAtTo;
    const metrics = queryParams && effectiveFrom && effectiveTo ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$metricsCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateMetrics"])(allSessions, effectiveFrom, effectiveTo) : null;
    // Calculate benchmark metrics with inferred operating hours
    const benchmarkMetrics = queryParams && effectiveFrom && effectiveTo && allSessions.length > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$benchmarkMetrics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateBenchmarkMetrics"])(allSessions, effectiveFrom, effectiveTo) : null;
    const monthlyData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$metricsCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateMonthlyData"])(allSessions);
    // Generate dynamic time slots based on operating hours
    const timeSlots = benchmarkMetrics ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$metricsCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateTimeSlots"])(benchmarkMetrics.operatingHours) : undefined;
    const demandPatterns = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$metricsCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateDemandPatterns"])(allSessions, timeSlots);
    const classTypeData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$metricsCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateClassTypeData"])(allSessions);
    const venueConfig = queryParams && effectiveFrom && effectiveTo ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$metricsCalculator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["calculateVenueConfig"])(allSessions, effectiveFrom, effectiveTo) : null;
    const hydrateFromCache = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useSessions.useCallback[hydrateFromCache]": (sessions, hostId, fromDate, toDate, cachedHostInfo)=>{
            setAllSessions(sessions);
            setQueryParams({
                hostId,
                startsAtFrom: fromDate,
                startsAtTo: toDate,
                page: 1,
                pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_CONFIG"].pageSize
            });
            setHostInfo(cachedHostInfo);
            setError(null);
            setTotalCount(sessions.length);
            setTotalPages(1);
            setFetchingCount(sessions.length);
            const from = sessions.length > 0 ? new Date(Math.min(...sessions.map({
                "useSessions.useCallback[hydrateFromCache]": (s)=>new Date(s.startsAt).getTime()
            }["useSessions.useCallback[hydrateFromCache]"]))) : null;
            const to = sessions.length > 0 ? new Date(Math.max(...sessions.map({
                "useSessions.useCallback[hydrateFromCache]": (s)=>new Date(s.startsAt).getTime()
            }["useSessions.useCallback[hydrateFromCache]"]))) : null;
            setDataRange({
                from,
                to,
                rawFrom: from,
                rawTo: to,
                effectiveFromISO: fromDate,
                effectiveToISO: toDate
            });
        }
    }["useSessions.useCallback[hydrateFromCache]"], []);
    return {
        allSessions,
        totalCount,
        totalPages,
        fetchingCount,
        page: 1,
        metrics,
        benchmarkMetrics,
        monthlyData,
        demandPatterns,
        classTypeData,
        venueConfig,
        hostInfo,
        dataRange,
        isLoading,
        error,
        fetchData,
        hydrateFromCache
    };
}
_s(useSessions, "72KGplBmBLIPFAWJchtx59OuhE4=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/venueCache.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
    return ("TURBOPACK compile-time value", "object") !== 'undefined' && typeof localStorage !== 'undefined';
}
function getCacheKey(hostId, platform, from, to) {
    return `${hostId}|${platform}|${from}|${to}`;
}
function getCache() {
    if (!canUseStorage()) return {};
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch  {
        return {};
    }
}
function getRecentKeys() {
    if (!canUseStorage()) return [];
    try {
        const stored = localStorage.getItem(RECENT_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch  {
        return [];
    }
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
    const key = getCacheKey(entry.hostId, entry.platform, entry.dateRange.from, entry.dateRange.to);
    const full = {
        ...entry,
        key,
        cachedAt: new Date().toISOString()
    };
    const cache = getCache();
    cache[key] = full;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    const recent = getRecentKeys();
    const updated = [
        key,
        ...recent.filter((k)=>k !== key)
    ].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    return full;
}
function getRecentSearches() {
    const keys = getRecentKeys();
    const cache = getCache();
    return keys.map((k)=>cache[k]).filter((e)=>!!e);
}
function removeFromRecent(key) {
    if (!canUseStorage()) return;
    const updated = getRecentKeys().filter((k)=>k !== key);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DataStatus",
    ()=>DataStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/format.mjs [app-client] (ecmascript) <locals>");
;
;
function DataStatus({ isLoading, error, sessionCount, pageCount, dataRange, loadingLabel }) {
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-2 py-2 text-sm text-muted-foreground",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "inline-block h-2 w-2 rounded-full bg-primary animate-pulse"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                    lineNumber: 18,
                    columnNumber: 9
                }, this),
                sessionCount > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        "Loading... ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                            className: "text-foreground",
                            children: sessionCount.toLocaleString()
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                            lineNumber: 21,
                            columnNumber: 24
                        }, this),
                        " sessions fetched"
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                    lineNumber: 20,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: loadingLabel ?? 'Fetching session data...'
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                    lineNumber: 24,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
            lineNumber: 17,
            columnNumber: 7
        }, this);
    }
    if (error) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-4 rounded-lg bg-red-50 border border-red-200 text-red-700",
            children: [
                "Error loading data: ",
                error.message
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
            lineNumber: 32,
            columnNumber: 7
        }, this);
    }
    if (sessionCount > 0) {
        const dateRangeText = dataRange?.from && dataRange?.to ? ` from ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(dataRange.from, 'MMM d, yyyy')} to ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(dataRange.to, 'MMM d, yyyy')}` : '';
        // Show fallback notice if we couldn't match the requested range
        if (dataRange?.fallbackApplied) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2 mb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-medium",
                                children: [
                                    "Showing last ",
                                    dataRange.fallbackMonths,
                                    " months of available data"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                                lineNumber: 48,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs mt-1",
                                children: [
                                    "No sessions found in requested range. Data available",
                                    dateRangeText,
                                    "."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                                lineNumber: 49,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                        lineNumber: 47,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-sm text-muted-foreground",
                        children: [
                            "Loaded ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                className: "text-foreground",
                                children: sessionCount.toLocaleString()
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                                lineNumber: 54,
                                columnNumber: 20
                            }, this),
                            " sessions"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                        lineNumber: 53,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                lineNumber: 46,
                columnNumber: 9
            }, this);
        }
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm text-muted-foreground mb-4",
            children: [
                "Loaded ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                    className: "text-foreground",
                    children: sessionCount.toLocaleString()
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                    lineNumber: 62,
                    columnNumber: 16
                }, this),
                " sessions",
                dateRangeText
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
            lineNumber: 61,
            columnNumber: 7
        }, this);
    }
    // Show info about raw API data when no sessions match the filter
    if (sessionCount === 0 && dataRange?.rawFrom && dataRange?.rawTo) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "font-medium",
                    children: "No sessions found in requested date range"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                    lineNumber: 71,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm mt-1",
                    children: [
                        "API returned data from ",
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(dataRange.rawFrom, 'MMM d, yyyy'),
                        " to ",
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(dataRange.rawTo, 'MMM d, yyyy'),
                        '. Try selecting a different date range or "All time".'
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
                    lineNumber: 72,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx",
            lineNumber: 70,
            columnNumber: 7
        }, this);
    }
    return null;
}
_c = DataStatus;
var _c;
__turbopack_context__.k.register(_c, "DataStatus");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardContent",
    ()=>CardContent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function Card({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('rounded-xl border border-border bg-card text-card-foreground shadow-sm', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, this);
}
_c = Card;
function CardContent({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('p-5', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx",
        lineNumber: 17,
        columnNumber: 10
    }, this);
}
_c1 = CardContent;
var _c, _c1;
__turbopack_context__.k.register(_c, "Card");
__turbopack_context__.k.register(_c1, "CardContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/label.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Label",
    ()=>Label
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function Label({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('text-xs font-medium text-muted-foreground', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/label.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, this);
}
_c = Label;
var _c;
__turbopack_context__.k.register(_c, "Label");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function Button({ className, variant = 'primary', size = 'md', type = 'button', ...props }) {
    const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';
    const sizes = size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm';
    const styles = variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : variant === 'secondary' ? 'bg-muted text-foreground hover:bg-muted/70' : variant === 'outline' ? 'border border-border bg-background hover:bg-muted/40' : 'hover:bg-muted/40';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: type,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(base, sizes, styles, className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/button.tsx",
        lineNumber: 30,
        columnNumber: 10
    }, this);
}
_c = Button;
var _c;
__turbopack_context__.k.register(_c, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RecentSearches",
    ()=>RecentSearches
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/format.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/parseISO.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/label.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCw$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/lucide-react/dist/esm/icons/rotate-cw.js [app-client] (ecmascript) <export default as RotateCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
;
;
;
;
;
;
function formatDateRange(from, to) {
    try {
        return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(from), 'MMM d, yyyy')} – ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(to), 'MMM d, yyyy')}`;
    } catch  {
        return `${from} – ${to}`;
    }
}
function RecentSearches({ entries, onSelect }) {
    if (entries.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                className: "text-xs text-muted-foreground",
                children: "Recent Searches"
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
                children: entries.map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        className: "cursor-pointer hover:border-primary/50 transition-colors",
                        onClick: ()=>onSelect(entry),
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                            className: "p-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center",
                                        children: entry.hostInfo?.profileImage ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: entry.hostInfo.profileImage,
                                            alt: entry.venueName,
                                            className: "w-full h-full object-cover"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                            lineNumber: 41,
                                            columnNumber: 21
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-lg font-bold text-muted-foreground",
                                            children: entry.venueName.charAt(0)
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                            lineNumber: 47,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                        lineNumber: 39,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "min-w-0 flex-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "font-semibold truncate leading-tight",
                                                children: entry.venueName
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                                lineNumber: 53,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-muted-foreground mt-0.5",
                                                children: formatDateRange(entry.dateRange.from, entry.dateRange.to)
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                                lineNumber: 54,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-muted-foreground",
                                                children: [
                                                    entry.sessions.length,
                                                    " sessions"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                                lineNumber: 57,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                        lineNumber: 52,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                variant: "ghost",
                                                size: "sm",
                                                className: "h-8 w-8 px-0",
                                                onClick: (e)=>{
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onRefresh(entry);
                                                },
                                                disabled: refreshingKey === entry.key,
                                                "aria-label": "Refresh",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCw$3e$__["RotateCw"], {
                                                    className: `h-4 w-4 ${refreshingKey === entry.key ? 'animate-spin' : ''}`
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                                    lineNumber: 71,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                                lineNumber: 63,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                variant: "ghost",
                                                size: "sm",
                                                className: "h-8 w-8 px-0",
                                                onClick: (e)=>{
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onDelete(entry.key);
                                                },
                                                "aria-label": "Delete",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                                    lineNumber: 80,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                                lineNumber: 73,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                        lineNumber: 62,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                                lineNumber: 38,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                            lineNumber: 37,
                            columnNumber: 13
                        }, this)
                    }, entry.key, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                        lineNumber: 32,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, this);
}
_c = RecentSearches;
var _c;
__turbopack_context__.k.register(_c, "RecentSearches");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/skeleton.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Skeleton",
    ()=>Skeleton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function Skeleton({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("animate-pulse rounded-md bg-muted", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/skeleton.tsx",
        lineNumber: 4,
        columnNumber: 10
    }, this);
}
_c = Skeleton;
;
var _c;
__turbopack_context__.k.register(_c, "Skeleton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardContent",
    ()=>CardContent,
    "CardDescription",
    ()=>CardDescription,
    "CardFooter",
    ()=>CardFooter,
    "CardHeader",
    ()=>CardHeader,
    "CardTitle",
    ()=>CardTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-client] (ecmascript)");
;
;
;
const Card = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-lg border bg-card text-card-foreground shadow-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/card.tsx",
        lineNumber: 6,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c1 = Card;
Card.displayName = "Card";
const CardHeader = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c2 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex flex-col space-y-1.5 p-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/card.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c3 = CardHeader;
CardHeader.displayName = "CardHeader";
const CardTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c4 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-2xl font-semibold leading-none tracking-tight", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/card.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c5 = CardTitle;
CardTitle.displayName = "CardTitle";
const CardDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c6 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/card.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c7 = CardDescription;
CardDescription.displayName = "CardDescription";
const CardContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c8 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-6 pt-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/card.tsx",
        lineNumber: 32,
        columnNumber: 37
    }, ("TURBOPACK compile-time value", void 0)));
_c9 = CardContent;
CardContent.displayName = "CardContent";
const CardFooter = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c10 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center p-6 pt-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/card.tsx",
        lineNumber: 38,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c11 = CardFooter;
CardFooter.displayName = "CardFooter";
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11;
__turbopack_context__.k.register(_c, "Card$React.forwardRef");
__turbopack_context__.k.register(_c1, "Card");
__turbopack_context__.k.register(_c2, "CardHeader$React.forwardRef");
__turbopack_context__.k.register(_c3, "CardHeader");
__turbopack_context__.k.register(_c4, "CardTitle$React.forwardRef");
__turbopack_context__.k.register(_c5, "CardTitle");
__turbopack_context__.k.register(_c6, "CardDescription$React.forwardRef");
__turbopack_context__.k.register(_c7, "CardDescription");
__turbopack_context__.k.register(_c8, "CardContent$React.forwardRef");
__turbopack_context__.k.register(_c9, "CardContent");
__turbopack_context__.k.register(_c10, "CardFooter$React.forwardRef");
__turbopack_context__.k.register(_c11, "CardFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DashboardSkeleton",
    ()=>DashboardSkeleton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/skeleton.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/ui/card.tsx [app-client] (ecmascript)");
;
;
;
function SkeletonCard({ lines = 2 }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
            className: "p-4 space-y-2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                    className: "h-3 w-24"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                    lineNumber: 8,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                    className: "h-6 w-16"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                    lineNumber: 9,
                    columnNumber: 9
                }, this),
                lines > 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                    className: "h-3 w-20"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                    lineNumber: 10,
                    columnNumber: 23
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
            lineNumber: 7,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, this);
}
_c = SkeletonCard;
function SkeletonChart({ height = 'h-48' }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
            className: "p-5 space-y-3",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                    className: "h-3 w-32"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                    lineNumber: 20,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                    className: `w-full rounded-lg ${height}`
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                    lineNumber: 21,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
            lineNumber: 19,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_c1 = SkeletonChart;
function SkeletonTable({ rows = 4 }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
            className: "p-0",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-4 border-b",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                        className: "h-4 w-28"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 32,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                    lineNumber: 31,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "divide-y",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-4 px-4 py-3",
                            children: [
                                1,
                                2,
                                3,
                                4,
                                5
                            ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                    className: "h-3 flex-1"
                                }, i, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                    lineNumber: 38,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                            lineNumber: 36,
                            columnNumber: 11
                        }, this),
                        Array.from({
                            length: rows
                        }).map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-4 px-4 py-3",
                                children: [
                                    1,
                                    2,
                                    3,
                                    4,
                                    5
                                ].map((j)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                        className: "h-3 flex-1"
                                    }, j, false, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                        lineNumber: 45,
                                        columnNumber: 17
                                    }, this))
                            }, i, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                lineNumber: 43,
                                columnNumber: 13
                            }, this))
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                    lineNumber: 34,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
            lineNumber: 30,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
_c2 = SkeletonTable;
function SkeletonSection({ title }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-1 mb-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                className: "h-5 w-40"
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "sr-only",
                children: title
            }, void 0, false, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
_c3 = SkeletonSection;
function DashboardSkeleton() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-10 mt-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonSection, {
                        title: "Venue Summary"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 69,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        className: "mb-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                            className: "p-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                        className: "h-20 w-20 rounded-xl flex-shrink-0"
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                        lineNumber: 74,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1 space-y-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                        className: "h-5 w-48 mb-2"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                        lineNumber: 77,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                        className: "h-3 w-24"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                        lineNumber: 78,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                lineNumber: 76,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                                                children: [
                                                    1,
                                                    2,
                                                    3,
                                                    4
                                                ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "space-y-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                                className: "h-3 w-16"
                                                            }, void 0, false, {
                                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                                lineNumber: 83,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                                className: "h-4 w-12"
                                                            }, void 0, false, {
                                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                                lineNumber: 84,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, i, true, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                        lineNumber: 82,
                                                        columnNumber: 21
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                lineNumber: 80,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                        lineNumber: 75,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                lineNumber: 73,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                            lineNumber: 72,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 71,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-2 md:grid-cols-3 gap-4 mb-4",
                        children: [
                            1,
                            2,
                            3,
                            4,
                            5,
                            6
                        ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonCard, {
                                lines: 3
                            }, i, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                lineNumber: 95,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 93,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 md:grid-cols-3 gap-4",
                        children: [
                            1,
                            2,
                            3
                        ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                    className: "p-4 space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-3 w-28"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 103,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-2 w-full rounded-full"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 104,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-2 w-full rounded-full"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 105,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                    lineNumber: 102,
                                    columnNumber: 15
                                }, this)
                            }, i, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                lineNumber: 101,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 99,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                lineNumber: 68,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonSection, {
                        title: "Monthly Performance"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 114,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonChart, {
                        height: "h-56"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 115,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonTable, {
                            rows: 4
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                            lineNumber: 117,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 116,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                lineNumber: 113,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonSection, {
                        title: "Demand Patterns"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 123,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4",
                        children: [
                            1,
                            2
                        ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                    className: "p-5 space-y-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-4 w-36"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 128,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-2",
                                            children: [
                                                1,
                                                2
                                            ].map((j)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center justify-between",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                            className: "h-3 w-28"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                            lineNumber: 132,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                            className: "h-5 w-20 rounded-full"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                            lineNumber: 133,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, j, true, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                    lineNumber: 131,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 129,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                    lineNumber: 127,
                                    columnNumber: 15
                                }, this)
                            }, i, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                lineNumber: 126,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 124,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
                        children: [
                            1,
                            2
                        ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                    className: "p-5 space-y-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-3 w-40"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 145,
                                            columnNumber: 17
                                        }, this),
                                        [
                                            1,
                                            2,
                                            3,
                                            4
                                        ].map((j)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                        className: "h-3 w-24"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                        lineNumber: 148,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                        className: "h-3 flex-1 rounded-full"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                        lineNumber: 149,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                        className: "h-3 w-10"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                        lineNumber: 150,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, j, true, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                lineNumber: 147,
                                                columnNumber: 19
                                            }, this))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                    lineNumber: 144,
                                    columnNumber: 15
                                }, this)
                            }, i, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                lineNumber: 143,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 141,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                lineNumber: 122,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonSection, {
                        title: "Revenue Insights"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 161,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-4",
                        children: [
                            1,
                            2,
                            3,
                            4
                        ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonCard, {
                                lines: 3
                            }, i, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                lineNumber: 164,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 162,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4",
                        children: [
                            1,
                            2,
                            3
                        ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                    className: "p-4 space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-5 w-16 rounded-full"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 171,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-3 w-32"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 172,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-7 w-20"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 173,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-3 w-full"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 174,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                    lineNumber: 170,
                                    columnNumber: 15
                                }, this)
                            }, i, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                lineNumber: 169,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 167,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonChart, {
                        height: "h-56"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 179,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                lineNumber: 160,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonSection, {
                        title: "Capacity Trend"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 184,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                            className: "p-5 space-y-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                                    children: [
                                        1,
                                        2,
                                        3,
                                        4
                                    ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-center p-3 rounded-lg space-y-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                    className: "h-6 w-12 mx-auto"
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                    lineNumber: 190,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                    className: "h-3 w-20 mx-auto"
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                    lineNumber: 191,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, i, true, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                            lineNumber: 189,
                                            columnNumber: 17
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                    lineNumber: 187,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                    className: "h-48 w-full rounded-lg"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                    lineNumber: 195,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                            lineNumber: 186,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 185,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                lineNumber: 183,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonSection, {
                        title: "Pricing & Offerings"
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 202,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                        className: "mb-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                            className: "p-5",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                                children: [
                                    1,
                                    2,
                                    3,
                                    4
                                ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 rounded-lg space-y-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                className: "h-3 w-24"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                lineNumber: 208,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                                className: "h-5 w-16"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                                lineNumber: 209,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                        lineNumber: 207,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                                lineNumber: 205,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                            lineNumber: 204,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 203,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkeletonTable, {
                        rows: 5
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                        lineNumber: 215,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
                lineNumber: 201,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx",
        lineNumber: 66,
        columnNumber: 5
    }, this);
}
_c4 = DashboardSkeleton;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "SkeletonCard");
__turbopack_context__.k.register(_c1, "SkeletonChart");
__turbopack_context__.k.register(_c2, "SkeletonTable");
__turbopack_context__.k.register(_c3, "SkeletonSection");
__turbopack_context__.k.register(_c4, "DashboardSkeleton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/input.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Input",
    ()=>Input
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function Input({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground', 'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring', className),
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/input.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, this);
}
_c = Input;
var _c;
__turbopack_context__.k.register(_c, "Input");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HomeClient",
    ()=>HomeClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/format.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/subMonths.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$subYears$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/node_modules/date-fns/subYears.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$hooks$2f$useSessions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/hooks/useSessions.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/config/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$venueCache$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/lib/venueCache.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$DataStatus$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DataStatus.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$RecentSearches$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/RecentSearches.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$DashboardSkeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/DashboardSkeleton.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/components/untitled/label.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
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
;
const PRESETS = [
    {
        label: 'Last 1 month',
        from: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subMonths"])(new Date(), 1),
        to: ()=>new Date()
    },
    {
        label: 'Last 3 months',
        from: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subMonths"])(new Date(), 3),
        to: ()=>new Date()
    },
    {
        label: 'Last 6 months',
        from: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subMonths"])(new Date(), 6),
        to: ()=>new Date()
    },
    {
        label: 'Last 12 months',
        from: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subMonths"])(new Date(), 12),
        to: ()=>new Date()
    },
    {
        label: 'All time',
        from: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$subYears$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subYears"])(new Date(), 10),
        to: ()=>new Date()
    }
];
function toDateInputValue(date) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(date, 'yyyy-MM-dd');
}
function HomeClient() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const momenceHook = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$hooks$2f$useSessions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSessions"])();
    const [recentSearches, setRecentSearches] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "HomeClient.useState": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$venueCache$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getRecentSearches"])()
    }["HomeClient.useState"]);
    const [refreshingKey, setRefreshingKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [hasQueried, setHasQueried] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [currentHostId, setCurrentHostId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["VENUES"][0]?.id ?? '');
    const [fromDate, setFromDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(toDateInputValue((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subMonths"])(new Date(), 3)));
    const [toDate, setToDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(toDateInputValue(new Date()));
    const { allSessions, metrics, monthlyData, venueConfig, hostInfo, dataRange, isLoading, error, totalPages } = momenceHook;
    const canSubmit = currentHostId && fromDate && toDate;
    const queryRefresh = params.get('refresh') === 'true';
    const queryHostId = params.get('hostId');
    const queryFrom = params.get('from');
    const queryTo = params.get('to');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HomeClient.useEffect": ()=>{
            if (!queryRefresh || !queryHostId || !queryFrom || !queryTo) return;
            setCurrentHostId(queryHostId);
            setFromDate(queryFrom);
            setToDate(queryTo);
            // Fire immediately.
            void handleFetch(queryHostId, queryFrom, queryTo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["HomeClient.useEffect"], [
        queryRefresh,
        queryHostId,
        queryFrom,
        queryTo
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HomeClient.useEffect": ()=>{
            if (!hasQueried || isLoading || allSessions.length === 0) return;
            const venueName = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["VENUES"].find({
                "HomeClient.useEffect": (v)=>v.id === currentHostId
            }["HomeClient.useEffect"])?.name || hostInfo?.name || `Host ${currentHostId}`;
            const entry = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$venueCache$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setCachedEntry"])({
                hostId: currentHostId,
                platform: 'momence',
                venueName,
                dateRange: {
                    from: fromDate,
                    to: toDate
                },
                sessions: allSessions,
                metrics,
                monthlyData,
                venueConfig,
                hostInfo
            });
            setRecentSearches((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$venueCache$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getRecentSearches"])());
            router.push(`/report?hostId=${entry.hostId}&from=${fromDate}&to=${toDate}&platform=${entry.platform}`);
        }
    }["HomeClient.useEffect"], [
        hasQueried,
        isLoading,
        allSessions.length,
        currentHostId,
        fromDate,
        toDate,
        router,
        metrics,
        monthlyData,
        venueConfig,
        hostInfo,
        allSessions
    ]);
    async function handleFetch(hostId, from, to) {
        setHasQueried(true);
        await momenceHook.fetchData({
            hostId,
            startsAtFrom: new Date(from).toISOString(),
            startsAtTo: new Date(to).toISOString()
        });
    }
    async function onSubmit(e) {
        e.preventDefault();
        if (!canSubmit) return;
        await handleFetch(currentHostId, fromDate, toDate);
    }
    function handleLoadFromCache(entry) {
        router.push(`/report?hostId=${entry.hostId}&from=${entry.dateRange.from}&to=${entry.dateRange.to}&platform=${entry.platform}`);
    }
    async function handleRefresh(entry) {
        setRefreshingKey(entry.key);
        setCurrentHostId(entry.hostId);
        setFromDate(entry.dateRange.from);
        setToDate(entry.dateRange.to);
        await handleFetch(entry.hostId, entry.dateRange.from, entry.dateRange.to);
        setRefreshingKey(null);
    }
    function handleDelete(key) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$venueCache$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["removeFromRecent"])(key);
        setRecentSearches((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$lib$2f$venueCache$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getRecentSearches"])());
    }
    const selectedVenueName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "HomeClient.useMemo[selectedVenueName]": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["VENUES"].find({
                "HomeClient.useMemo[selectedVenueName]": (v)=>v.id === currentHostId
            }["HomeClient.useMemo[selectedVenueName]"])?.name ?? 'Venue'
    }["HomeClient.useMemo[selectedVenueName]"], [
        currentHostId
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen bg-background",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "notion-page",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "notion-title",
                    children: "Sauna session stats"
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                    lineNumber: 121,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "notion-subtitle",
                    children: "Pick a venue and date range. We’ll build a competitor-ready report."
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                    lineNumber: 122,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                    className: "mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: onSubmit,
                            className: "grid grid-cols-1 md:grid-cols-3 gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                            htmlFor: "venue",
                                            children: "Venue"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                            lineNumber: 128,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            id: "venue",
                                            value: currentHostId,
                                            onChange: (e)=>setCurrentHostId(e.target.value),
                                            className: "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                                            children: __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$config$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["VENUES"].map((v)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: v.id,
                                                    children: v.name
                                                }, v.id, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                                    lineNumber: 136,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                            lineNumber: 129,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                    lineNumber: 127,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                            children: "Date range"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                            lineNumber: 142,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                    type: "date",
                                                    value: fromDate,
                                                    onChange: (e)=>setFromDate(e.target.value)
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                                    lineNumber: 144,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                    type: "date",
                                                    value: toDate,
                                                    onChange: (e)=>setToDate(e.target.value)
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                                    lineNumber: 145,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                            lineNumber: 143,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-wrap gap-2 pt-1",
                                            children: PRESETS.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                    type: "button",
                                                    variant: "ghost",
                                                    size: "sm",
                                                    onClick: ()=>{
                                                        setFromDate(toDateInputValue(p.from()));
                                                        setToDate(toDateInputValue(p.to()));
                                                    },
                                                    children: p.label
                                                }, p.label, false, {
                                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                                    lineNumber: 149,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                            lineNumber: 147,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                    lineNumber: 141,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                            className: "opacity-0",
                                            children: "Action"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                            lineNumber: 166,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$untitled$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            type: "submit",
                                            disabled: isLoading || !canSubmit,
                                            className: "w-full",
                                            children: isLoading ? `Loading ${selectedVenueName}…` : 'Fetch data'
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                            lineNumber: 167,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                                    lineNumber: 165,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                            lineNumber: 126,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                        lineNumber: 125,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                    lineNumber: 124,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$RecentSearches$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RecentSearches"], {
                        entries: recentSearches,
                        onSelect: handleLoadFromCache,
                        onRefresh: handleRefresh,
                        onDelete: handleDelete,
                        refreshingKey: refreshingKey
                    }, void 0, false, {
                        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                        lineNumber: 176,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                    lineNumber: 175,
                    columnNumber: 9
                }, this),
                hasQueried && isLoading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$DataStatus$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataStatus"], {
                            isLoading: isLoading,
                            error: error,
                            sessionCount: momenceHook.fetchingCount,
                            pageCount: totalPages,
                            dataRange: dataRange,
                            loadingLabel: `Fetching ${selectedVenueName}…`
                        }, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                            lineNumber: 187,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$components$2f$DashboardSkeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DashboardSkeleton"], {}, void 0, false, {
                            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
                            lineNumber: 195,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true)
            ]
        }, void 0, true, {
            fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
            lineNumber: 120,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/Documents/Sites/Slow Folk/Untitled/sauna-session-stats/src/app/home-client.tsx",
        lineNumber: 119,
        columnNumber: 5
    }, this);
}
_s(HomeClient, "h25L3ZT1kzXjWx8NcXWTiH969Fw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Sites$2f$Slow__Folk$2f$Untitled$2f$sauna$2d$session$2d$stats$2f$src$2f$hooks$2f$useSessions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSessions"]
    ];
});
_c = HomeClient;
var _c;
__turbopack_context__.k.register(_c, "HomeClient");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=Documents_Sites_Slow%20Folk_Untitled_sauna-session-stats_src_1bdd90ca._.js.map