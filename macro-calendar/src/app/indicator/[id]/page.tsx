import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import Link from "next/link";
import type { Metadata } from "next";
import { WatchlistButton } from "@/app/components/WatchlistButton";
import { RevisionHistory } from "@/app/components/RevisionHistory";
import { ExportButton } from "@/app/components/ExportButton";

const FLAG_MAP: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", CAD: "🇨🇦",
  AUD: "🇦🇺", INR: "🇮🇳", BRL: "🇧🇷", MXN: "🇲🇽", ZAR: "🇿🇦",
  SGD: "🇸🇬", SAR: "🇸🇦", TRY: "🇹🇷", IDR: "🇮🇩", KR: "🇰🇷",
  ARS: "🇦🇷", RUB: "🇷🇺", EU: "🇪🇺",
};

const indicatorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  country_code: z.string(),
  category: z.string(),
  source_name: z.string().nullable(),
  source_url: z.string().nullable(),
});

const revisionRecordSchema = z.object({
  previous_actual: z.string(),
  new_actual: z.string(),
  revised_at: z.string(),
});

const releaseSchema = z.object({
  id: z.string().uuid(),
  release_at: z.string(),
  period: z.string().nullable(),
  actual: z.string().nullable(),
  forecast: z.string().nullable(),
  previous: z.string().nullable(),
  revised: z.string().nullable(),
  unit: z.string().nullable(),
  revision_history: z.array(revisionRecordSchema).catch([]),
});

type Indicator = z.infer<typeof indicatorSchema>;
type Release = z.infer<typeof releaseSchema>;
type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getIndicator(id: string): Promise<DataResult<Indicator>> {
  const uuidResult = z.string().uuid().safeParse(id);
  if (!uuidResult.success) {
    return { success: false, error: "Invalid indicator ID format." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("indicators")
    .select("id, name, country_code, category, source_name, source_url")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: false, error: "Indicator not found." };
    }
    return { success: false, error: "Unable to load indicator." };
  }

  const validated = indicatorSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: "Invalid data format." };
  }
  return { success: true, data: validated.data };
}

async function getHistoricalReleases(indicatorId: string): Promise<DataResult<Release[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("releases")
    .select("id, release_at, period, actual, forecast, previous, revised, unit, revision_history")
    .eq("indicator_id", indicatorId)
    .order("release_at", { ascending: false })
    .limit(200);

  if (error) {
    return { success: false, error: "Unable to load releases." };
  }

  const validated = z.array(releaseSchema).safeParse(data ?? []);
  if (!validated.success) {
    return { success: false, error: "Invalid data format." };
  }
  return { success: true, data: validated.data };
}

function formatReleaseDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getIndicator(id);
  if (!result.success) {
    return { title: "Indicator Not Found" };
  }
  const indicator = result.data;
  const flag = FLAG_MAP[indicator.country_code] ?? "";
  return {
    title: `${flag} ${indicator.name} (${indicator.country_code})`,
    description: `Historical releases for ${indicator.name} — ${indicator.category} from ${indicator.country_code}`,
  };
}

export default async function IndicatorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getIndicator(id);

  if (!result.success) {
    if (result.error === "Indicator not found." || result.error === "Invalid indicator ID format.") {
      notFound();
    }
    return (
      <main className="min-h-screen bg-[#0b0e11] p-6">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
            ← Back to Calendar
          </Link>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <p className="text-sm text-red-400">{result.error}</p>
          </div>
        </div>
      </main>
    );
  }

  const indicator = result.data;
  const releasesResult = await getHistoricalReleases(id);
  const flag = FLAG_MAP[indicator.country_code] ?? "🌐";

  return (
    <main className="min-h-screen bg-[#0b0e11]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back to Calendar
        </Link>

        {/* Indicator Header */}
        <div className="mb-6 rounded-xl border border-[#1e2530] bg-[#151921] p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{flag}</span>
                <span className="rounded bg-[#1e2530] px-2 py-0.5 text-xs font-medium text-zinc-400">
                  {indicator.country_code}
                </span>
                <span className="rounded bg-[#1e2530] px-2 py-0.5 text-xs text-zinc-500">
                  {indicator.category}
                </span>
              </div>
              <h1 className="text-xl font-semibold text-white sm:text-2xl">
                {indicator.name}
              </h1>
            </div>
            <WatchlistButton indicatorId={indicator.id} />
          </div>
          
          {indicator.source_name && (
            <div className="text-xs text-zinc-500">
              Source:{" "}
              {indicator.source_url ? (
                <a
                  href={indicator.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400/70 hover:text-blue-400"
                >
                  {indicator.source_name}
                </a>
              ) : (
                indicator.source_name
              )}
            </div>
          )}
        </div>

        {/* Historical Releases */}
        <div className="rounded-xl border border-[#1e2530] bg-[#151921]">
          <div className="flex items-center justify-between border-b border-[#1e2530] px-6 py-4">
            <h2 className="text-sm font-medium text-zinc-300">
              Historical Releases
            </h2>
            {releasesResult.success && releasesResult.data.length > 0 && (
              <ExportButton
                downloadUrl={`/api/export/indicators/${indicator.id}`}
                label="Export"
              />
            )}
          </div>

          {!releasesResult.success ? (
            <div className="px-6 py-8">
              <p className="text-sm text-red-400">{releasesResult.error}</p>
            </div>
          ) : releasesResult.data.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-zinc-500">No historical releases available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e2530] text-left">
                    <th className="px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      Date
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
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      Surprise
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2530]/50">
                  {releasesResult.data.map((release) => {
                    const surprise = release.actual && release.forecast
                      ? (parseFloat(release.actual) - parseFloat(release.forecast))
                      : null;
                    const surpriseStr = surprise !== null && !isNaN(surprise)
                      ? (surprise > 0 ? "+" : "") + surprise.toFixed(2)
                      : null;
                    const surpriseColor = surprise !== null && !isNaN(surprise)
                      ? surprise > 0
                        ? "text-emerald-400"
                        : surprise < 0
                          ? "text-red-400"
                          : "text-zinc-500"
                      : "text-zinc-600";

                    return (
                      <tr
                        key={release.id}
                        className="transition-colors hover:bg-[#1a1f2e]"
                      >
                        <td className="whitespace-nowrap px-6 py-2.5 text-sm text-zinc-400">
                          {formatReleaseDate(release.release_at)}
                          {release.period && (
                            <span className="ml-2 text-xs text-zinc-600">
                              {release.period}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          {release.actual ? (
                            <span className="text-sm font-semibold text-emerald-400">
                              {release.actual}
                            </span>
                          ) : (
                            <span className="text-sm text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-zinc-400">
                          {release.forecast ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-zinc-500">
                          {release.previous ?? "—"}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-2.5 text-right text-sm font-medium ${surpriseColor}`}>
                          {surpriseStr ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {releasesResult.data.length >= 200 && (
                <p className="border-t border-[#1e2530] px-6 py-3 text-xs text-zinc-600">
                  Showing most recent 200 releases.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Revision History */}
        {releasesResult.success && releasesResult.data.some((r) => r.revision_history.length > 0) && (
          <div className="mt-6 rounded-xl border border-[#1e2530] bg-[#151921] p-6">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">
              Revision History
            </h2>
            <RevisionHistory
              revisions={releasesResult.data.flatMap((r) => r.revision_history)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
