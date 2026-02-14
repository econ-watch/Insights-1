/**
 * Release Schedule Sync Orchestrator
 * Runs scrapers (ForexFactory primary, Investing.com fallback)
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

    // Try ForexFactory first
    let result: any;
    try {
      const ffResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-forexfactory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      });

      result = await ffResponse.json();
      
      if (result.success) {
        console.log(`ForexFactory success: ${result.releases_inserted} releases`);
        
        return new Response(
          JSON.stringify({
            success: true,
            source: 'forexfactory',
            ...result,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        throw new Error('ForexFactory scrape failed');
      }
    } catch (ffError) {
      console.error('ForexFactory failed:', ffError);
      
      // Fallback to Investing.com
      try {
        const invResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-investing`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        });

        result = await invResponse.json();
        
        if (result.success) {
          console.log(`Investing.com fallback success: ${result.releases_inserted} releases`);
          
          return new Response(
            JSON.stringify({
              success: true,
              source: 'investing_com',
              fallback: true,
              ...result,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (invError) {
        console.error('Investing.com also failed:', invError);
        throw new Error('Both scrapers failed');
      }
    }

    throw new Error('No scraper succeeded');
  } catch (error) {
    console.error('Sync failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
