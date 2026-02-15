
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function normalizeImpact() {
  const { error } = await supabase
    .from('indicators')
    .update({ impact: 'high' })
    .eq('impact', 'High');
    
  if (error) console.error(error);
  else console.log('Fixed High -> high');
  
  await supabase
    .from('indicators')
    .update({ impact: 'medium' })
    .eq('impact', 'Medium');
    
  await supabase
    .from('indicators')
    .update({ impact: 'low' })
    .eq('impact', 'Low');
    
  console.log('Impact normalization complete.');
}

normalizeImpact();
