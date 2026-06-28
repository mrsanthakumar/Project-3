-- =====================================================================
-- DEMO SAMPLE DATA (optional) — populates the DEMO institution with users
-- for every role, students, admissions, academics, and placements so the
-- dashboards/analytics show real numbers and every login can be demoed.
--   psql "$DATABASE_URL" -f database/seed_demo.sql
-- After running: log in, open Executive Dashboard → "Refresh Data".
-- =====================================================================

-- One user per role (all password: Admin@123) so every login can be demoed.
INSERT INTO users (id, institution_id, role_id, department_id, full_name, email, password_hash) VALUES
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', NULL,                                   'Demo Admin',             'admin@demo.edu',     '$2a$10$O.K3BJTrRaBKYPH1V8qVI.ozUUjv7yruDC6SC6AQJQVkZkh24RWVK'),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'Demo HOD (CSE)',         'hod@demo.edu',       '$2a$10$O.K3BJTrRaBKYPH1V8qVI.ozUUjv7yruDC6SC6AQJQVkZkh24RWVK'),
('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 'Demo Faculty Advisor',   'advisor@demo.edu',   '$2a$10$O.K3BJTrRaBKYPH1V8qVI.ozUUjv7yruDC6SC6AQJQVkZkh24RWVK'),
('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', NULL,                                   'Demo Placement Officer', 'placement@demo.edu', '$2a$10$O.K3BJTrRaBKYPH1V8qVI.ozUUjv7yruDC6SC6AQJQVkZkh24RWVK')
ON CONFLICT DO NOTHING;

-- Subjects (CSE)
INSERT INTO subjects (id, institution_id, department_id, regulation_id, code, name, credits, semester) VALUES
('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','CS101','Programming',4,1),
('b0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','CS201','Data Structures',4,2)
ON CONFLICT DO NOTHING;

-- Students (mix of departments, CGPA, arrears, gender)
INSERT INTO students (id, institution_id, register_number, name, gender, date_of_birth, email, mobile,
                      tenth_percentage, twelfth_percentage, admission_type, cutoff_mark,
                      department_id, current_cgpa, active_arrears, history_arrears, status) VALUES
('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','21CSE001','Anand R','MALE','2003-05-12','anand@demo.edu','9000000001',92.0,94.0,'COUNSELING',195,'30000000-0000-0000-0000-000000000001',8.9,0,0,'ACTIVE'),
('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','21CSE002','Bhavna S','FEMALE','2003-07-19','bhavna@demo.edu','9000000002',88.0,90.0,'COUNSELING',190,'30000000-0000-0000-0000-000000000001',8.2,0,1,'ACTIVE'),
('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','21CSE003','Charan K','MALE','2003-01-09','charan@demo.edu','9000000003',70.0,68.0,'MANAGEMENT',150,'30000000-0000-0000-0000-000000000001',5.4,4,5,'ACTIVE'),
('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','21CSE004','Divya P','FEMALE','2003-11-23','divya@demo.edu','9000000004',95.0,96.0,'COUNSELING',198,'30000000-0000-0000-0000-000000000001',9.3,0,0,'ACTIVE'),
('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','21ECE001','Eswar M','MALE','2003-03-30','eswar@demo.edu','9000000005',78.0,75.0,'COUNSELING',165,'30000000-0000-0000-0000-000000000002',6.1,2,3,'ACTIVE'),
('a0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','21ECE002','Farah N','FEMALE','2003-09-14','farah@demo.edu','9000000006',85.0,83.0,'COUNSELING',178,'30000000-0000-0000-0000-000000000002',7.6,0,0,'ACTIVE'),
('a0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','21ECE003','Gokul V','MALE','2003-06-02','gokul@demo.edu','9000000007',60.0,58.0,'LATERAL_ENTRY',130,'30000000-0000-0000-0000-000000000002',5.9,3,4,'ACTIVE'),
('a0000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','21CSE005','Hema L','FEMALE','2003-12-08','hema@demo.edu','9000000008',90.0,91.0,'COUNSELING',192,'30000000-0000-0000-0000-000000000001',8.7,0,0,'ACTIVE')
ON CONFLICT DO NOTHING;

-- Employability extras
INSERT INTO student_profiles_extra (student_id, institution_id, internship_count, certification_count, hackathon_count, coding_score) VALUES
('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',2,3,1,820),
('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001',3,4,2,910),
('a0000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001',1,2,1,760)
ON CONFLICT DO NOTHING;

-- Admissions (district / year spread)
INSERT INTO admissions (institution_id, student_id, department_id, admission_year, admission_type, cutoff_mark, school_name, district, state) VALUES
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',2021,'COUNSELING',195,'St. Johns','Chennai','Tamil Nadu'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001',2021,'COUNSELING',190,'Green Valley','Coimbatore','Tamil Nadu'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001',2021,'MANAGEMENT',150,'City High','Madurai','Tamil Nadu'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001',2021,'COUNSELING',198,'St. Johns','Chennai','Tamil Nadu'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000002',2021,'COUNSELING',165,'Model School','Salem','Tamil Nadu'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000002',2021,'COUNSELING',178,'Green Valley','Coimbatore','Tamil Nadu'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000002',2022,'LATERAL_ENTRY',130,'City High','Madurai','Tamil Nadu'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000001',2021,'COUNSELING',192,'St. Johns','Chennai','Tamil Nadu');

-- Semester results (drives pass %); one FAIL for the weak student
INSERT INTO semester_results (institution_id, student_id, subject_id, semester, grade, grade_points, result, credits_earned) VALUES
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',1,'O',10,'PASS',4),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001',1,'A+',9,'PASS',4),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001',1,'U',0,'FAIL',0),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000001',1,'O',10,'PASS',4),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001',1,'B',7,'PASS',4),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000001',1,'A',8,'PASS',4)
ON CONFLICT DO NOTHING;

-- Attendance — student 3 below 75% (4 absent / 2 present), others fine
INSERT INTO attendance (institution_id, student_id, subject_id, attendance_date, status) VALUES
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','2025-01-06','ABSENT'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','2025-01-07','ABSENT'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','2025-01-08','ABSENT'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','2025-01-09','ABSENT'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','2025-01-10','PRESENT'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','2025-01-13','PRESENT'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','2025-01-06','PRESENT'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','2025-01-07','PRESENT'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001','2025-01-06','PRESENT'),
('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001','2025-01-07','ABSENT')
ON CONFLICT DO NOTHING;

-- Company + drive + placements (drives placement % and packages)
INSERT INTO companies (id, institution_id, name, industry, tier, location) VALUES
('c0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Acme Corp','IT Services','TIER1','Bengaluru')
ON CONFLICT DO NOTHING;

INSERT INTO recruitment_drives (id, institution_id, company_id, title, role, drive_date, package_lpa, status) VALUES
('d0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','Acme 2025 Drive','SDE','2025-02-15',12.0,'COMPLETED')
ON CONFLICT DO NOTHING;

INSERT INTO placements (institution_id, drive_id, company_id, student_id, status, applied, attended, selected, package_lpa) VALUES
('00000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','SELECTED',TRUE,TRUE,TRUE,12.0),
('00000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','SELECTED',TRUE,TRUE,TRUE,18.0),
('00000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000008','SELECTED',TRUE,TRUE,TRUE,9.5),
('00000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','ATTENDED',TRUE,TRUE,FALSE,NULL),
('00000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','APPLIED',TRUE,FALSE,FALSE,NULL)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- Pre-build the unified read model + risk so dashboards show data
-- immediately (mirrors POST /analytics/refresh + /risk/assess). The UI's
-- "Refresh Data" button regenerates this on demand afterwards.
-- =====================================================================
INSERT INTO unified_student_profiles (
    student_id, institution_id, department_id, batch_id, cohort_id,
    admission_year, admission_type, cutoff_mark,
    tenth_percentage, twelfth_percentage, diploma_percentage,
    current_cgpa, active_arrears, history_arrears,
    avg_attendance_pct, avg_internal,
    internship_count, certification_count, hackathon_count, coding_score,
    is_placed, highest_package_lpa, offers_count, refreshed_at)
SELECT s.id, s.institution_id, s.department_id, s.batch_id, b.cohort_id,
       adm.admission_year, s.admission_type, s.cutoff_mark,
       s.tenth_percentage, s.twelfth_percentage, s.diploma_percentage,
       s.current_cgpa, s.active_arrears, s.history_arrears,
       att.avg_attendance_pct, im.avg_internal,
       COALESCE(e.internship_count,0), COALESCE(e.certification_count,0),
       COALESCE(e.hackathon_count,0), e.coding_score,
       COALESCE(pl.is_placed,FALSE), pl.highest_package, COALESCE(pl.offers,0), now()
  FROM students s
  LEFT JOIN batches b ON b.id = s.batch_id
  LEFT JOIN LATERAL (SELECT admission_year FROM admissions a WHERE a.student_id = s.id ORDER BY admission_year DESC LIMIT 1) adm ON TRUE
  LEFT JOIN (SELECT student_id, round(100.0*SUM(CASE WHEN status IN ('PRESENT','OD') THEN 1 ELSE 0 END)/NULLIF(count(*),0),2) AS avg_attendance_pct FROM attendance GROUP BY student_id) att ON att.student_id = s.id
  LEFT JOIN (SELECT student_id, round(avg(internal_average),2) AS avg_internal FROM internal_marks GROUP BY student_id) im ON im.student_id = s.id
  LEFT JOIN student_profiles_extra e ON e.student_id = s.id
  LEFT JOIN (SELECT student_id, bool_or(selected) AS is_placed, max(package_lpa) FILTER (WHERE selected) AS highest_package, count(*) FILTER (WHERE selected) AS offers FROM placements GROUP BY student_id) pl ON pl.student_id = s.id
 WHERE s.institution_id = '00000000-0000-0000-0000-000000000001' AND s.deleted_at IS NULL
ON CONFLICT (student_id) DO UPDATE SET
    current_cgpa = EXCLUDED.current_cgpa, active_arrears = EXCLUDED.active_arrears,
    avg_attendance_pct = EXCLUDED.avg_attendance_pct, is_placed = EXCLUDED.is_placed,
    highest_package_lpa = EXCLUDED.highest_package_lpa, offers_count = EXCLUDED.offers_count,
    refreshed_at = now();

-- Risk score from the seeded default model (cgpa<6:+40, attendance<75:+35, arrears>3:+25)
UPDATE unified_student_profiles SET
    risk_score = (CASE WHEN current_cgpa < 6 THEN 40 ELSE 0 END)
               + (CASE WHEN avg_attendance_pct < 75 THEN 35 ELSE 0 END)
               + (CASE WHEN active_arrears > 3 THEN 25 ELSE 0 END)
  WHERE institution_id = '00000000-0000-0000-0000-000000000001';
UPDATE unified_student_profiles SET
    risk_level = (CASE WHEN risk_score >= 67 THEN 'HIGH' WHEN risk_score >= 34 THEN 'MEDIUM' ELSE 'LOW' END)::risk_level_t
  WHERE institution_id = '00000000-0000-0000-0000-000000000001';
