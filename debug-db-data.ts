// Quick debug script to see what Supabase is actually returning
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ncnggnhpcvdcyspjqguv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbmdnbmhwY3ZkY3lzcGpxZ3V2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA1ODQ3MSwiZXhwIjoyMDg2NjM0NDcxfQ.-vGiG2Hrj0weOFHbWB3VPwoHHs87E2P5zn7InbuHd-g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugReleaseData() {
  console.log('Fetching release data...\n');
  
  const { data, error } = await supabase
    .from('releases')
    .select(`
      id,
      release_at,
      period,
      actual,
      forecast,
      previous,
      revised,
      revision_history,
      indicator:indicators!inner (
        id,
        name,
        country_code,
        category
      )
    `)
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Raw data from Supabase:');
  console.log(JSON.stringify(data, null, 2));
  
  // Check what type revision_history actually is
  if (data && data.length > 0) {
    const first = data[0];
    console.log('\n\nFirst release revision_history:');
    console.log('Type:', typeof first.revision_history);
    console.log('Value:', first.revision_history);
    console.log('Is array?', Array.isArray(first.revision_history));
    
    console.log('\n\nFirst release indicator:');
    console.log('Type:', typeof first.indicator);
    console.log('Value:', first.indicator);
    console.log('Is array?', Array.isArray(first.indicator));
  }
}

debugReleaseData();
