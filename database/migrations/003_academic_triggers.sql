-- =====================================================================
-- Migration 003 — academic computed-field triggers
--   * internal_marks.internal_average = mean of provided components
--   * semester_results.is_arrear defaults from result = FAIL when not set
-- Keeps these derivations correct regardless of which API path writes them.
-- =====================================================================

CREATE OR REPLACE FUNCTION compute_internal_average() RETURNS trigger AS $$
DECLARE
    parts NUMERIC[] := ARRAY[]::NUMERIC[];
BEGIN
    IF NEW.test1 IS NOT NULL THEN parts := array_append(parts, NEW.test1); END IF;
    IF NEW.test2 IS NOT NULL THEN parts := array_append(parts, NEW.test2); END IF;
    IF NEW.assignment IS NOT NULL THEN parts := array_append(parts, NEW.assignment); END IF;

    IF NEW.internal_average IS NULL AND array_length(parts, 1) IS NOT NULL THEN
        SELECT round(avg(p)::numeric, 2) INTO NEW.internal_average FROM unnest(parts) AS p;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_internal_average
    BEFORE INSERT OR UPDATE ON internal_marks
    FOR EACH ROW EXECUTE FUNCTION compute_internal_average();

CREATE OR REPLACE FUNCTION default_result_arrear() RETURNS trigger AS $$
BEGIN
    IF NEW.is_arrear IS NULL OR NEW.is_arrear = FALSE THEN
        NEW.is_arrear := (NEW.result = 'FAIL');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_result_arrear
    BEFORE INSERT OR UPDATE ON semester_results
    FOR EACH ROW EXECUTE FUNCTION default_result_arrear();
