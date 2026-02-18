-- Migration: add indicator normalization columns and backfill
-- Date: 2026-02-17

ALTER TABLE indicators
  ADD COLUMN IF NOT EXISTS raw_name TEXT,
  ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Ensure inserts default raw_name to name when not provided
CREATE OR REPLACE FUNCTION set_indicator_name_defaults()
RETURNS TRIGGER AS $$
BEGIN
  NEW.raw_name := COALESCE(NEW.raw_name, NEW.name);
  NEW.normalized_name := COALESCE(NEW.normalized_name, NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_indicator_name_defaults ON indicators;
CREATE TRIGGER trg_set_indicator_name_defaults
BEFORE INSERT ON indicators
FOR EACH ROW
EXECUTE FUNCTION set_indicator_name_defaults();

-- Backfill current data
UPDATE indicators
SET raw_name = name
WHERE raw_name IS NULL;

UPDATE indicators
SET normalized_name = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(raw_name, '\\mPpi\\M', 'PPI', 'g'),
                '\\mCpi\\M', 'CPI', 'g'),
              '\\mGdp\\M', 'GDP', 'g'),
            '\\mPce\\M', 'PCE', 'g'),
          '\\mPmi\\M', 'PMI', 'g'),
        '\\mEcb\\M', 'ECB', 'g'),
      '\\mBoe\\M', 'BoE', 'g'),
    '\\mBoj\\M', 'BoJ', 'g'),
  '\\mRba\\M', 'RBA', 'g');

UPDATE indicators SET normalized_name = regexp_replace(normalized_name, '\\mS&p\\M', 'S&P', 'g');

-- Apply period suffix style only at end of string
UPDATE indicators SET normalized_name = regexp_replace(normalized_name, '\\s+YoY$', ' (YoY)');
UPDATE indicators SET normalized_name = regexp_replace(normalized_name, '\\s+MoM$', ' (MoM)');
UPDATE indicators SET normalized_name = regexp_replace(normalized_name, '\\s+QoQ$', ' (QoQ)');
