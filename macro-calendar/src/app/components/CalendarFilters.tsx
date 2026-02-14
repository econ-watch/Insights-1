"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

type CalendarFiltersProps = {
  countries: string[];
  categories: string[];
  isAuthenticated: boolean;
};

export function CalendarFilters({
  countries,
  categories,
  isAuthenticated,
}: CalendarFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCountry = searchParams.get("country") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentSearch = searchParams.get("search") ?? "";
  const currentWatchlist = searchParams.get("watchlist") === "true";
  const currentView = searchParams.get("view") ?? "";

  const [searchValue, setSearchValue] = useState(currentSearch);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

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

  const hasFilters = currentCountry || currentCategory || currentSearch || currentWatchlist || currentView;

  return (
    <div className="mb-6 space-y-3">
      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-[#1e2530] bg-[#151921] p-1 w-fit">
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

      {/* Filters row */}
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
          id="search-filter"
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search indicators..."
          className="w-full rounded-lg border border-[#1e2530] bg-[#151921] py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
      </div>

      {/* Country */}
      <select
        id="country-filter"
        value={currentCountry}
        onChange={(e) => updateFilter("country", e.target.value)}
        className="rounded-lg border border-[#1e2530] bg-[#151921] px-3 py-2 text-sm text-zinc-300 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
      >
        <option value="">All Countries</option>
        {countries.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>

      {/* Category */}
      <select
        id="category-filter"
        value={currentCategory}
        onChange={(e) => updateFilter("category", e.target.value)}
        className="rounded-lg border border-[#1e2530] bg-[#151921] px-3 py-2 text-sm text-zinc-300 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

      {/* Watchlist toggle */}
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

      {/* Clear */}
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
