// TradingEconomics Scraper - Edge Function
// Fetches economic calendar from https://tradingeconomics.com/calendar

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

interface ReleaseSchedule {
  indicator_name: string;
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
        const cells = tr.querySelectorAll("td");
        
        if (cells.length < 5) continue; // Skip if not enough columns

        // Extract from data attributes (more reliable than parsing HTML)
        const countryAttr = tr.getAttribute("data-country") || "";
        const eventAttr = tr.getAttribute("data-event") || "";
        const categoryAttr = tr.getAttribute("data-category") || "";

        // Column 0: Time
        const timeSpan = cells[0]?.querySelector("span");
        const timeText = timeSpan?.textContent?.trim() || "";
        
        // Column 1: Country ISO code (in nested table)
        const isoCell = cells[1]?.querySelector("td.calendar-iso");
        const countryCode = isoCell?.textContent?.trim() || "";

        // Column 2: Event name
        const eventSpan = cells[2]?.querySelector("span");
        let indicatorName = eventSpan?.textContent?.trim() || eventAttr;
        
        // Column 3: Actual value
        const actualSpan = cells[3]?.querySelector("span#actual");
        const actualValue = actualSpan?.textContent?.trim() || null;

        // Column 4: Previous value
        const previousSpan = cells[4]?.querySelector("span#previous");
        const previousValue = previousSpan?.textContent?.trim() || null;

        // Column 5: Consensus
        const consensusSpan = cells[5]?.querySelector("span#consensus");
        const consensusValue = consensusSpan?.textContent?.trim() || null;

        // Column 6: Forecast (if exists)
        const forecastValue = consensusValue || null;

        if (!indicatorName || !countryCode || !timeText) continue;

        // Extract period from indicator name if present
        const periodMatch = indicatorName.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|Q[1-4])\b/i);
        const period = periodMatch ? periodMatch[1] : null;

        // Parse time (format: "HH:MM AM/PM")
        const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!timeMatch) continue;
        
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[3].toUpperCase();
        
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;

        // Get date from class attribute or use current date
        const dateClass = cells[0]?.getAttribute("class") || "";
        const dateMatch = dateClass.match(/(\d{4})-(\d{2})-(\d{2})/);
        
        if (dateMatch) {
          currentDate = new Date(dateMatch[0]);
        }

        const releaseDate = new Date(currentDate);
        releaseDate.setUTCHours(hours, minutes, 0, 0);

        releases.push({
          indicator_name: indicatorName,
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
            country_code: r.country_code,
            category: r.category,
            source_name: "TradingEconomics",
            source_url: "https://tradingeconomics.com/calendar",
          }
        ])
      ).values()
    );

    const { data: indicators, error: indicatorsError } = await supabase
      .from("indicators")
      .upsert(uniqueIndicators, {
        onConflict: "name,country_code",
        ignoreDuplicates: false,
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

    // Prepare releases with indicator IDs
    const releasesToInsert = releases
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
  
  if (lower.includes("inflation") || lower.includes("cpi") || lower.includes("ppi")) {
    return "Inflation";
  }
  if (lower.includes("gdp") || lower.includes("growth")) {
    return "GDP & Growth";
  }
  if (lower.includes("employment") || lower.includes("unemployment") || lower.includes("jobless") || lower.includes("payroll")) {
    return "Employment";
  }
  if (lower.includes("retail") || lower.includes("sales")) {
    return "Retail & Consumption";
  }
  if (lower.includes("rate") || lower.includes("fed") || lower.includes("ecb") || lower.includes("boe") || lower.includes("boj")) {
    return "Monetary Policy";
  }
  if (lower.includes("trade") || lower.includes("export") || lower.includes("import")) {
    return "Trade";
  }
  if (lower.includes("manufacturing") || lower.includes("industrial") || lower.includes("production")) {
    return "Manufacturing";
  }
  if (lower.includes("pmi") || lower.includes("business confidence") || lower.includes("sentiment")) {
    return "Business Surveys";
  }
  if (lower.includes("housing") || lower.includes("building")) {
    return "Housing";
  }
  
  return "Other";
}
