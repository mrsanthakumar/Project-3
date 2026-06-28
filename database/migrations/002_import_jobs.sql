-- =====================================================================
-- Migration 002 — import_jobs (bulk Excel/CSV upload tracking)
-- Supports the 202 + jobId / poll pattern in docs/API_DESIGN.md §10.4.
-- =====================================================================

CREATE TABLE IF NOT EXISTS import_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    entity          VARCHAR(40)  NOT NULL,            -- students / admissions / attendance ...
    file_name       VARCHAR(255),
    status          report_status_t NOT NULL DEFAULT 'PROCESSING',
    total_rows      INT NOT NULL DEFAULT 0,
    success_rows    INT NOT NULL DEFAULT 0,
    error_rows      INT NOT NULL DEFAULT 0,
    errors          JSONB,                            -- [{ row, field, message }]
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_inst ON import_jobs(institution_id, entity, created_at DESC);
