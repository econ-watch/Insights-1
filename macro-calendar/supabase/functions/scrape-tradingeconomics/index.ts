// TradingEconomics Scraper - Edge Function
// Fetches economic calendar from https://tradingeconomics.com/calendar

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

interface ReleaseSchedule {
  indicator_name: string;
  raw_indicator_name: string;
  release_at: string;
  period: string | null;
  country_code: string;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  category: string;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch TradingEconomics calendar page
    const response = await fetch("https://tradingeconomics.com/calendar");
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.statusText}`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error("Failed to parse HTML");

    const releases: ReleaseSchedule[] = [];
    
    // Find all calendar table rows
    const rows = doc.querySelectorAll("table#calendar tr[data-url]");
    
    let currentDate = new Date();

    for (const row of Array.from(rows)) {
      try {
        const tr = row as Element;

        // Extract from data attributes (most reliable)
        const eventAttr = tr.getAttribute("data-event") || "";
        const categoryAttr = tr.getAttribute("data-category") || "";

        // Time: first span in first td
        const timeSpan = tr.querySelector("span.calendar-date-1") || tr.querySelector("td span");
        const timeText = timeSpan?.textContent?.trim() || "";

        // Country: from nested table with calendar-iso class
        const isoCell = tr.querySelector("td.calendar-iso");
        const countryCode = isoCell?.textContent?.trim() || "";

        // Event name: from the calendar-event link
        const eventLink = tr.querySelector("a.calendar-event");
        const rawIndicatorName = eventLink?.textContent?.trim() || eventAttr;

        // First clean casing/format, then apply canonical normalization
        const titleCasedIndicator = toTitleCase(rawIndicatorName);
        const indicatorName = normalizeIndicatorName(titleCasedIndicator);

        // Values: use ID selectors directly on the row (avoids cell index issues from nested tables)
        const actualEl = tr.querySelector("[id='actual']");
        const actualValue = actualEl?.textContent?.trim() || null;

        const previousEl = tr.querySelector("[id='previous']");
        const previousValue = previousEl?.textContent?.trim() || null;

        // Consensus and forecast can be <a> or <span> tags
        const consensusEl = tr.querySelector("[id='consensus']");
        const consensusValue = consensusEl?.textContent?.trim() || null;

        const forecastEl = tr.querySelector("[id='forecast']");
        const forecastRaw = forecastEl?.textContent?.trim() || null;

        // Use consensus as primary forecast, fall back to forecast column
        const forecastValue = consensusValue || forecastRaw || null;

        if (!indicatorName || !countryCode || !timeText) continue;

        // Extract period from calendar-reference span (e.g., "JAN", "Q4")
        const periodSpan = tr.querySelector("span.calendar-reference");
        const period = periodSpan?.textContent?.trim() || null;

        // Parse time (format: "HH:MM AM/PM")
        // TradingEconomics returns UTC times by default when no timezone cookie is set.
        // We verified this by checking US releases (e.g. Core PCE at 1:30 PM UTC).
        const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!timeMatch) continue;
        
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[3].toUpperCase();
        
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;

        // Get date from the time cell's class attribute (e.g., class=' 2026-02-15')
        const timeTd = tr.querySelector("td[class*='20']");
        const timeCellClass = timeTd?.getAttribute("class") || "";
        const dateMatch = timeCellClass.match(/(\d{4}-\d{2}-\d{2})/);
        
        if (dateMatch) {
          currentDate = new Date(dateMatch[1] + "T00:00:00Z");
        }

        const releaseDate = new Date(currentDate);
        releaseDate.setUTCHours(hours, minutes, 0, 0);

        releases.push({
          indicator_name: indicatorName,
          raw_indicator_name: titleCasedIndicator,
          release_at: releaseDate.toISOString(),
          period,
          country_code: mapCountryCode(countryCode),
          forecast: forecastValue,
          previous: previousValue,
          actual: actualValue,
          category: inferCategory(categoryAttr, indicatorName),
        });
      } catch (err) {
        console.error("Error parsing row:", err);
        continue;
      }
    }

    // Ensure TradingEconomics data source exists
    const { data: dataSource, error: dsError } = await supabase
      .from("data_sources")
      .upsert({
        name: "TradingEconomics",
        type: "scraper",
        base_url: "https://tradingeconomics.com/calendar",
        enabled: true,
      }, { onConflict: "name" })
      .select("id")
      .single();

    if (dsError || !dataSource) {
      throw new Error(`Failed to get/create data source: ${dsError?.message}`);
    }

    // Create sync log
    const syncLog = await supabase
      .from("sync_logs")
      .insert({
        data_source_id: dataSource.id,
        status: "success",
        records_processed: releases.length,
        errors_count: 0,
        metadata: { scraped_at: new Date().toISOString() },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (syncLog.error) {
      console.error("Failed to create sync log:", syncLog.error);
    }

    // Batch upsert indicators
    const uniqueIndicators = Array.from(
      new Map(
        releases.map(r => [
          `${r.indicator_name}:${r.country_code}`,
          {
            name: r.indicator_name,
            raw_name: r.raw_indicator_name,
            normalized_name: r.indicator_name,
            country_code: r.country_code,
            category: r.category,
          }
        ])
      ).values()
    );

    const { data: indicators, error: indicatorsError } = await supabase
      .from("indicators")
      .upsert(uniqueIndicators, {
        onConflict: "name,country_code",
        ignoreDuplicates: true,
      })
      .select("id,name,country_code");

    if (indicatorsError) {
      console.error("Failed to upsert indicators:", indicatorsError);
      throw indicatorsError;
    }

    // Map indicator names to IDs
    const indicatorMap = new Map(
      (indicators || []).map(ind => [
        `${ind.name}:${ind.country_code}`,
        ind.id
      ])
    );

    // Prepare releases with indicator IDs, deduplicate by indicator_id + release_at
    const releasesRaw = releases
      .map(r => {
        const indicatorId = indicatorMap.get(`${r.indicator_name}:${r.country_code}`);
        if (!indicatorId) return null;

        return {
          indicator_id: indicatorId,
          release_at: r.release_at,
          period: r.period,
          forecast: r.forecast,
          previous: r.previous,
          actual: r.actual,
        };
      })
      .filter(Boolean);

    // Deduplicate: keep last occurrence (most complete data) for each indicator+time pair
    const deduped = new Map<string, typeof releasesRaw[0]>();
    for (const r of releasesRaw) {
      if (!r) continue;
      const key = `${r.indicator_id}:${r.release_at}`;
      deduped.set(key, r);
    }
    const releasesToInsert = Array.from(deduped.values());

    // Bulk insert releases using database function (handles duplicates efficiently)
    const { data: result, error: insertError } = await supabase
      .rpc("bulk_insert_releases", {
        releases_data: releasesToInsert,
      })
      .single();

    if (insertError) {
      console.error("Bulk insert error:", insertError);
      throw insertError;
    }

    const inserted = result?.inserted || 0;
    const skipped = result?.skipped || 0;

    console.log(`Inserted ${inserted} releases, ${skipped} skipped (duplicates)`);

    return new Response(
      JSON.stringify({
        success: true,
        releases_found: releases.length,
        releases_inserted: inserted,
        errors_count: skipped,
        sample: releases.slice(0, 5),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scraper error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// Map TradingEconomics country codes to 3-letter currency codes
function mapCountryCode(code: string): string {
  const map: Record<string, string> = {
    US: "USD",
    EA: "EUR",
    GB: "GBP",
    JP: "JPY",
    CA: "CAD",
    AU: "AUD",
    NZ: "NZD",
    CH: "CHF",
    CN: "CNY",
    DE: "EUR",
    FR: "EUR",
    IT: "EUR",
    ES: "EUR",
    IN: "INR",
    BR: "BRL",
    MX: "MXN",
    ZA: "ZAR",
    RU: "RUB",
    TR: "TRY",
    SA: "SAR",
    SG: "SGD",
    ID: "IDR",
    AR: "ARS",
  };
  return map[code] || code;
}

// Infer category from indicator slug or name
function inferCategory(slug: string, name: string): string {
  const lower = `${slug} ${name}`.toLowerCase();
  
  if (lower.includes("inflation") || lower.includes("cpi") || lower.includes("ppi") || lower.includes("price index") || lower.includes("prices") || lower.includes("deflator")) {
    return "Inflation";
  }
  if (lower.includes("gdp") || lower.includes("growth")) {
    return "GDP & Growth";
  }
  if (lower.includes("employ") || lower.includes("unemploy") || lower.includes("jobless") || lower.includes("payroll") || lower.includes("job") || lower.includes("labor") || lower.includes("labour") || lower.includes("wage") || lower.includes("earnings") || lower.includes("claimant") || lower.includes("personal income")) {
    return "Employment";
  }
  if (lower.includes("rate decision") || lower.includes("interest rate") || lower.includes("fed ") || lower.includes("ecb ") || lower.includes("boe ") || lower.includes("boj ") || lower.includes("central bank") || lower.includes("monetary") || lower.includes("fomc") || lower.includes("minutes") || lower.includes("speech")) {
    return "Monetary Policy";
  }
  if (lower.includes("crude oil") || lower.includes("natural gas") || lower.includes("gasoline") || lower.includes("distillate") || lower.includes("heating oil") || lower.includes("refinery") || lower.includes("baker hughes") || lower.includes("rig count") || lower.includes("fuel")) {
    return "Energy";
  }
  if (lower.includes("retail") || lower.includes("consumer spend") || lower.includes("consumer conf") || lower.includes("consumer credit") || lower.includes("personal spend") || lower.includes("car registr") || lower.includes("tourist") || lower.includes("redbook") || lower.includes("sales")) {
    return "Retail & Consumption";
  }
  if (lower.includes("trade") || lower.includes("export") || lower.includes("import") || lower.includes("balance of") || lower.includes("current account")) {
    return "Trade";
  }
  if (lower.includes("manufactur") || lower.includes("industrial") || lower.includes("production") || lower.includes("factory") || lower.includes("capacity") || lower.includes("durable goods") || lower.includes("machinery order") || lower.includes("goods orders") || lower.includes("wholesale inv")) {
    return "Manufacturing";
  }
  if (lower.includes("pmi") || lower.includes("business conf") || lower.includes("business climate") || lower.includes("sentiment") || lower.includes("survey") || lower.includes("ifo") || lower.includes("zew") || lower.includes("tankan") || lower.includes("michigan") || lower.includes("leading index") || lower.includes("economic activity")) {
    return "Business Surveys";
  }
  if (lower.includes("housing") || lower.includes("building") || lower.includes("home") || lower.includes("mortgage") || lower.includes("construction") || lower.includes("mba") || lower.includes("purchase index")) {
    return "Housing";
  }
  if (lower.includes("auction") || lower.includes("bond") || lower.includes("treasury") || lower.includes("bill") || lower.includes("yield")) {
    return "Bonds & Auctions";
  }
  if (lower.includes("money supply") || lower.includes("m2") || lower.includes("m3") || lower.includes("lending") || lower.includes("loan") || lower.includes("credit") || lower.includes("bank")) {
    return "Money & Credit";
  }
  if (lower.includes("foreign direct") || lower.includes("capital flow") || lower.includes("tic flow") || lower.includes("securities purchase") || lower.includes("stock investment") || lower.includes("foreign exchange res")) {
    return "Capital Flows";
  }
  if (lower.includes("budget") || lower.includes("debt") || lower.includes("fiscal") || lower.includes("government") || lower.includes("revenue") || lower.includes("spending")) {
    return "Government";
  }
  
  return "Other";
}

function normalizeIndicatorName(rawName: string): string {
  let normalized = rawName.trim();

  const replacements: Array<[RegExp, string]> = [
    [/\bPpi\b/g, "PPI"],
    [/\bCpi\b/g, "CPI"],
    [/\bGdp\b/g, "GDP"],
    [/\bPce\b/g, "PCE"],
    [/\bPmi\b/g, "PMI"],
    [/\bEcb\b/g, "ECB"],
    [/\bBoe\b/g, "BoE"],
    [/\bBoj\b/g, "BoJ"],
    [/\bRba\b/g, "RBA"],
    [/\bS&p\b/g, "S&P"],
  ];

  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized.replace(/\s+(YoY|MoM|QoQ)$/, " ($1)");

  return normalized;
}

// Convert string to Title Case (e.g. "10-year bund auction" -> "10-Year Bund Auction")
// Respects common acronyms
function toTitleCase(str: string): string {
  const keepUppercase = new Set([
    "YOY", "MOM", "QOQ", "PMI", "CPI", "GDP", "ADP", "ZEW", "IFO", 
    "ECB", "BOE", "BOJ", "RBA", "FOMC", "USD", "EUR", "GBP", "JPY", 
    "CAD", "AUD", "NZD", "CHF", "CNY", "S&P", "HSBC", "HCOB", "JGB", 
    "OAT", "BTF", "KTB", "UK", "US", "EU", "MBA", "NY", "API", "EIA",
    "NFIB", "ISM", "JOLTS", "NFP", "TBILL", "T-BILL", "FED", "PCE", "BOC"
  ]);

  return str.split(' ').map(word => {
    // Handle "10-year" -> "10-Year"
    if (word.includes('-')) {
      return word.split('-').map(part => {
        const cleanPart = part.replace(/[^a-zA-Z0-9&]/g, '');
        const upper = cleanPart.toUpperCase();
        if (keepUppercase.has(upper)) return part.replace(cleanPart, upper);
        if (cleanPart.length === 0) return part;
        const titled = cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1).toLowerCase();
        return part.replace(cleanPart, titled);
      }).join('-');
    }
    
    const cleanWord = word.replace(/[^a-zA-Z0-9&]/g, '');
    const upper = cleanWord.toUpperCase();
    if (keepUppercase.has(upper)) return word.replace(cleanWord, upper);
    if (cleanWord.length === 0) return word;
    
    const titled = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
    return word.replace(cleanWord, titled);
  }).join(' ');
}
