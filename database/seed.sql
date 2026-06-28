-- =====================================================================
-- Institutional Insights Dashboard — SEED DATA (PostgreSQL)
-- Bootstrap: 1 institution, RBAC catalogue, sample org tree, config.
-- Password for all bootstrap users: Admin@123
-- =====================================================================

-- ---------- Institution ----------
INSERT INTO institutions (id, code, name, city, state) VALUES
('00000000-0000-0000-0000-000000000001', 'DEMO', 'Demo Institute of Technology', 'Chennai', 'Tamil Nadu');

-- ---------- Roles (Super Admin is global; rest are tenant-scoped) ----------
INSERT INTO roles (id, institution_id, name, slug, is_system) VALUES
('10000000-0000-0000-0000-000000000001', NULL,                                   'Super Admin',       'super_admin',      TRUE),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Principal',         'principal',        TRUE),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Administration',    'administration',   TRUE),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'HOD',               'hod',              TRUE),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Faculty Advisor',   'faculty_advisor',  TRUE),
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Placement Officer', 'placement_officer',TRUE);

-- ---------- Permissions (module.action catalogue) ----------
INSERT INTO permissions (code, module, action) VALUES
('institution.manage','institution','manage'),
('user.create','user','create'), ('user.read','user','read'), ('user.update','user','update'), ('user.delete','user','delete'),
('role.manage','role','manage'),
('department.crud','department','crud'),
('student.create','student','create'), ('student.read','student','read'), ('student.update','student','update'), ('student.delete','student','delete'), ('student.upload','student','upload'),
('admission.crud','admission','crud'), ('admission.analytics','admission','analytics'),
('subject.crud','subject','crud'),
('attendance.manage','attendance','manage'),
('internal.manage','internal','manage'),
('result.manage','result','manage'),
('company.crud','company','crud'),
('drive.manage','drive','manage'), ('criteria.manage','criteria','manage'),
('placement.manage','placement','manage'), ('placement.read','placement','read'),
('analytics.read','analytics','read'),
('risk.read','risk','read'), ('risk.configure','risk','configure'),
('stats.run','stats','run'),
('recommendation.manage','recommendation','manage'),
('report.export','report','export'),
('dashboard.executive','dashboard','executive'),
('audit.read','audit','read');

-- ---------- Role → Permission grants ----------
-- Super Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000001', id FROM permissions;

-- Principal: read-everything + executive dashboard + analytics + audit
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000002', id FROM permissions
WHERE code IN ('student.read','admission.analytics','placement.read','analytics.read',
               'risk.read','stats.run','report.export','dashboard.executive','audit.read');

-- Administration: master data + students + admission + audit
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000003', id FROM permissions
WHERE code IN ('user.create','user.read','user.update','department.crud','subject.crud',
               'student.create','student.read','student.update','student.delete','student.upload',
               'admission.crud','admission.analytics','report.export','audit.read');

-- HOD: department-scoped academics + analytics + risk + recommendations
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000004', id FROM permissions
WHERE code IN ('student.read','student.update','subject.crud','attendance.manage','internal.manage',
               'result.manage','analytics.read','risk.read','stats.run','recommendation.manage','report.export');

-- Faculty Advisor: section-scoped academics entry + read
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000005', id FROM permissions
WHERE code IN ('student.read','attendance.manage','internal.manage','result.manage','risk.read','analytics.read');

-- Placement Officer: companies + drives + criteria + placement + analytics
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000006', id FROM permissions
WHERE code IN ('company.crud','drive.manage','criteria.manage','placement.manage','placement.read',
               'student.read','analytics.read','report.export');

-- ---------- Bootstrap users (password = 'Admin@123' — CHANGE IMMEDIATELY in prod) ----------
INSERT INTO users (id, institution_id, role_id, full_name, email, password_hash) VALUES
('20000000-0000-0000-0000-000000000001', NULL,                                   '10000000-0000-0000-0000-000000000001', 'Platform Super Admin', 'superadmin@demo.edu', '$2a$10$O.K3BJTrRaBKYPH1V8qVI.ozUUjv7yruDC6SC6AQJQVkZkh24RWVK'),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Demo Principal',       'principal@demo.edu',  '$2a$10$O.K3BJTrRaBKYPH1V8qVI.ozUUjv7yruDC6SC6AQJQVkZkh24RWVK');

-- ---------- Sample org tree ----------
INSERT INTO departments (id, institution_id, code, name) VALUES
('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'CSE',   'Computer Science & Engineering'),
('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ECE',   'Electronics & Communication'),
('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'MECH',  'Mechanical Engineering'),
('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'CIVIL', 'Civil Engineering'),
('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'MBA',   'Master of Business Administration');

INSERT INTO regulations (id, institution_id, code, name, effective_year) VALUES
('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'R2021', 'Regulation 2021', 2021);

INSERT INTO cohorts (id, institution_id, admission_year, graduation_year, label) VALUES
('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 2021, 2025, '2021-2025');

-- ---------- criteria_master: global eligibility catalogue (drives Module 10) ----------
INSERT INTO criteria_master (code, label, data_type, source_path, allowed_comparators, unit) VALUES
('TENTH_PCT',     '10th Percentage',     'NUMERIC', 'tenth_percentage',     '{GTE,LTE,GT,LT,EQ,BETWEEN}', '%'),
('TWELFTH_PCT',   '12th Percentage',     'NUMERIC', 'twelfth_percentage',   '{GTE,LTE,GT,LT,EQ,BETWEEN}', '%'),
('DIPLOMA_PCT',   'Diploma Percentage',  'NUMERIC', 'diploma_percentage',   '{GTE,LTE,GT,LT,EQ,BETWEEN}', '%'),
('CGPA',          'CGPA',                'NUMERIC', 'current_cgpa',         '{GTE,LTE,GT,LT,EQ,BETWEEN}', NULL),
('ACTIVE_ARREARS','Active Arrears',      'INTEGER', 'active_arrears',       '{GTE,LTE,GT,LT,EQ}',         NULL),
('HISTORY_ARREARS','History Arrears',    'INTEGER', 'history_arrears',      '{GTE,LTE,GT,LT,EQ}',         NULL),
('DEPARTMENT',    'Department',          'ENUM',    'department_id',        '{EQ,NEQ,IN,NOT_IN}',         NULL),
('GENDER',        'Gender',              'ENUM',    'gender',               '{EQ,NEQ,IN}',                NULL),
('INTERNSHIP_CNT','Internship Count',    'INTEGER', 'internship_count',     '{GTE,LTE,GT,LT,EQ}',         NULL),
('CERT_CNT',      'Certification Count', 'INTEGER', 'certification_count',  '{GTE,LTE,GT,LT,EQ}',         NULL),
('HACKATHON_CNT', 'Hackathon Count',     'INTEGER', 'hackathon_count',      '{GTE,LTE,GT,LT,EQ}',         NULL),
('CODING_SCORE',  'Coding Score',        'NUMERIC', 'coding_score',         '{GTE,LTE,GT,LT,EQ,BETWEEN}', NULL);

-- ---------- Default risk rule set (thresholds are config, not code) ----------
INSERT INTO risk_rule_sets (id, institution_id, name) VALUES
('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Default Risk Model');

INSERT INTO risk_rules (institution_id, rule_set_id, category, metric, comparator, threshold_num, weight, message_template) VALUES
('00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','ACADEMIC',  'current_cgpa',       'LT', 6,  40, 'CGPA {value} is below {threshold}'),
('00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','ATTENDANCE','avg_attendance_pct', 'LT', 75, 35, 'Attendance {value}% is below {threshold}%'),
('00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','PLACEMENT', 'active_arrears',     'GT', 3,  25, 'Active arrears {value} exceed {threshold}');

INSERT INTO risk_bands (institution_id, rule_set_id, level, min_score, max_score) VALUES
('00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','LOW',     0,  33),
('00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','MEDIUM', 34,  66),
('00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','HIGH',   67, 100);

-- ---------- Sample recommendation rules (Module 16) ----------
INSERT INTO recommendation_rules (institution_id, name, scope_level, conditions, logic, action_text, priority) VALUES
('00000000-0000-0000-0000-000000000001','Low attendance counseling','STUDENT',
 '[{"metric":"avg_attendance_pct","comparator":"LT","value":75}]','ALL','Conduct Counseling',1),
('00000000-0000-0000-0000-000000000001','Boost industry connect','DEPARTMENT',
 '[{"metric":"placement_pct","comparator":"LT","value":60},{"metric":"avg_cgpa","comparator":"GT","value":7}]','ALL','Improve Industry Connect',2),
('00000000-0000-0000-0000-000000000001','Remedial coaching','DEPARTMENT',
 '[{"metric":"high_arrear_ratio","comparator":"GT","value":0.3}]','ALL','Conduct Remedial Coaching',2);
