import type { UserProfile } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CalendarFilters } from "../components/CalendarFilters";
import { RevisionBadge } from "../components/RevisionBadge";
import { z } from "zod";
import Link from "next/link";

// --- Zod schemas (unchanged) ---
const indicatorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  normalized_name: z.string().nullable().optional(),
  country_code: z.string(),
  category: z.string(),
  impact: z.enum(["low", "medium", "high"]).catch("low"),
});

const embeddedIndicatorSchema = z
  .union([
    indicatorSchema,
    z.array(indicatorSchema).transform((arr) => arr[0] ?? null),
  ])
  .nullable();

const revisionRecordSchema = z.object({
  previous_actual: z.string(),
  new_actual: z.string(),
  revised_at: z.string(),
});

const releaseWithIndicatorSchema = z.object({
  id: z.string().uuid(),
  release_at: z.string(),
  period: z.string().nullable(),
  actual: z.string().nullable(),
  forecast: z.string().nullable(),
  previous: z.string().nullable(),
  revised: z.string().nullable(),
  revision_history: z.array(revisionRecordSchema).catch([]),
  indicator: embeddedIndicatorSchema,
});

const filterOptionsSchema = z.object({
  countries: z.array(z.string()),
  categories: z.array(z.string()),
});

type ReleaseWithIndicator = z.infer<typeof releaseWithIndicatorSchema>;
type FilterOptions = z.infer<typeof filterOptionsSchema>;
type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// --- Country flag mapping ---
const FLAG_MAP: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", CAD: "🇨🇦",
  AUD: "🇦🇺", NZD: "🇳🇿", CHF: "🇨🇭", CNY: "🇨🇳", INR: "🇮🇳",
  BRL: "🇧🇷", MXN: "🇲🇽", KR: "🇰🇷", KRW: "🇰🇷", SGD: "🇸🇬",
  SAR: "🇸🇦", TRY: "🇹🇷", ZAR: "🇿🇦", RUB: "🇷🇺", IDR: "🇮🇩",
  ARS: "🇦🇷", EU: "🇪🇺",
};

// --- Data fetchers ---
async function getFilterOptions(): Promise<DataResult<FilterOptions>> {
  const supabase = await createSupabaseServerClient();
  const [countriesResult, categoriesResult] = await Promise.all([
    supabase.from("indicators").select("country_code").order("country_code"),
    supabase.from("indicators").select("category").order("category"),
  ]);

  if (countriesResult.error || categoriesResult.error) {
    return { success: false, error: "Unable to load filter options." };
  }

  const countries = [...new Set((countriesResult.data ?? []).map((row) => row.country_code).filter(Boolean))];
  const categories = [...new Set((categoriesResult.data ?? []).map((row) => row.category).filter(Boolean))];

  return { success: true, data: { countries, categories } };
}

async function getUpcomingReleases(filters: {
  countries?: string[];
  category?: string;
  search?: string;
  watchlistOnly?: boolean;
  userId?: string;
  view?: string;
  hideReleased?: boolean;
  impact?: string[];
}): Promise<DataResult<ReleaseWithIndicator[]>> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  
  // Date range based on view
  let rangeStart: Date;
  let rangeEnd: Date;
  
  switch (filters.view) {
    case "past":
      rangeStart = new Date(now.getFullYear(), 0, 1);
      rangeEnd = now;
      break;
    case "week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday = 0
      rangeStart = new Date(now);
      rangeStart.setDate(now.getDate() - diff);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeStart.getDate() + 6);
      rangeEnd.setHours(23, 59, 59, 999);
      break;
    }
    default:
      rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      rangeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  let watchlistIndicatorIds: string[] = [];
  if (filters.watchlistOnly && filters.userId) {
    const { data: watchlistData } = await supabase
      .from("watchlist")
      .select("indicator_id")
      .eq("user_id", filters.userId);
    
    watchlistIndicatorIds = (watchlistData ?? []).map((row) => row.indicator_id);
    if (watchlistIndicatorIds.length === 0) return { success: true, data: [] };
  }

  let query = supabase
    .from("releases")
    .select(
      `id, release_at, period, actual, forecast, previous, revised, revision_history,
       indicator:indicators!inner (id, name, normalized_name, country_code, category, impact)`
    )
    .gte("release_at", rangeStart.toISOString())
    .lte("release_at", rangeEnd.toISOString());

  if (filters.watchlistOnly && watchlistIndicatorIds.length > 0) {
    query = query.in("indicator_id", watchlistIndicatorIds);
  }
  if (filters.countries && filters.countries.length > 0) {
    query = query.in("indicator.country_code", filters.countries);
  }
  if (filters.impact && filters.impact.length > 0) {
    query = query.in("indicator.impact", filters.impact);
  }
  if (filters.category) {
    query = query.eq("indicator.category", filters.category);
  }
  if (filters.search) {
    query = query.ilike("indicator.name", `%${filters.search}%`);
  }

  const { data, error } = await query.order("release_at", { ascending: true });

  if (error) return { success: false, error: "Unable to load calendar data." };

  try {
    let validated = z.array(releaseWithIndicatorSchema).parse(data ?? []);
    if (filters.hideReleased) {
      validated = validated.filter((r) => !r.actual);
    }
    return { success: true, data: validated };
  } catch {
    return { success: false, error: "Received invalid data format from database." };
  }
}

// --- Helpers ---
function formatTime(isoString: string, timeZone?: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
}

function formatDateHeader(isoString: string, timeZone?: string): string {
  // We need to compare dates in the TARGET timezone, not local/server timezone
  const getTzDateString = (d: Date) => d.toLocaleDateString("en-US", { timeZone });
  
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = getTzDateString(date) === getTzDateString(today);
  const isTomorrow = getTzDateString(date) === getTzDateString(tomorrow);

  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone,
  });

  if (isToday) return `Today — ${formatted}`;
  if (isTomorrow) return `Tomorrow — ${formatted}`;
  return formatted;
}

function getDateKey(isoString: string, timeZone?: string): string {
  // Group by the date string in the target timezone
  return new Date(isoString).toLocaleDateString("en-US", { timeZone });
}

function groupByDate(
  releases: ReleaseWithIndicator[],
  timeZone?: string
): Map<string, ReleaseWithIndicator[]> {
  const groups = new Map<string, ReleaseWithIndicator[]>();
  for (const release of releases) {
    const key = getDateKey(release.release_at, timeZone);
    // Use the first release's full ISO string to generate the header later
    // But we need a stable key for the map. Let's use the formatted date string as key.
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(release);
  }
  return groups;
}

function parseNumeric(value: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function getActualToneClass(actual: string | null, forecast: string | null): string {
  if (!actual) return "text-zinc-600";
  const a = parseNumeric(actual);
  const f = parseNumeric(forecast);
  if (a === null || f === null) return "text-emerald-400";
  if (a > f) return "text-emerald-400";
  if (a < f) return "text-red-400";
  return "text-zinc-300";
}

// --- Page ---
type CalendarViewProps = {
  searchParams: Promise<Record<string, string | undefined>>;
  user: UserProfile;
};

export async function CalendarView({ searchParams, user }: CalendarViewProps) {
  const params = await searchParams;
  

  const countries = params.country?.split(",").filter(Boolean) ?? [];
  const impactLevels = params.impact?.split(",").filter(Boolean) ?? [];
  const timeZone = params.tz || undefined; // undefined allows default behavior

  const filters = {
    countries,
    category: params.category,
    search: params.search,
    watchlistOnly: params.watchlist === "true",
    userId: user.id,
    view: params.view,
    hideReleased: params.hide === "released",
    impact: impactLevels,
  };

  const [releasesResult, filterOptionsResult] = await Promise.all([
    getUpcomingReleases(filters),
    getFilterOptions(),
  ]);

  const releases = releasesResult.success ? releasesResult.data : [];
  const filterOptions = filterOptionsResult.success
    ? filterOptionsResult.data
    : { countries: [], categories: [] };
  
  // Group releases using the selected timezone
  const dateGroups = groupByDate(releases, timeZone);

  return (
    <div className="min-h-screen bg-[#0b0e11]">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <CalendarFilters
          countries={filterOptions.countries}
          categories={filterOptions.categories}
          isAuthenticated={true}
        />

        {/* Stats bar */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {releases.length} release{releases.length !== 1 ? "s" : ""}
            {filters.view === "past"
              ? " since Jan 1"
              : filters.view === "week"
                ? " this week"
                : " — past 7 days + next 30 days"}
          </p>
        </div>

        {/* Calendar */}
        {releases.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#1e2530] bg-[#151921] py-20">
            <p className="text-sm font-medium text-zinc-400">
              No upcoming releases
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(dateGroups.entries()).map(
              ([dateKey, dateReleases]) => (
                <div key={dateKey}>
                  {/* Date header */}
                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="text-sm font-medium text-zinc-300">
                      {formatDateHeader(dateReleases[0].release_at, timeZone)}
                    </h2>
                    <div className="h-px flex-1 bg-[#1e2530]" />
                    <span className="text-xs text-zinc-600">
                      {dateReleases.length}
                    </span>
                  </div>

                  {/* Mobile cards */}
                  <div className="overflow-hidden rounded-lg border border-[#1e2530] bg-[#151921] sm:hidden">
                    <div className="divide-y divide-[#1e2530]/60">
                      {dateReleases.map((release) => {
                        const flag =
                          FLAG_MAP[release.indicator?.country_code ?? ""] ?? "🌐";
                        const actualTone = getActualToneClass(
                          release.actual,
                          release.forecast
                        );

                        return (
                          <div key={release.id} className="px-3 py-3">
                            <div className="mb-1.5 flex items-center gap-2 text-xs text-zinc-400">
                              <span className="font-mono text-zinc-500">
                                {formatTime(release.release_at, timeZone)}
                              </span>
                              <span>{flag}</span>
                              <span className="font-medium text-zinc-300">
                                {release.indicator?.country_code ?? "—"}
                              </span>
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  release.indicator?.impact === "high"
                                    ? "bg-red-500"
                                    : release.indicator?.impact === "medium"
                                      ? "bg-yellow-500"
                                      : "bg-zinc-600"
                                }`}
                                title={`${release.indicator?.impact ?? "low"} impact`}
                              />
                            </div>

                            <div className="mb-2 flex items-start gap-2">
                              {release.indicator ? (
                                <Link
                                  href={`/indicator/${release.indicator.id}`}
                                  className="line-clamp-2 text-sm font-semibold text-zinc-100 hover:text-blue-400 transition-colors"
                                >
                                  {release.indicator.normalized_name ||
                                    release.indicator.name}
                                </Link>
                              ) : (
                                <span className="text-sm text-zinc-500">Unknown</span>
                              )}
                              <RevisionBadge revisions={release.revision_history} />
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                              <div className="rounded-md border border-[#1e2530] bg-[#10141c] px-2 py-1.5 text-center">
                                <div className="mb-0.5 text-zinc-500">Actual</div>
                                <div className={`font-semibold ${actualTone}`}>
                                  {release.actual ?? "—"}
                                </div>
                              </div>
                              <div className="rounded-md border border-[#1e2530] bg-[#10141c] px-2 py-1.5 text-center">
                                <div className="mb-0.5 text-zinc-500">Forecast</div>
                                <div className="font-medium text-zinc-300">
                                  {release.forecast ?? "—"}
                                </div>
                              </div>
                              <div className="rounded-md border border-[#1e2530] bg-[#10141c] px-2 py-1.5 text-center">
                                <div className="mb-0.5 text-zinc-500">Prev</div>
                                <div className="font-medium text-zinc-400">
                                  {release.previous ?? "—"}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Desktop table */}
                  <div className="hidden overflow-hidden rounded-lg border border-[#1e2530] bg-[#151921] sm:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1e2530] text-left">
                          <th className="px-2 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 sm:px-4">
                            Time
                          </th>
                          <th className="px-2 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 sm:px-4">
                            Currency
                          </th>
                          <th className="px-2 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 sm:px-4">
                            Event
                          </th>
                          <th className="px-2 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 sm:px-4">
                            Actual
                          </th>
                          <th className="hidden px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 sm:table-cell">
                            Forecast
                          </th>
                          <th className="hidden px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 md:table-cell">
                            Previous
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2530]/50">
                        {dateReleases.map((release) => {
                          const hasActual = !!release.actual;
                          const flag =
                            FLAG_MAP[release.indicator?.country_code ?? ""] ?? "🌐";
                          const actualTone = getActualToneClass(
                            release.actual,
                            release.forecast
                          );

                          return (
                            <tr
                              key={release.id}
                              className={`transition-colors hover:bg-[#1a1f2e] ${
                                hasActual ? "opacity-60" : ""
                              }`}
                            >
                              <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs text-zinc-500 sm:px-4">
                                {formatTime(release.release_at, timeZone)}
                              </td>

                              <td className="whitespace-nowrap px-2 py-2.5 sm:px-4">
                                <span className="inline-flex items-center gap-1.5 text-sm">
                                  <span>{flag}</span>
                                  <span className="font-medium text-zinc-300">
                                    {release.indicator?.country_code ?? "—"}
                                  </span>
                                </span>
                              </td>

                              <td className="px-2 py-2.5 sm:px-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                                      release.indicator?.impact === "high"
                                        ? "bg-red-500"
                                        : release.indicator?.impact === "medium"
                                          ? "bg-yellow-500"
                                          : "bg-zinc-600"
                                    }`}
                                    title={`${release.indicator?.impact ?? "low"} impact`}
                                  />
                                  {release.indicator ? (
                                    <Link
                                      href={`/indicator/${release.indicator.id}`}
                                      className="text-sm font-medium text-zinc-200 hover:text-blue-400 transition-colors line-clamp-2"
                                    >
                                      {release.indicator.normalized_name ||
                                        release.indicator.name}
                                    </Link>
                                  ) : (
                                    <span className="text-sm text-zinc-500">
                                      Unknown
                                    </span>
                                  )}
                                  <RevisionBadge revisions={release.revision_history} />
                                </div>
                              </td>

                              <td className="whitespace-nowrap px-2 py-2.5 text-right sm:px-4">
                                {release.actual ? (
                                  <span className={`text-sm font-semibold ${actualTone}`}>
                                    {release.actual}
                                  </span>
                                ) : (
                                  <span className="text-sm text-zinc-600">—</span>
                                )}
                              </td>

                              <td className="hidden whitespace-nowrap px-4 py-2.5 text-right text-sm text-zinc-400 sm:table-cell">
                                {release.forecast ?? "—"}
                              </td>

                              <td className="hidden whitespace-nowrap px-4 py-2.5 text-right text-sm text-zinc-500 md:table-cell">
                                {release.previous ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
