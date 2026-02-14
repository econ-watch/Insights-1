import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { CalendarFilters } from "./components/CalendarFilters";
import { RevisionBadge } from "./components/RevisionBadge";
import { z } from "zod";
import Link from "next/link";

// --- Zod schemas (unchanged) ---
const indicatorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  country_code: z.string(),
  category: z.string(),
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
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
  NZD: "🇳🇿",
  CHF: "🇨🇭",
  CNY: "🇨🇳",
  INR: "🇮🇳",
  BRL: "🇧🇷",
  MXN: "🇲🇽",
  KR: "🇰🇷",
  KRW: "🇰🇷",
  SGD: "🇸🇬",
  SAR: "🇸🇦",
  TRY: "🇹🇷",
  ZAR: "🇿🇦",
  RUB: "🇷🇺",
  IDR: "🇮🇩",
  ARS: "🇦🇷",
  EU: "🇪🇺",
};

// --- Data fetchers (unchanged logic) ---
async function getFilterOptions(): Promise<DataResult<FilterOptions>> {
  const supabase = await createSupabaseServerClient();
  const [countriesResult, categoriesResult] = await Promise.all([
    supabase.from("indicators").select("country_code").order("country_code"),
    supabase.from("indicators").select("category").order("category"),
  ]);

  if (countriesResult.error || categoriesResult.error) {
    return {
      success: false,
      error: "Unable to load filter options.",
    };
  }

  const countries = [
    ...new Set(
      (countriesResult.data ?? []).map((row) => row.country_code).filter(Boolean)
    ),
  ];
  const categories = [
    ...new Set(
      (categoriesResult.data ?? []).map((row) => row.category).filter(Boolean)
    ),
  ];

  try {
    const validated = filterOptionsSchema.parse({ countries, categories });
    return { success: true, data: validated };
  } catch {
    return { success: false, error: "Invalid filter data." };
  }
}

async function getUpcomingReleases(filters: {
  country?: string;
  category?: string;
  search?: string;
  watchlistOnly?: boolean;
  userId?: string;
}): Promise<DataResult<ReleaseWithIndicator[]>> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let watchlistIndicatorIds: string[] = [];
  if (filters.watchlistOnly && filters.userId) {
    const { data: watchlistData, error: watchlistError } = await supabase
      .from("watchlist")
      .select("indicator_id")
      .eq("user_id", filters.userId);

    if (watchlistError) {
      return { success: false, error: "Unable to load watchlist." };
    }
    watchlistIndicatorIds = watchlistData.map((row) => row.indicator_id);
    if (watchlistIndicatorIds.length === 0) {
      return { success: true, data: [] };
    }
  }

  let query = supabase
    .from("releases")
    .select(
      `id, release_at, period, actual, forecast, previous, revised, revision_history,
       indicator:indicators!inner (id, name, country_code, category)`
    )
    .gte("release_at", now.toISOString())
    .lte("release_at", thirtyDaysFromNow.toISOString());

  if (filters.watchlistOnly && watchlistIndicatorIds.length > 0) {
    query = query.in("indicator_id", watchlistIndicatorIds);
  }
  if (filters.country) {
    query = query.eq("indicator.country_code", filters.country);
  }
  if (filters.category) {
    query = query.eq("indicator.category", filters.category);
  }
  if (filters.search) {
    query = query.ilike("indicator.name", `%${filters.search}%`);
  }

  const { data, error } = await query.order("release_at", { ascending: true });

  if (error) {
    return { success: false, error: "Unable to load calendar data." };
  }

  try {
    const validated = z.array(releaseWithIndicatorSchema).parse(data ?? []);
    return { success: true, data: validated };
  } catch {
    return { success: false, error: "Received invalid data format from database." };
  }
}

// --- Helpers ---
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateHeader(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (isToday) return `Today — ${formatted}`;
  if (isTomorrow) return `Tomorrow — ${formatted}`;
  return formatted;
}

function getDateKey(isoString: string): string {
  return new Date(isoString).toDateString();
}

function groupByDate(
  releases: ReleaseWithIndicator[]
): Map<string, ReleaseWithIndicator[]> {
  const groups = new Map<string, ReleaseWithIndicator[]>();
  for (const release of releases) {
    const key = getDateKey(release.release_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(release);
  }
  return groups;
}

// --- Page ---
type PageProps = {
  searchParams: Promise<{
    country?: string;
    category?: string;
    search?: string;
    watchlist?: string;
  }>;
};

export default async function CalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();

  const filters = {
    country: params.country,
    category: params.category,
    search: params.search,
    watchlistOnly: params.watchlist === "true",
    userId: user?.id,
  };

  const [releasesResult, filterOptionsResult] = await Promise.all([
    getUpcomingReleases(filters),
    getFilterOptions(),
  ]);

  const hasError = !releasesResult.success || !filterOptionsResult.success;
  const errorMessage = !releasesResult.success
    ? releasesResult.error
    : !filterOptionsResult.success
      ? filterOptionsResult.error
      : null;

  const releases = releasesResult.success ? releasesResult.data : [];
  const filterOptions = filterOptionsResult.success
    ? filterOptionsResult.data
    : { countries: [], categories: [] };

  const dateGroups = groupByDate(releases);

  return (
    <div className="min-h-screen bg-[#0b0e11]">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Filters */}
        <CalendarFilters
          countries={filterOptions.countries}
          categories={filterOptions.categories}
          isAuthenticated={!!user}
        />

        {/* Error */}
        {hasError && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <p className="text-sm text-red-400">{errorMessage}</p>
          </div>
        )}

        {/* Stats bar */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {releases.length} release{releases.length !== 1 ? "s" : ""} in next
            30 days
          </p>
        </div>

        {/* Calendar */}
        {releases.length === 0 && !hasError ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#1e2530] bg-[#151921] py-20">
            <div className="mb-4 rounded-full bg-[#1e2530] p-4">
              <svg
                className="h-8 w-8 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-400">
              No upcoming releases
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {filters.country || filters.category || filters.search
                ? "Try adjusting your filters."
                : "No economic releases scheduled for the next 30 days."}
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
                      {formatDateHeader(dateReleases[0].release_at)}
                    </h2>
                    <div className="h-px flex-1 bg-[#1e2530]" />
                    <span className="text-xs text-zinc-600">
                      {dateReleases.length}
                    </span>
                  </div>

                  {/* Releases table */}
                  <div className="overflow-hidden rounded-lg border border-[#1e2530] bg-[#151921]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1e2530] text-left">
                          <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                            Time
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                            Currency
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                            Event
                          </th>
                          <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                            Actual
                          </th>
                          <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                            Forecast
                          </th>
                          <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                            Previous
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2530]/50">
                        {dateReleases.map((release) => {
                          const hasActual = !!release.actual;
                          const flag =
                            FLAG_MAP[
                              release.indicator?.country_code ?? ""
                            ] ?? "🌐";

                          return (
                            <tr
                              key={release.id}
                              className={`transition-colors hover:bg-[#1a1f2e] ${
                                hasActual ? "opacity-60" : ""
                              }`}
                            >
                              {/* Time */}
                              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-zinc-500">
                                {formatTime(release.release_at)}
                              </td>

                              {/* Currency */}
                              <td className="whitespace-nowrap px-4 py-2.5">
                                <span className="inline-flex items-center gap-1.5 text-sm">
                                  <span>{flag}</span>
                                  <span className="font-medium text-zinc-300">
                                    {release.indicator?.country_code ?? "—"}
                                  </span>
                                </span>
                              </td>

                              {/* Event name */}
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  {release.indicator ? (
                                    <Link
                                      href={`/indicator/${release.indicator.id}`}
                                      className="text-sm font-medium text-zinc-200 hover:text-blue-400 transition-colors"
                                    >
                                      {release.indicator.name}
                                    </Link>
                                  ) : (
                                    <span className="text-sm text-zinc-500">
                                      Unknown
                                    </span>
                                  )}
                                  <RevisionBadge
                                    revisions={release.revision_history}
                                  />
                                  {release.indicator?.category && (
                                    <span className="hidden rounded bg-[#1e2530] px-1.5 py-0.5 text-[10px] text-zinc-500 sm:inline">
                                      {release.indicator.category}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Actual */}
                              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                                {release.actual ? (
                                  <span className="text-sm font-semibold text-emerald-400">
                                    {release.actual}
                                  </span>
                                ) : (
                                  <span className="text-sm text-zinc-600">
                                    —
                                  </span>
                                )}
                              </td>

                              {/* Forecast */}
                              <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-zinc-400">
                                {release.forecast ?? "—"}
                              </td>

                              {/* Previous */}
                              <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-zinc-500">
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

// auto-deploy test
