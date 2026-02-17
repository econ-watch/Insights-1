/**
 * ForexFactory Calendar Scraper
 * Scrapes release schedules from ForexFactory.com
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Release {
  indicator_name: string;
  country_code: string;
  release_at: string;
  importance: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const startTime = Date.now();
    const errors: string[] = [];

    console.log('Starting ForexFactory scrape...');

    // Fetch ForexFactory calendar HTML
    const response = await fetch('https://www.forexfactory.com/calendar?week=this', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`ForexFactory returned ${response.status}`);
    }

    const html = await response.text();
    console.log(`Fetched ${html.length} bytes from ForexFactory`);

    // Parse HTML (simple regex-based extraction)
    // ForexFactory uses a table structure: <tr class="calendar__row">
    const releases: Release[] = parseForexFactoryHTML(html);
    
    console.log(`Parsed ${releases.length} releases`);

    let inserted = 0;
    const updated = 0;

    // Process each release
    for (const release of releases) {
      try {
        // Find matching indicator
        const { data: indicator, error: findError } = await supabase
          .from('indicators')
          .select('id')
          .ilike('name', `%${release.indicator_name}%`)
          .eq('country_code', release.country_code)
          .limit(1)
          .single();

        if (findError || !indicator) {
          errors.push(`No indicator match for: ${release.indicator_name} (${release.country_code})`);
          continue;
        }

        // Upsert release schedule
        const { error: upsertError } = await supabase
          .from('releases')
          .upsert({
            indicator_id: indicator.id,
            release_at: release.release_at,
            period: 'TBD', // ForexFactory doesn't always provide period
            actual: null,
            forecast: null,
            previous: null,
          }, {
            onConflict: 'indicator_id,release_at',
          });

        if (upsertError) {
          errors.push(`Upsert failed for ${release.indicator_name}: ${upsertError.message}`);
        } else {
          inserted++;
        }
      } catch (err) {
        errors.push(`Error processing ${release.indicator_name}: ${err.message}`);
      }
    }

    const duration = Date.now() - startTime;

    // Log to sync_logs
    const { data: dataSource } = await supabase
      .from('data_sources')
      .select('id')
      .eq('name', 'forexfactory')
      .single();

    if (dataSource) {
      await supabase.from('sync_logs').insert({
        data_source_id: dataSource.id,
        status: errors.length === 0 ? 'success' : 'partial',
        records_processed: releases.length,
        errors_count: errors.length,
        metadata: {
          duration_ms: duration,
          releases_found: releases.length,
          releases_inserted: inserted,
          releases_updated: updated,
          errors: errors.slice(0, 10), // Only store first 10 errors
        },
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        releases_found: releases.length,
        releases_inserted: inserted,
        errors_count: errors.length,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scrape failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseForexFactoryHTML(html: string): Release[] {
  const releases: Release[] = [];
  
  // Simple regex-based parsing (ForexFactory HTML structure)
  // Match calendar rows: <tr class="calendar__row" ...>
  const rowRegex = /<tr[^>]*class="[^"]*calendar__row[^"]*"[^>]*>(.*?)<\/tr>/gs;
  const rows = html.matchAll(rowRegex);

  for (const row of rows) {
    try {
      const rowHTML = row[1];
      
      // Extract country code
      const countryMatch = rowHTML.match(/title="([A-Z]{3})"/);
      if (!countryMatch) continue;
      const country_code = countryMatch[1];

      // Extract event name
      const eventMatch = rowHTML.match(/class="[^"]*calendar__event[^"]*"[^>]*>([^<]+)</);
      if (!eventMatch) continue;
      const indicator_name = eventMatch[1].trim();

      // Extract timestamp
      const timeMatch = rowHTML.match(/data-timestamp="(\d+)"/);
      if (!timeMatch) continue;
      const timestamp = parseInt(timeMatch[1]);
      const release_at = new Date(timestamp * 1000).toISOString();

      // Extract importance (number of bull icons)
      const importanceMatch = rowHTML.match(/class="[^"]*calendar__impact[^"]*icon--ff-impact-([a-z]+)/);
      const importance = importanceMatch ? importanceMatch[1] : 'low';

      releases.push({
        indicator_name,
        country_code,
        release_at,
        importance,
      });
    } catch (err) {
      console.error('Failed to parse row:', err);
    }
  }

  return releases;
}
