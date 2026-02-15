
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImpact() {
  const { data: all, error } = await supabase
    .from('indicators')
    .select('name, country_code, impact');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts = {};
  all.forEach(i => {
    const val = i.impact || 'null';
    counts[val] = (counts[val] || 0) + 1;
  });

  console.log('Impact distribution:', counts);
  
  // Show some High impact examples
  const high = all.filter(i => i.impact === 'High').slice(0, 10);
  console.log('\nHigh Impact Examples:');
  high.forEach(i => console.log(`${i.country_code} - ${i.name}`));
}

checkImpact();
