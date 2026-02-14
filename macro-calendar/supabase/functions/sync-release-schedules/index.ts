/**
 * Release Schedule Sync Orchestrator
 * Runs TradingEconomics scraper
 * Triggered by cron daily
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('Starting schedule sync...');

    // Run TradingEconomics scraper
    const teResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-tradingeconomics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!teResponse.ok) {
      const errorText = await teResponse.text();
      console.error(`TradingEconomics HTTP error: ${teResponse.status}`, errorText);
      throw new Error(`HTTP ${teResponse.status}: ${errorText}`);
    }

    const result = await teResponse.json();
    console.log('Scraper result:', JSON.stringify(result));
    
    if (result.success) {
      console.log(`TradingEconomics success: ${result.releases_found} releases`);
      
      return new Response(
        JSON.stringify({
          success: true,
          source: 'tradingeconomics',
          ...result,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Scraper returned success=false:', result);
      throw new Error(`TradingEconomics scrape failed: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Sync failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
