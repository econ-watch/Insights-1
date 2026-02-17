/* eslint-disable @typescript-eslint/no-require-imports */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Convert string to Title Case
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

async function cleanupIndicators() {
  console.log('Fetching indicators...');
  const { data: indicators, error } = await supabase
    .from('indicators')
    .select('id, name, country_code, impact');

  if (error) {
    console.error('Error fetching indicators:', error);
    return;
  }

  console.log(`Total indicators: ${indicators.length}`);

  // Group by country_code + lower_case_name
  const groups = {};
  
  indicators.forEach(ind => {
    const key = `${ind.country_code}:${ind.name.toLowerCase()}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(ind);
  });

  let duplicateGroups = 0;
  let indicatorsRenamed = 0;

  for (const key in groups) {
    const group = groups[key];
    const targetName = toTitleCase(group[0].name);

    if (group.length > 1) {
      duplicateGroups++;
      console.log(`Processing duplicate group: ${key} (${group.length} items) -> ${targetName}`);

      // Sort to pick a primary (prefer one with impact rating or just first)
      // Actually, we should merge.
      const primary = group.find(i => i.name === targetName) || group[0];
      const others = group.filter(i => i.id !== primary.id);

      console.log(`  Primary: ${primary.name} (${primary.id})`);
      console.log(`  Merging ${others.length} others...`);

      // 1. Handle releases
      const otherIds = others.map(i => i.id);
      
      // Get all releases for "others"
      const { data: otherReleases, error: fetchError } = await supabase
        .from('releases')
        .select('id, release_at')
        .in('indicator_id', otherIds);

      if (fetchError) {
        console.error('  Error fetching releases:', fetchError);
        continue;
      }

      // Check which ones conflict with primary
      const { data: primaryReleases, error: primaryFetchError } = await supabase
        .from('releases')
        .select('release_at')
        .eq('indicator_id', primary.id);

      if (primaryFetchError) {
        console.error('  Error fetching primary releases:', primaryFetchError);
        continue;
      }

      const primaryDates = new Set(primaryReleases.map(r => r.release_at));
      const releasesToDelete = [];
      const releasesToMove = [];

      for (const r of otherReleases) {
        if (primaryDates.has(r.release_at)) {
          releasesToDelete.push(r.id);
        } else {
          releasesToMove.push(r.id);
        }
      }

      console.log(`  Deleting ${releasesToDelete.length} duplicate releases...`);
      if (releasesToDelete.length > 0) {
        const { error: delRelError } = await supabase
          .from('releases')
          .delete()
          .in('id', releasesToDelete);
        if (delRelError) console.error('  Error deleting releases:', delRelError);
      }

      console.log(`  Moving ${releasesToMove.length} releases to primary...`);
      if (releasesToMove.length > 0) {
        const { error: moveError } = await supabase
          .from('releases')
          .update({ indicator_id: primary.id })
          .in('id', releasesToMove);
        if (moveError) console.error('  Error moving releases:', moveError);
      }

      // 2. Delete others
      const { error: deleteError } = await supabase
        .from('indicators')
        .delete()
        .in('id', otherIds);

      if (deleteError) {
        console.error('  Error deleting duplicates:', deleteError);
        continue;
      }

      // 3. Update primary name if needed
      if (primary.name !== targetName) {
        const { error: renameError } = await supabase
          .from('indicators')
          .update({ name: targetName })
          .eq('id', primary.id);
        
        if (renameError) console.error('  Error renaming primary:', renameError);
        else indicatorsRenamed++;
      }

    } else {
      // Single item group - check if it needs renaming to Title Case
      const item = group[0];
      if (item.name !== targetName) {
        // console.log(`Renaming: ${item.name} -> ${targetName}`);
        const { error: renameError } = await supabase
          .from('indicators')
          .update({ name: targetName })
          .eq('id', item.id);
        
        if (renameError) {
           console.error(`Error renaming ${item.name}:`, renameError);
        } else {
           indicatorsRenamed++;
        }
      }
    }
  }

  console.log(`Cleanup complete. Processed ${duplicateGroups} duplicate groups. Renamed ${indicatorsRenamed} indicators.`);
}

cleanupIndicators();
