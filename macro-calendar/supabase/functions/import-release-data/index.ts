/**
 * Release Data Importer
 * Fetches actual values from FRED, BLS, ECB APIs
 * Runs every 15 minutes to catch new releases
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting data import...');

    // Get API credentials
    const { data: dataSources } = await supabase
      .from('data_sources')
      .select('*')
      .in('name', ['fred', 'bls', 'ecb'])
      .eq('enabled', true);

    if (!dataSources || dataSources.length === 0) {
      throw new Error('No enabled data sources found');
    }

    const apiKeys = Object.fromEntries(
      dataSources.map(ds => [ds.name, ds.auth_config.api_key])
    );

    // Find releases that need data (release_at <= now AND actual IS NULL)
    const now = new Date();
    const { data: pendingReleases } = await supabase
      .from('releases')
      .select(`
        id,
        indicator_id,
        release_at,
        period,
        indicators (
          name,
          country_code,
          category,
          source_name
        )
      `)
      .lte('release_at', now.toISOString())
      .is('actual', null)
      .limit(50); // Process max 50 per run

    if (!pendingReleases || pendingReleases.length === 0) {
      console.log('No pending releases');
      return new Response(
        JSON.stringify({ success: true, releases_updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingReleases.length} pending releases`);

    let updated = 0;
    const errors: string[] = [];

    for (const release of pendingReleases) {
      try {
        const indicator = release.indicators;
        let actualValue: string | null = null;

        // Try to fetch from appropriate API
        if (indicator.country_code === 'USD' && apiKeys.fred) {
          actualValue = await fetchFromFRED(indicator.name, apiKeys.fred);
        } else if (indicator.country_code === 'USD' && apiKeys.bls) {
          actualValue = await fetchFromBLS(indicator.name, apiKeys.bls);
        } else if (indicator.country_code.startsWith('EU') && apiKeys.ecb) {
          actualValue = await fetchFromECB(indicator.name);
        }

        if (actualValue) {
          const { error } = await supabase
            .from('releases')
            .update({ actual: actualValue })
            .eq('id', release.id);

          if (!error) {
            updated++;
            console.log(`Updated ${indicator.name}: ${actualValue}`);
          } else {
            errors.push(`Update failed for ${indicator.name}: ${error.message}`);
          }
        }
      } catch (err) {
        errors.push(`Error fetching ${release.indicators.name}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        releases_checked: pendingReleases.length,
        releases_updated: updated,
        errors_count: errors.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchFromFRED(indicatorName: string, apiKey: string): Promise<string | null> {
  try {
    // Map indicator names to FRED series IDs
    const seriesMap: Record<string, string> = {
      'CPI': 'CPIAUCSL',
      'Unemployment Rate': 'UNRATE',
      'GDP': 'GDP',
      'Nonfarm Payrolls': 'PAYEMS',
      // Add more mappings as needed
    };

    const seriesId = seriesMap[indicatorName];
    if (!seriesId) return null;

    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`
    );

    const data = await response.json();
    if (data.observations && data.observations.length > 0) {
      return data.observations[0].value;
    }
  } catch (err) {
    console.error('FRED fetch failed:', err);
  }
  return null;
}

async function fetchFromBLS(indicatorName: string, apiKey: string): Promise<string | null> {
  try {
    // Map indicator names to BLS series IDs
    const seriesMap: Record<string, string> = {
      'Nonfarm Payrolls': 'CES0000000001',
      'Unemployment Rate': 'LNS14000000',
      // Add more mappings
    };

    const seriesId = seriesMap[indicatorName];
    if (!seriesId) return null;

    const endYear = new Date().getFullYear();
    const startYear = endYear - 1;

    const response = await fetch(
      `https://api.bls.gov/publicAPI/v2/timeseries/data/${seriesId}?registrationkey=${apiKey}&startyear=${startYear}&endyear=${endYear}`,
      { method: 'GET' }
    );

    const data = await response.json();
    if (data.Results && data.Results.series && data.Results.series[0].data.length > 0) {
      return data.Results.series[0].data[0].value;
    }
  } catch (err) {
    console.error('BLS fetch failed:', err);
  }
  return null;
}

async function fetchFromECB(indicatorName: string): Promise<string | null> {
  try {
    // ECB API implementation - simplified for now
    // Real implementation would map indicators to ECB series codes
    console.log(`ECB fetch for ${indicatorName} - not implemented yet`);
  } catch (err) {
    console.error('ECB fetch failed:', err);
  }
  return null;
}
