"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect, useRef, useTransition } from "react";

type CalendarFiltersProps = {
  countries: string[];
  categories: string[];
  isAuthenticated: boolean;
};

const FLAG_MAP: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", CAD: "🇨🇦",
  AUD: "🇦🇺", INR: "🇮🇳", BRL: "🇧🇷", MXN: "🇲🇽", ZAR: "🇿🇦",
  SGD: "🇸🇬", SAR: "🇸🇦", TRY: "🇹🇷", IDR: "🇮🇩", KR: "🇰🇷",
  ARS: "🇦🇷", RUB: "🇷🇺",
};

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

export function CalendarFilters({
  countries,
  categories,
  isAuthenticated,
}: CalendarFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCountries = searchParams.get("country")?.split(",").filter(Boolean) ?? [];
  const currentCategory = searchParams.get("category") ?? "";
  const currentSearch = searchParams.get("search") ?? "";
  const currentWatchlist = searchParams.get("watchlist") === "true";
  const currentView = searchParams.get("view") ?? "";
  const hideReleased = searchParams.get("hide") === "released";
  const currentImpact = searchParams.get("impact")?.split(",").filter(Boolean) ?? [];
  const currentTz = searchParams.get("tz") ?? "";

  const [searchValue, setSearchValue] = useState(currentSearch);
  const [countryOpen, setCountryOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);
  
  // Auto-refresh state (persisted in localStorage, not URL)
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, startRefreshingTransition] = useTransition();

  const countryRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const tzRef = useRef<HTMLDivElement>(null);
  const refreshInFlightRef = useRef(false);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const toggleCountry = useCallback(
    (code: string) => {
      const current = new Set(currentCountries);
      if (current.has(code)) {
        current.delete(code);
      } else {
        current.add(code);
      }
      updateFilter("country", Array.from(current).join(","));
    },
    [currentCountries, updateFilter]
  );

  const toggleImpact = useCallback(
    (level: string) => {
      const current = new Set(currentImpact);
      if (current.has(level)) {
        current.delete(level);
      } else {
        current.add(level);
      }
      updateFilter("impact", Array.from(current).join(","));
    },
    [currentImpact, updateFilter]
  );

  // Initialize auto-refresh from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("econwatch_autorefresh");
    if (saved === "true") setAutoRefresh(true);
  }, []);

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    const newState = !autoRefresh;
    setAutoRefresh(newState);
    localStorage.setItem("econwatch_autorefresh", String(newState));
  };

  const triggerRefresh = useCallback(() => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    startRefreshingTransition(() => {
      router.refresh();
    });

    // Avoid deadlock if router refresh errors/stalls
    window.setTimeout(() => {
      refreshInFlightRef.current = false;
    }, 5000);
  }, [router]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      triggerRefresh();
    }, 60000); // 60s
    return () => clearInterval(interval);
  }, [autoRefresh, triggerRefresh]);

  // Auto-detect timezone on first load
  useEffect(() => {
    if (!currentTz) {
      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Check if it's in our supported list, or just use it raw?
      // For now, let's just set it if it's missing.
      updateFilter("tz", localTz);
    }
  }, [currentTz, updateFilter]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
      if (tzRef.current && !tzRef.current.contains(e.target as Node)) {
        setTzOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== currentSearch) {
        updateFilter("search", searchValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, currentSearch, updateFilter]);

  useEffect(() => {
    if (!isRefreshing) {
      refreshInFlightRef.current = false;
    }
  }, [isRefreshing]);

  const hasFilters = currentCountries.length > 0 || currentCategory || currentSearch || currentWatchlist || currentView || hideReleased || currentImpact.length > 0;

  return (
    <div className="mb-6 space-y-3">
      {/* Row 1: View toggle + TZ + Auto-refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-[#1e2530] bg-[#151921] p-1">
          {[
            { value: "", label: "Default" },
            { value: "week", label: "This Week" },
            { value: "past", label: "Year to Date" },
          ].map((v) => (
            <button
              key={v.value}
              onClick={() => updateFilter("view", v.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                currentView === v.value
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Timezone Dropdown */}
        <div className="relative" ref={tzRef}>
          <button
            onClick={() => { setTzOpen(!tzOpen); setCountryOpen(false); setCategoryOpen(false); }}
            className="flex items-center gap-2 rounded-lg border border-[#1e2530] bg-[#151921] px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {currentTz ? (currentTz.split("/")[1]?.replace(/_/g, " ") || currentTz) : "Timezone"}
          </button>
          
          {tzOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-[#1e2530] bg-[#151921] p-1 shadow-xl">
              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {TIMEZONES.map((tz) => (
                  <button
                    key={tz.value}
                    onClick={() => { updateFilter("tz", tz.value); setTzOpen(false); }}
                    className={`flex w-full items-center rounded-md px-2.5 py-2 text-xs transition-colors ${
                      currentTz === tz.value
                        ? "bg-blue-500/15 text-blue-400"
                        : "text-zinc-400 hover:bg-[#1a1f2e] hover:text-zinc-200"
                    }`}
                  >
                    {tz.label}
                  </button>
                ))}
                <button
                   onClick={() => { 
                     const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
                     updateFilter("tz", local); 
                     setTzOpen(false); 
                   }}
                   className="flex w-full items-center rounded-md px-2.5 py-2 text-xs text-zinc-500 hover:bg-[#1a1f2e] hover:text-zinc-300 border-t border-[#1e2530] mt-1 pt-2"
                >
                   📍 Use Local Time
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Auto Refresh Toggle */}
        <button
          onClick={toggleAutoRefresh}
          className={`ml-auto flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            autoRefresh
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : "border-[#1e2530] bg-[#151921] text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span className={`relative flex h-2 w-2`}>
            {autoRefresh && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${autoRefresh ? "bg-emerald-500" : "bg-zinc-600"}`}></span>
          </span>
          {autoRefresh ? "Live" : "Auto-refresh"}
        </button>

        {isRefreshing && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-[11px] font-medium text-blue-300">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
            Refreshing…
          </span>
        )}
      </div>

      {/* Row 2: Hide released + Impact */}
      <div className="flex flex-wrap items-center gap-2">
         <button
          onClick={() => updateFilter("hide", hideReleased ? "" : "released")}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            hideReleased
              ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
              : "border-[#1e2530] bg-[#151921] text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {hideReleased ? "✓ Hiding released" : "Hide released"}
        </button>

        {/* Impact filter */}
        <div className="flex items-center gap-1 rounded-lg border border-[#1e2530] bg-[#151921] p-1">
          {[
            { value: "high", label: "High", dot: "bg-red-500" },
            { value: "medium", label: "Med", dot: "bg-yellow-500" },
            { value: "low", label: "Low", dot: "bg-zinc-600" },
          ].map((v) => {
            const isActive = currentImpact.includes(v.value);
            return (
              <button
                key={v.value}
                onClick={() => toggleImpact(v.value)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#1a1f2e] text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${v.dot}`} />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Search + Country + Category */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search indicators..."
            className="w-full rounded-lg border border-[#1e2530] bg-[#151921] py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        {/* Country dropdown */}
        <div className="relative" ref={countryRef}>
          <button
            onClick={() => { setCountryOpen(!countryOpen); setCategoryOpen(false); setTzOpen(false); }}
            className="flex items-center gap-2 rounded-lg border border-[#1e2530] bg-[#151921] px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600 transition-colors"
          >
            {currentCountries.length > 0 ? (
              <span className="flex items-center gap-1">
                <span>{currentCountries.map(c => FLAG_MAP[c] ?? "").join("")}</span>
                <span className="text-zinc-400">{currentCountries.length} selected</span>
              </span>
            ) : (
              "All Countries"
            )}
            <svg className={`h-4 w-4 text-zinc-500 transition-transform ${countryOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {countryOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-[#1e2530] bg-[#151921] p-2 shadow-xl">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">Select countries</span>
                {currentCountries.length > 0 && (
                  <button
                    onClick={() => updateFilter("country", "")}
                    className="text-[10px] text-blue-400 hover:text-blue-300"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
                {countries.map((code) => {
                  const isSelected = currentCountries.includes(code);
                  return (
                    <button
                      key={code}
                      onClick={() => toggleCountry(code)}
                      className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-500/15 text-blue-400"
                          : "text-zinc-400 hover:bg-[#1a1f2e] hover:text-zinc-200"
                      }`}
                    >
                      <span className="text-base">{FLAG_MAP[code] ?? "🌐"}</span>
                      <span className="font-medium">{code}</span>
                      {isSelected && (
                        <svg className="ml-auto h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Category dropdown */}
        <div className="relative" ref={categoryRef}>
          <button
            onClick={() => { setCategoryOpen(!categoryOpen); setCountryOpen(false); setTzOpen(false); }}
            className="flex items-center gap-2 rounded-lg border border-[#1e2530] bg-[#151921] px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600 transition-colors"
          >
            {currentCategory || "All Categories"}
            <svg className={`h-4 w-4 text-zinc-500 transition-transform ${categoryOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {categoryOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-lg border border-[#1e2530] bg-[#151921] p-2 shadow-xl">
              <div className="mb-2 px-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">Select category</span>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-0.5">
                <button
                  onClick={() => { updateFilter("category", ""); setCategoryOpen(false); }}
                  className={`flex w-full items-center rounded-md px-2.5 py-2 text-sm transition-colors ${
                    !currentCategory
                      ? "bg-blue-500/15 text-blue-400"
                      : "text-zinc-400 hover:bg-[#1a1f2e] hover:text-zinc-200"
                  }`}
                >
                  All Categories
                  {!currentCategory && (
                    <svg className="ml-auto h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                {categories.map((cat) => {
                  const isSelected = currentCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => { updateFilter("category", cat); setCategoryOpen(false); }}
                      className={`flex w-full items-center rounded-md px-2.5 py-2 text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-500/15 text-blue-400"
                          : "text-zinc-400 hover:bg-[#1a1f2e] hover:text-zinc-200"
                      }`}
                    >
                      {cat}
                      {isSelected && (
                        <svg className="ml-auto h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <button
            onClick={() => updateFilter("watchlist", currentWatchlist ? "" : "true")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              currentWatchlist
                ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                : "border-[#1e2530] bg-[#151921] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            ★ Watchlist
          </button>
        )}

        {hasFilters && (
          <button
            onClick={() => {
              setSearchValue("");
              router.push("/");
            }}
            className="rounded-lg border border-[#1e2530] bg-[#151921] px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ✕ Clear
          </button>
        )}
      </div>
    </div>
  );
}
