
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function smartTitleCase(str) {
  const keepUppercase = new Set([
    "YOY", "MOM", "QOQ", "PMI", "CPI", "GDP", "ADP", "ZEW", "IFO", 
    "ECB", "BOE", "BOJ", "RBA", "FOMC", "USD", "EUR", "GBP", "JPY", 
    "CAD", "AUD", "NZD", "CHF", "CNY", "S&P", "HSBC", "HCOB", "JGB", 
    "OAT", "BTF", "KTB", "UK", "US", "EU", "MBA", "NY", "API", "EIA",
    "NFIB", "ISM", "JOLTS", "NFP", "TBILL", "T-BILL", "FED"
  ]);

  return str.split(' ').map(word => {
    // Handle "10-year" -> "10-Year"
    if (word.includes('-')) {
      return word.split('-').map(part => {
        // Strip non-alphanumeric for check (e.g., "(3Mo/Yr)")
        const cleanPart = part.replace(/[^a-zA-Z0-9&]/g, '');
        const upper = cleanPart.toUpperCase();
        if (keepUppercase.has(upper)) return part.replace(cleanPart, upper);
        if (cleanPart.length === 0) return part;
        // Apply title case
        const titled = cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1).toLowerCase();
        return part.replace(cleanPart, titled);
      }).join('-');
    }
    
    const cleanWord = word.replace(/[^a-zA-Z0-9&]/g, '');
    const upper = cleanWord.toUpperCase();
    if (keepUppercase.has(upper)) return word.replace(cleanWord, upper);
    if (cleanWord.length === 0) return word;
    
    const titled = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
    return word.replace(cleanWord, titled);
  }).join(' ');
}

async function cleanupDuplicates() {
  console.log('Fetching indicators...');
  
  let { data: indicators, error } = await supabase
    .from('indicators')
    .select('id, name, country_code')
    .order('created_at', { ascending: true }); // Prefer older records
    
  if (error) {
    console.error('Error fetching indicators:', error);
    return;
  }
  
  console.log(`Found ${indicators.length} indicators.`);
  
  const groups = {};
  
  for (const ind of indicators) {
    const cleanName = smartTitleCase(ind.name);
    const key = `${ind.country_code}:${cleanName}`;
    
    if (!groups[key]) {
      groups[key] = {
        cleanName,
        countryCode: ind.country_code,
        ids: []
      };
    }
    groups[key].ids.push(ind.id);
  }
  
  let duplicateGroups = 0;
  let renameCount = 0;
  
  for (const key in groups) {
    const group = groups[key];
    const { cleanName, ids } = group;
    
    const winnerId = ids[0];
    const loserIds = ids.slice(1);
    
    if (loserIds.length > 0) {
      console.log(`Duplicate found: ${group.countryCode} - ${cleanName} (IDs: ${ids.join(', ')})`);
      duplicateGroups++;
      
      // 1. Handle duplicates
      for (const loserId of loserIds) {
        console.log(`  Processing loser ${loserId}...`);
        
        // Fetch releases for loser
        const { data: loserReleases } = await supabase
          .from('releases')
          .select('id, release_at')
          .eq('indicator_id', loserId);
          
        if (loserReleases && loserReleases.length > 0) {
          for (const rel of loserReleases) {
            // Check if winner has release at same time
            const { count } = await supabase
              .from('releases')
              .select('id', { count: 'exact', head: true })
              .eq('indicator_id', winnerId)
              .eq('release_at', rel.release_at);
              
            if (count > 0) {
              // Delete duplicate release from loser
              // console.log(`    Deleting duplicate release ${rel.id} for loser...`);
              await supabase.from('releases').delete().eq('id', rel.id);
            } else {
              // Move release to winner
              // console.log(`    Moving release ${rel.id} to winner...`);
              await supabase.from('releases').update({ indicator_id: winnerId }).eq('id', rel.id);
            }
          }
        }
        
        // Delete loser indicator
        console.log(`  Deleting loser indicator ${loserId}...`);
        const { error: deleteError } = await supabase
          .from('indicators')
          .delete()
          .eq('id', loserId);
          
        if (deleteError) {
          console.error(`  Failed to delete indicator ${loserId}:`, deleteError);
        }
      }
    }
    
    // 3. Rename winner if needed
    const winnerInd = indicators.find(i => i.id === winnerId);
    // Compare stripping extra spaces just in case
    if (winnerInd && winnerInd.name.trim() !== cleanName.trim()) {
      console.log(`Renaming "${winnerInd.name}" -> "${cleanName}"`);
      renameCount++;
      const { error: renameError } = await supabase
        .from('indicators')
        .update({ name: cleanName })
        .eq('id', winnerId);
        
      if (renameError) {
        // If rename fails (e.g. conflict with another indicator that wasn't grouped properly?), verify manually
        console.error(`  Failed to rename ${winnerId}:`, renameError);
      }
    }
  }
  
  console.log('Cleanup complete.');
  console.log(`Processed ${duplicateGroups} duplicate groups.`);
  console.log(`Renamed ${renameCount} indicators.`);
}

cleanupDuplicates();
