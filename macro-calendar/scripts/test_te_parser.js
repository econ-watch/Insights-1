/* eslint-disable @typescript-eslint/no-require-imports */

const https = require('https');

async function fetchCalendar() {
  return new Promise((resolve, reject) => {
    https.get('https://tradingeconomics.com/calendar', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', (err) => reject(err));
    });
  });
}

function mapCountryCode(code) {
  const map = {
    US: "USD", EA: "EUR", GB: "GBP", JP: "JPY", CA: "CAD",
    AU: "AUD", NZ: "NZD", CH: "CHF", CN: "CNY", DE: "EUR",
    FR: "EUR", IT: "EUR", ES: "EUR", IN: "INR", BR: "BRL",
    MX: "MXN", ZA: "ZAR", RU: "RUB", TR: "TRY", SA: "SAR",
    SG: "SGD", ID: "IDR", AR: "ARS", KR: "KRW"
  };
  return map[code] || code;
}

// Convert string to Title Case (e.g. "10-year bund auction" -> "10-Year Bund Auction")
// Respects common acronyms
function toTitleCase(str) {
  const keepUppercase = new Set([
    "YOY", "MOM", "QOQ", "PMI", "CPI", "GDP", "ADP", "ZEW", "IFO", 
    "ECB", "BOE", "BOJ", "RBA", "FOMC", "USD", "EUR", "GBP", "JPY", 
    "CAD", "AUD", "NZD", "CHF", "CNY", "S&P", "HSBC", "HCOB", "JGB", 
    "OAT", "BTF", "KTB", "UK", "US", "EU", "MBA", "NY", "API", "EIA",
    "NFIB", "ISM", "JOLTS", "NFP", "TBILL", "T-BILL", "FED", "PCE", "BOC"
  ]);

  return str.split(' ').map(word => {
    // Handle "10-year" -> "10-Year"
    if (word.includes('-')) {
      return word.split('-').map(part => {
        const cleanPart = part.replace(/[^a-zA-Z0-9&]/g, '');
        const upper = cleanPart.toUpperCase();
        if (keepUppercase.has(upper)) return part.replace(cleanPart, upper);
        if (cleanPart.length === 0) return part;
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

async function run() {
  console.log('Fetching...');
  const html = await fetchCalendar();
  
  // Extract rows using regex
  const rowRegex = /<tr[^>]*data-url=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let count = 0;
  let cnCount = 0;
  let krCount = 0;
  
  while ((match = rowRegex.exec(html)) !== null) {
    const rowContent = match[2];
    
    // Extract Country Code
    const countryMatch = /class=['"]calendar-iso['"]>([^<]+)<\/td>/i.exec(rowContent);
    const countryCodeRaw = countryMatch ? countryMatch[1].trim() : null;
    
    if (countryCodeRaw) {
      const countryCode = mapCountryCode(countryCodeRaw);
      
      // Extract Event Name
      const eventMatch = /<a[^>]*class=['"]calendar-event['"][^>]*>([^<]+)<\/a>/i.exec(rowContent);
      let eventName = eventMatch ? eventMatch[1].trim() : "Unknown Event";
      eventName = toTitleCase(eventName);
      
      // Extract Actual/Forecast
      const actualMatch = /id=['"]actual['"][^>]*>([^<]*)<\/span>/i.exec(rowContent);
      const actual = actualMatch ? actualMatch[1].trim() : null;
      
      const forecastMatch = /id=['"]forecast['"][^>]*>([^<]*)<\/span>/i.exec(rowContent);
      const forecast = forecastMatch ? forecastMatch[1].trim() : null;
      
      count++;
      
      if (countryCodeRaw === 'CN') {
        cnCount++;
        console.log(`CN -> ${countryCode}: ${eventName} | Actual: ${actual} | Forecast: ${forecast}`);
      }
      
      if (countryCodeRaw === 'KR') {
        krCount++;
        console.log(`KR -> ${countryCode}: ${eventName} | Actual: ${actual} | Forecast: ${forecast}`);
      }
    }
  }
  
  console.log(`Found ${count} releases.`);
  console.log(`Found ${cnCount} CN (China) releases.`);
  console.log(`Found ${krCount} KR (South Korea) releases.`);
}

run();
