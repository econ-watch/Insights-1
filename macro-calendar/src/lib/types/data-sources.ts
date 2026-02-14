/**
 * Data Acquisition Types for L4
 * Types for data_sources and sync_logs tables
 */

export type DataSourceType = 'scraper' | 'api';

export type SyncStatus = 'success' | 'partial' | 'failed';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  base_url: string | null;
  auth_config: Record<string, unknown>;
  enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  data_source_id: string;
  status: SyncStatus;
  records_processed: number;
  errors_count: number;
  metadata: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface DataSourceInsert {
  name: string;
  type: DataSourceType;
  base_url?: string | null;
  auth_config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface DataSourceUpdate {
  name?: string;
  type?: DataSourceType;
  base_url?: string | null;
  auth_config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface SyncLogInsert {
  data_source_id: string;
  status: SyncStatus;
  records_processed?: number;
  errors_count?: number;
  metadata?: Record<string, unknown>;
  started_at?: string;
  completed_at?: string | null;
}

/**
 * API Integration Config Types
 */
export interface FREDConfig {
  api_key: string;
  base_url?: string;
  rate_limit_per_minute?: number;
}

export interface BLSConfig {
  api_key: string;
  base_url?: string;
  rate_limit_per_minute?: number;
}

export interface ECBConfig {
  base_url?: string;
  rate_limit_per_minute?: number;
}

/**
 * Scraper Config Types
 */
export interface ScraperConfig {
  user_agent?: string;
  timeout_ms?: number;
  retry_attempts?: number;
  retry_delay_ms?: number;
}

export interface ForexFactoryConfig extends ScraperConfig {
  base_url: string;
  calendar_path: string;
}

export interface InvestingComConfig extends ScraperConfig {
  base_url: string;
  calendar_path: string;
}

/**
 * Sync metadata structure
 */
export interface SyncMetadata {
  duration_ms: number;
  releases_found?: number;
  releases_inserted?: number;
  releases_updated?: number;
  errors?: Array<{
    message: string;
    indicator_name?: string;
    timestamp: string;
  }>;
}
