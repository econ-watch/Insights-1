
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkState() {
  // Check for duplicates
  const { data: indicators, error } = await supabase
    .from('indicators')
    .select('name, country_code, impact')
    .order('name');

  if (error) {
    console.error('Error fetching indicators:', error);
    return;
  }

  console.log(`Total indicators: ${indicators.length}`);

  // Check for impact
  const withImpact = indicators.filter(i => i.impact).length;
  console.log(`Indicators with impact rating: ${withImpact}`);

  // Check for Title Case / Duplicates
  const names = indicators.map(i => `${i.country_code} - ${i.name}`);
  const duplicates = names.filter((item, index) => names.indexOf(item) !== index);
  
  if (duplicates.length > 0) {
    console.log('Duplicates found:', duplicates.slice(0, 10));
  } else {
    console.log('No duplicates found.');
  }

  // Sample names
  console.log('Sample names:', names.slice(0, 5));
}

checkState();
