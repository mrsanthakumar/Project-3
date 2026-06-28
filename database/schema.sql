-- =====================================================================
-- Institutional Insights Dashboard
-- Admission -> Academics -> Placement Analytics System
-- PHASE 1: DATABASE SCHEMA  (PostgreSQL 15+)
-- =====================================================================
-- Notes:
--   * Tech stack specifies PostgreSQL; deliverable text said "MySQL".
--     This schema targets PostgreSQL. Porting notes are at the bottom.
--   * Multi-tenant: every business table carries institution_id and is
--     scoped by it. institutions is the tenant root.
--   * No hardcoded academic / placement / risk rules. All thresholds,
--     eligibility criteria, recommendation rules and risk bands live in
--     configuration tables driven from the UI.
--   * Soft delete via deleted_at where audit history matters.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------
CREATE TYPE gender_t            AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE admission_type_t     AS ENUM ('COUNSELING', 'MANAGEMENT', 'LATERAL_ENTRY', 'SPORTS', 'NRI');
CREATE TYPE attendance_status_t  AS ENUM ('PRESENT', 'ABSENT', 'OD', 'LEAVE');
CREATE TYPE result_status_t      AS ENUM ('PASS', 'FAIL', 'ABSENT', 'WITHHELD');
CREATE TYPE risk_level_t         AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE criteria_dtype_t     AS ENUM ('NUMERIC', 'INTEGER', 'BOOLEAN', 'STRING', 'ENUM');
CREATE TYPE comparator_t         AS ENUM ('GTE', 'LTE', 'GT', 'LT', 'EQ', 'NEQ', 'IN', 'NOT_IN', 'BETWEEN');
CREATE TYPE drive_status_t       AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE application_status_t AS ENUM ('ELIGIBLE', 'APPLIED', 'ATTENDED', 'SELECTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE report_format_t      AS ENUM ('PDF', 'EXCEL');
CREATE TYPE report_status_t      AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE audit_action_t       AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'UPLOAD', 'DOWNLOAD', 'EXPORT');

-- =====================================================================
-- MODULE 20: MULTI-COLLEGE SUPPORT (tenant root)
-- =====================================================================
CREATE TABLE institutions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(20)  NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    address         TEXT,
    city            VARCHAR(120),
    state           VARCHAR(120),
    country         VARCHAR(120) DEFAULT 'India',
    logo_url        TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULE 1: AUTHENTICATION & RBAC
-- =====================================================================
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID REFERENCES institutions(id) ON DELETE CASCADE,  -- NULL = global role (e.g. Super Admin)
    name            VARCHAR(80)  NOT NULL,
    slug            VARCHAR(80)  NOT NULL,   -- super_admin, principal, administration, hod, faculty_advisor, placement_officer
    description     TEXT,
    is_system       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (institution_id, slug)
);

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(120) NOT NULL UNIQUE,   -- e.g. student.create, placement.read, report.export
    module          VARCHAR(60)  NOT NULL,          -- student, admission, placement ...
    action          VARCHAR(40)  NOT NULL,          -- create, read, update, delete, export ...
    description     TEXT
);

CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID REFERENCES institutions(id) ON DELETE CASCADE,  -- NULL only for Super Admin
    role_id         UUID NOT NULL REFERENCES roles(id),
    department_id   UUID,    -- FK added after departments; scopes HOD / Faculty Advisor
    full_name       VARCHAR(160) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    password_hash   TEXT         NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    password_reset_token        TEXT,
    password_reset_expires_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE (institution_id, email)
);

-- Server-side session / refresh-token management
CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    user_agent      TEXT,
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULE 2: DEPARTMENT MANAGEMENT (Department / Branch / Program / Cohort / Batch / Regulation / Section)
-- =====================================================================
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    code            VARCHAR(20)  NOT NULL,    -- CSE, ECE, MECH, CIVIL, MBA
    name            VARCHAR(160) NOT NULL,
    hod_user_id     UUID REFERENCES users(id),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE (institution_id, code)
);

-- Now wire users.department_id (created earlier) to departments
ALTER TABLE users
    ADD CONSTRAINT fk_users_department
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

CREATE TABLE programs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    code            VARCHAR(30)  NOT NULL,    -- BE, BTECH, ME, MBA
    name            VARCHAR(160) NOT NULL,
    duration_years  NUMERIC(3,1) NOT NULL DEFAULT 4.0,
    level           VARCHAR(20)  NOT NULL DEFAULT 'UG',   -- UG / PG
    UNIQUE (institution_id, department_id, code)
);

CREATE TABLE branches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    program_id      UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    code            VARCHAR(30)  NOT NULL,
    name            VARCHAR(160) NOT NULL,
    UNIQUE (institution_id, program_id, code)
);

CREATE TABLE regulations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    code            VARCHAR(30)  NOT NULL,   -- R2021, R2017
    name            VARCHAR(120),
    effective_year  INT,
    UNIQUE (institution_id, code)
);

-- Cohort = admission-year grouping; Batch = the running class instance
CREATE TABLE cohorts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    admission_year  INT  NOT NULL,
    graduation_year INT,
    label           VARCHAR(60),             -- "2021-2025"
    UNIQUE (institution_id, admission_year, graduation_year)
);

CREATE TABLE batches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    program_id      UUID REFERENCES programs(id) ON DELETE SET NULL,
    branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    regulation_id   UUID REFERENCES regulations(id) ON DELETE SET NULL,
    name            VARCHAR(120) NOT NULL,   -- "CSE 2021-2025"
    current_semester INT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE (institution_id, department_id, cohort_id, name)
);

CREATE TABLE sections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    batch_id        UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    name            VARCHAR(10)  NOT NULL,   -- A, B, C
    advisor_user_id UUID REFERENCES users(id),
    UNIQUE (institution_id, batch_id, name)
);

-- =====================================================================
-- MODULE 3: STUDENT MANAGEMENT (master profile)
-- =====================================================================
CREATE TABLE students (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    register_number     VARCHAR(40)  NOT NULL,
    name                VARCHAR(160) NOT NULL,
    gender              gender_t,
    date_of_birth       DATE,
    email               VARCHAR(255),
    mobile              VARCHAR(20),

    -- Academic background (entry qualifications)
    tenth_percentage    NUMERIC(5,2),
    twelfth_percentage  NUMERIC(5,2),
    diploma_percentage  NUMERIC(5,2),
    admission_type      admission_type_t,
    cutoff_mark         NUMERIC(6,2),

    -- Institution placement
    department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
    batch_id            UUID REFERENCES batches(id) ON DELETE SET NULL,
    section_id          UUID REFERENCES sections(id) ON DELETE SET NULL,
    regulation_id       UUID REFERENCES regulations(id) ON DELETE SET NULL,

    -- Rolling academic snapshot (kept in sync by triggers/jobs from results)
    current_cgpa        NUMERIC(4,2),
    active_arrears      INT NOT NULL DEFAULT 0,
    history_arrears     INT NOT NULL DEFAULT 0,

    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE/ALUMNI/DROPPED
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE (institution_id, register_number)
);

-- Extracurricular / employability profile (feeds dynamic eligibility criteria)
CREATE TABLE student_profiles_extra (
    student_id          UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    internship_count    INT DEFAULT 0,
    certification_count INT DEFAULT 0,
    hackathon_count     INT DEFAULT 0,
    coding_score        NUMERIC(7,2),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULE 4: ADMISSION MANAGEMENT
-- =====================================================================
CREATE TABLE admissions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id          UUID REFERENCES students(id) ON DELETE SET NULL,
    department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
    cohort_id           UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    admission_year      INT  NOT NULL,
    admission_type      admission_type_t,
    is_management_quota BOOLEAN DEFAULT FALSE,
    is_counseling_quota BOOLEAN DEFAULT FALSE,
    is_lateral_entry    BOOLEAN DEFAULT FALSE,
    cutoff_mark         NUMERIC(6,2),
    school_name         VARCHAR(200),
    district            VARCHAR(120),
    state               VARCHAR(120),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULE 5: SUBJECT MANAGEMENT
-- =====================================================================
CREATE TABLE subjects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    regulation_id   UUID REFERENCES regulations(id) ON DELETE SET NULL,
    code            VARCHAR(30)  NOT NULL,
    name            VARCHAR(200) NOT NULL,
    credits         NUMERIC(3,1) NOT NULL DEFAULT 3,
    semester        INT NOT NULL,
    faculty_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (institution_id, code, regulation_id)
);

-- =====================================================================
-- MODULE 6: ATTENDANCE MANAGEMENT
-- =====================================================================
CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status          attendance_status_t NOT NULL,
    period          INT,                 -- optional period number for multi-period days
    marked_by       UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, subject_id, attendance_date, period)
);

-- =====================================================================
-- MODULE 7: INTERNAL MARKS MANAGEMENT
-- =====================================================================
CREATE TABLE internal_marks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester        INT,
    test1           NUMERIC(5,2),
    test2           NUMERIC(5,2),
    assignment      NUMERIC(5,2),
    internal_average NUMERIC(5,2),       -- can be computed; stored for reporting
    max_marks       NUMERIC(5,2) DEFAULT 100,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, subject_id, semester)
);

-- =====================================================================
-- MODULE 8: SEMESTER RESULTS MANAGEMENT
-- =====================================================================
CREATE TABLE semester_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id      UUID REFERENCES subjects(id) ON DELETE SET NULL,
    semester        INT NOT NULL,
    grade           VARCHAR(5),            -- O, A+, A, B+, ... U
    grade_points    NUMERIC(4,2),
    result          result_status_t,
    credits_earned  NUMERIC(4,1) DEFAULT 0,
    is_arrear       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, subject_id, semester)
);

-- Per-semester GPA / CGPA roll-up (one row per student per semester)
CREATE TABLE semester_gpa (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    semester        INT NOT NULL,
    gpa             NUMERIC(4,2),
    cgpa            NUMERIC(4,2),
    credits_registered NUMERIC(5,1),
    credits_earned  NUMERIC(5,1),
    UNIQUE (student_id, semester)
);

-- =====================================================================
-- MODULE 9: COMPANY MANAGEMENT
-- =====================================================================
CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    industry        VARCHAR(120),
    tier            VARCHAR(20),           -- configurable label, not enforced (TIER1/TIER2/...)
    website         VARCHAR(255),
    location        VARCHAR(160),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (institution_id, name)
);

-- =====================================================================
-- MODULE 10: DYNAMIC RECRUITMENT DRIVE MANAGEMENT (fully configurable)
-- =====================================================================
-- criteria_master: the catalogue of fields that can be used as eligibility
-- rules. source_path tells the engine where to read the value from the
-- unified profile (e.g. 'students.tenth_percentage', 'extra.coding_score').
CREATE TABLE criteria_master (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID REFERENCES institutions(id) ON DELETE CASCADE,  -- NULL = global catalogue item
    code            VARCHAR(60)  NOT NULL,   -- TENTH_PCT, CGPA, ACTIVE_ARREARS, DEPARTMENT...
    label           VARCHAR(120) NOT NULL,
    data_type       criteria_dtype_t NOT NULL,
    source_path     VARCHAR(120) NOT NULL,   -- resolver key into unified profile
    allowed_comparators comparator_t[] NOT NULL,
    enum_options    JSONB,                   -- for ENUM/STRING IN-lists
    unit            VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (institution_id, code)
);

CREATE TABLE recruitment_drives (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    role            VARCHAR(160),
    drive_date      DATE,
    package_lpa     NUMERIC(8,2),            -- offered CTC in LPA
    is_internship   BOOLEAN NOT NULL DEFAULT FALSE,
    match_mode      VARCHAR(10) NOT NULL DEFAULT 'ALL',   -- ALL = AND, ANY = OR
    status          drive_status_t NOT NULL DEFAULT 'DRAFT',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One configurable rule row per drive (e.g. CGPA GTE 8)
CREATE TABLE recruitment_criteria (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    drive_id        UUID NOT NULL REFERENCES recruitment_drives(id) ON DELETE CASCADE,
    criteria_id     UUID NOT NULL REFERENCES criteria_master(id),
    comparator      comparator_t NOT NULL,
    value_numeric   NUMERIC(12,3),
    value_text      VARCHAR(200),
    value_json      JSONB,                   -- for IN / BETWEEN payloads
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Materialized eligibility result, recomputed when criteria/profile change
CREATE TABLE drive_eligible_students (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    drive_id        UUID NOT NULL REFERENCES recruitment_drives(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    is_eligible     BOOLEAN NOT NULL,
    failed_criteria JSONB,                   -- explanation: which rules failed
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (drive_id, student_id)
);

-- =====================================================================
-- MODULE 11: PLACEMENT MANAGEMENT
-- =====================================================================
CREATE TABLE placements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    drive_id        UUID NOT NULL REFERENCES recruitment_drives(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status          application_status_t NOT NULL DEFAULT 'APPLIED',
    applied         BOOLEAN NOT NULL DEFAULT TRUE,
    attended        BOOLEAN NOT NULL DEFAULT FALSE,
    selected        BOOLEAN NOT NULL DEFAULT FALSE,
    package_lpa     NUMERIC(8,2),
    is_internship   BOOLEAN NOT NULL DEFAULT FALSE,
    offer_date      DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (drive_id, student_id)
);

-- =====================================================================
-- MODULE 12 & 13: UNIFIED ANALYTICS / CROSS-FUNNEL
-- =====================================================================
-- Snapshot table that joins admission -> academics -> placement per
-- student. Refreshed by the analytics engine (Python/SQL job). Used as
-- the read model for dashboards, eligibility resolution and risk scoring.
CREATE TABLE unified_student_profiles (
    student_id          UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    department_id       UUID,
    batch_id            UUID,
    cohort_id           UUID,
    -- admission
    admission_year      INT,
    admission_type      admission_type_t,
    cutoff_mark         NUMERIC(6,2),
    tenth_percentage    NUMERIC(5,2),
    twelfth_percentage  NUMERIC(5,2),
    diploma_percentage  NUMERIC(5,2),
    -- academics
    current_cgpa        NUMERIC(4,2),
    active_arrears      INT,
    history_arrears     INT,
    avg_attendance_pct  NUMERIC(5,2),
    avg_internal        NUMERIC(5,2),
    -- employability
    internship_count    INT,
    certification_count INT,
    hackathon_count     INT,
    coding_score        NUMERIC(7,2),
    -- placement
    is_placed           BOOLEAN DEFAULT FALSE,
    highest_package_lpa NUMERIC(8,2),
    offers_count        INT DEFAULT 0,
    -- risk (denormalized from latest assessment)
    risk_level          risk_level_t,
    risk_score          NUMERIC(6,2),
    refreshed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULE 14: RISK PREDICTION ENGINE (configurable thresholds — no hardcoding)
-- =====================================================================
CREATE TABLE risk_rule_sets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- e.g. category=ACADEMIC, metric=current_cgpa, comparator=LT, threshold=6, weight=40
CREATE TABLE risk_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    rule_set_id     UUID NOT NULL REFERENCES risk_rule_sets(id) ON DELETE CASCADE,
    category        VARCHAR(40) NOT NULL,     -- ACADEMIC / ATTENDANCE / PLACEMENT
    metric          VARCHAR(60) NOT NULL,     -- maps to unified profile column
    comparator      comparator_t NOT NULL,
    threshold_num   NUMERIC(12,3),
    weight          NUMERIC(6,2) NOT NULL DEFAULT 1,
    message_template TEXT                      -- explanation text for the flag
);

-- Banding: score range -> level (also configurable)
CREATE TABLE risk_bands (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    rule_set_id     UUID NOT NULL REFERENCES risk_rule_sets(id) ON DELETE CASCADE,
    level           risk_level_t NOT NULL,
    min_score       NUMERIC(6,2) NOT NULL,
    max_score       NUMERIC(6,2) NOT NULL
);

CREATE TABLE risk_assessments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    rule_set_id     UUID REFERENCES risk_rule_sets(id) ON DELETE SET NULL,
    risk_level      risk_level_t NOT NULL,
    risk_score      NUMERIC(6,2) NOT NULL,
    factors         JSONB,                    -- [{category, metric, value, threshold, message}]
    assessed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULE 15: STATISTICAL VALIDATION (Python service outputs)
-- =====================================================================
CREATE TABLE statistical_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    test_type       VARCHAR(40) NOT NULL,     -- PEARSON / SPEARMAN / TTEST / ANOVA
    variables       JSONB NOT NULL,           -- {x:'twelfth_percentage', y:'current_cgpa', groups:[...]}
    scope           JSONB,                    -- filters (department/batch/cohort)
    statistic       NUMERIC(14,6),
    p_value         NUMERIC(14,8),
    effect_size     NUMERIC(14,6),
    sample_size     INT,
    interpretation  TEXT,
    raw_output      JSONB,
    generated_by    UUID REFERENCES users(id),
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULE 16: RECOMMENDATION ENGINE (rule-based, configurable)
-- =====================================================================
-- conditions/actions stored as JSON so rules are authored from the UI.
CREATE TABLE recommendation_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name            VARCHAR(160) NOT NULL,
    scope_level     VARCHAR(30) NOT NULL DEFAULT 'STUDENT',  -- STUDENT/DEPARTMENT/INSTITUTION
    conditions      JSONB NOT NULL,           -- [{metric, comparator, value}], combined by logic
    logic           VARCHAR(10) NOT NULL DEFAULT 'ALL',      -- ALL/ANY
    action_text     TEXT NOT NULL,            -- "Conduct Counseling"
    priority        INT NOT NULL DEFAULT 3,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recommendations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    rule_id         UUID REFERENCES recommendation_rules(id) ON DELETE SET NULL,
    scope_level     VARCHAR(30) NOT NULL,
    student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
    department_id   UUID REFERENCES departments(id) ON DELETE CASCADE,
    action_text     TEXT NOT NULL,
    priority        INT NOT NULL DEFAULT 3,
    rationale       JSONB,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',     -- OPEN/IN_PROGRESS/DONE/DISMISSED
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULE 17: REPORTS (export jobs)
-- =====================================================================
CREATE TABLE report_exports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    report_type     VARCHAR(60) NOT NULL,     -- ADMISSION/ACADEMIC/PLACEMENT/RISK/STUDENT/DEPARTMENT
    format          report_format_t NOT NULL,
    params          JSONB,                    -- filters used
    status          report_status_t NOT NULL DEFAULT 'QUEUED',
    file_path       TEXT,
    error_message   TEXT,
    requested_by    UUID REFERENCES users(id),
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

-- =====================================================================
-- MODULE 19: AUDIT LOGS
-- =====================================================================
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    institution_id  UUID REFERENCES institutions(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          audit_action_t NOT NULL,
    entity          VARCHAR(80),              -- table / module affected
    entity_id       VARCHAR(80),
    detail          JSONB,                    -- before/after, file name, report id...
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- INDEXES
-- =====================================================================
-- Tenant scoping (the most common filter on every read)
CREATE INDEX idx_students_inst         ON students(institution_id);
CREATE INDEX idx_students_dept_batch   ON students(department_id, batch_id);
CREATE INDEX idx_students_reg          ON students(institution_id, register_number);
CREATE INDEX idx_admissions_inst_year  ON admissions(institution_id, admission_year);
CREATE INDEX idx_admissions_district   ON admissions(institution_id, district);
CREATE INDEX idx_subjects_dept_sem     ON subjects(department_id, semester);

CREATE INDEX idx_attendance_student    ON attendance(student_id, subject_id);
CREATE INDEX idx_attendance_date       ON attendance(institution_id, attendance_date);
CREATE INDEX idx_internal_student      ON internal_marks(student_id, subject_id);
CREATE INDEX idx_results_student_sem   ON semester_results(student_id, semester);
CREATE INDEX idx_gpa_student           ON semester_gpa(student_id);

CREATE INDEX idx_drives_inst_status    ON recruitment_drives(institution_id, status);
CREATE INDEX idx_rec_criteria_drive    ON recruitment_criteria(drive_id);
CREATE INDEX idx_eligible_drive        ON drive_eligible_students(drive_id, is_eligible);
CREATE INDEX idx_placements_inst       ON placements(institution_id, selected);
CREATE INDEX idx_placements_student    ON placements(student_id);
CREATE INDEX idx_placements_company    ON placements(company_id);

CREATE INDEX idx_usp_inst_dept         ON unified_student_profiles(institution_id, department_id);
CREATE INDEX idx_usp_risk              ON unified_student_profiles(institution_id, risk_level);
CREATE INDEX idx_risk_assess_student   ON risk_assessments(student_id, assessed_at DESC);
CREATE INDEX idx_recs_inst_status      ON recommendations(institution_id, status);

CREATE INDEX idx_audit_inst_time       ON audit_logs(institution_id, created_at DESC);
CREATE INDEX idx_audit_user            ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_users_inst_email      ON users(institution_id, email);
CREATE INDEX idx_sessions_user         ON user_sessions(user_id);

-- =====================================================================
-- TENANT-WIDE updated_at TRIGGER (applied to mutable tables)
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_institutions_updated BEFORE UPDATE ON institutions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- POSTGRES -> MYSQL PORTING NOTES (if MySQL is later required)
--   * UUID PK            -> CHAR(36) + app-generated UUID, or BIGINT AUTO_INCREMENT
--   * ENUM types         -> MySQL native ENUM(...) inline on the column
--   * JSONB              -> JSON
--   * INET               -> VARCHAR(45)
--   * TIMESTAMPTZ        -> TIMESTAMP / DATETIME (store UTC)
--   * arrays (comparator_t[]) -> JSON array
--   * partial/expression indexes -> rework as standard composite indexes
-- =====================================================================
