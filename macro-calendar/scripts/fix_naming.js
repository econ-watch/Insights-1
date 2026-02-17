/* eslint-disable @typescript-eslint/no-require-imports */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Maps regex pattern to replacement
const REPLACEMENTS = [
  { pattern: /\bBoe\b/g, replacement: 'BoE' },
  { pattern: /\bBoj\b/g, replacement: 'BoJ' },
  { pattern: /\bEcb\b/g, replacement: 'ECB' },
  { pattern: /\bCpi\b/g, replacement: 'CPI' },
  { pattern: /\bGdp\b/g, replacement: 'GDP' },
  { pattern: /\bPmi\b/g, replacement: 'PMI' },
  { pattern: /\bIsm\b/g, replacement: 'ISM' },
  { pattern: /\bFomc\b/g, replacement: 'FOMC' },
  { pattern: /\bPce\b/g, replacement: 'PCE' },
  { pattern: /\bYoy\b/g, replacement: 'YoY' },
  { pattern: /\bQoq\b/g, replacement: 'QoQ' },
  { pattern: /\bMom\b/g, replacement: 'MoM' },
  { pattern: /\bAdp\b/g, replacement: 'ADP' },
  { pattern: /\bApi\b/g, replacement: 'API' },
  { pattern: /\bEia\b/g, replacement: 'EIA' },
  { pattern: /\bMba\b/g, replacement: 'MBA' },
  { pattern: /\bNfp\b/g, replacement: 'NFP' },
  { pattern: /\bJolts\b/g, replacement: 'JOLTS' },
  { pattern: /\bRba\b/g, replacement: 'RBA' },
  { pattern: /\bNzd\b/g, replacement: 'NZD' },
  { pattern: /\bAud\b/g, replacement: 'AUD' },
  { pattern: /\bCad\b/g, replacement: 'CAD' },
  { pattern: /\bUsd\b/g, replacement: 'USD' },
  { pattern: /\bEur\b/g, replacement: 'EUR' },
  { pattern: /\bGbp\b/g, replacement: 'GBP' },
  { pattern: /\bJpy\b/g, replacement: 'JPY' },
];

async function fixNaming() {
  console.log('Fetching indicators...');
  const { data: indicators, error } = await supabase
    .from('indicators')
    .select('id, name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  let updates = 0;
  for (const ind of indicators) {
    let newName = ind.name;
    
    for (const { pattern, replacement } of REPLACEMENTS) {
      newName = newName.replace(pattern, replacement);
    }

    if (newName !== ind.name) {
      console.log(`Renaming: "${ind.name}" -> "${newName}"`);
      const { error: updateError } = await supabase
        .from('indicators')
        .update({ name: newName })
        .eq('id', ind.id);
      
      if (updateError) console.error(`Error updating ${ind.id}:`, updateError);
      else updates++;
    }
  }

  console.log(`Finished. Updated ${updates} indicators.`);
}

fixNaming();
