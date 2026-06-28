-- =====================================================================
-- Migration 004 — fix bootstrap user password hashes.
-- The original seed shipped a PLACEHOLDER hash that could never match.
-- This sets both bootstrap users to bcrypt('Admin@123'). Safe to re-run.
-- Run if you seeded before the hash fix:
--   psql "$DATABASE_URL" -f database/migrations/004_fix_bootstrap_password.sql
-- =====================================================================

UPDATE users
   SET password_hash = '$2a$10$O.K3BJTrRaBKYPH1V8qVI.ozUUjv7yruDC6SC6AQJQVkZkh24RWVK'
 WHERE email IN ('superadmin@demo.edu', 'principal@demo.edu');
