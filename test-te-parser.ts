// Test TradingEconomics HTML structure
const response = await fetch("https://tradingeconomics.com/calendar");
const html = await response.text();

// Find the table structure
const tableMatch = html.match(/<table[^>]*>(.*?)<\/table>/is);
if (tableMatch) {
  console.log("Found table");
  // Get first few rows
  const rowMatches = tableMatch[1].match(/<tr[^>]*>.*?<\/tr>/gis);
  if (rowMatches) {
    console.log(`Found ${rowMatches.length} rows`);
    console.log("\nFirst 3 rows:");
    rowMatches.slice(0, 3).forEach((row, i) => {
      console.log(`\n--- Row ${i} ---`);
      console.log(row.replace(/\s+/g, ' ').substring(0, 500));
    });
  }
} else {
  console.log("No table found, checking for calendar structure");
  const calMatch = html.match(/<div[^>]*calendar[^>]*>(.*?)<\/div>/is);
  if (calMatch) {
    console.log("Found calendar div:");
    console.log(calMatch[0].substring(0, 1000));
  }
}
