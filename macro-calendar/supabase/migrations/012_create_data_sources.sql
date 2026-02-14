-- Migration: Create data_sources and sync_logs tables
-- Description: L4 data acquisition foundation
-- Date: 2026-02-14

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create data_sources table
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('scraper', 'api')),
    base_url TEXT,
    auth_config JSONB DEFAULT '{}'::JSONB,
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    records_processed INT NOT NULL DEFAULT 0,
    errors_count INT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);
CREATE INDEX IF NOT EXISTS idx_data_sources_enabled ON data_sources(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_sync_logs_data_source ON sync_logs(data_source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE data_sources IS 'External data sources for scraping/importing economic release data';
COMMENT ON TABLE sync_logs IS 'Audit log of data source sync operations';
COMMENT ON COLUMN data_sources.type IS 'Type of data source: scraper (HTML parsing) or api (REST/GraphQL)';
COMMENT ON COLUMN data_sources.auth_config IS 'Encrypted API credentials and config (JSONB)';
COMMENT ON COLUMN sync_logs.status IS 'Sync result: success, partial (some errors), or failed';

-- Enable Row Level Security (RLS)
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies (only service role can access these tables)
-- No public policies - these tables are internal/admin-only
-- Service role bypasses RLS, so admins with proper auth can access

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for data_sources updated_at
CREATE TRIGGER update_data_sources_updated_at
    BEFORE UPDATE ON data_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
