
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIndicators() {
  const { data, error } = await supabase
    .from('indicators')
    .select('name, country_code')
    .order('name', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Found indicators:', data.length);
  data.forEach(ind => {
    console.log(`${ind.country_code} - ${ind.name}`);
  });
}

checkIndicators();
