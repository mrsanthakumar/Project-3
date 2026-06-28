import { z } from "zod";
import type { ResourceConfig } from "@/lib/crud";
import { zUuid } from "@/lib/crud";

const ATT_STATUS = ["PRESENT", "ABSENT", "OD", "LEAVE"] as const;
const RESULT = ["PASS", "FAIL", "ABSENT", "WITHHELD"] as const;

// ---------- Attendance (Module 6) ----------
export const attendanceResource: ResourceConfig = {
  table: "attendance",
  entity: "attendance",
  permissionView: "attendance.manage",
  permissionWrite: "attendance.manage",
  filterable: {
    student_id: "student_id",
    subject_id: "subject_id",
    status: "status",
    attendance_date: "attendance_date",
  },
  sortable: { date: "attendance_date" },
  defaultSort: "attendance_date DESC",
  columns: [
    { api: "studentId", db: "student_id", insertable: true, updatable: true },
    { api: "subjectId", db: "subject_id", insertable: true, updatable: true },
    { api: "attendanceDate", db: "attendance_date", insertable: true, updatable: true },
    { api: "status", db: "status", insertable: true, updatable: true },
    { api: "period", db: "period", insertable: true, updatable: true },
    { api: "markedBy", db: "marked_by", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    studentId: zUuid,
    subjectId: zUuid,
    attendanceDate: z.string().date(),
    status: z.enum(ATT_STATUS),
    period: z.number().int().min(1).max(12).optional(),
  }),
  updateSchema: z.object({ status: z.enum(ATT_STATUS) }).partial(),
};

// ---------- Internal Marks (Module 7) ----------
export const internalMarkResource: ResourceConfig = {
  table: "internal_marks",
  entity: "internal_mark",
  permissionView: "internal.manage",
  permissionWrite: "internal.manage",
  filterable: { student_id: "student_id", subject_id: "subject_id", semester: "semester" },
  sortable: { semester: "semester" },
  defaultSort: "semester ASC",
  columns: [
    { api: "studentId", db: "student_id", insertable: true, updatable: true },
    { api: "subjectId", db: "subject_id", insertable: true, updatable: true },
    { api: "semester", db: "semester", insertable: true, updatable: true },
    { api: "test1", db: "test1", insertable: true, updatable: true },
    { api: "test2", db: "test2", insertable: true, updatable: true },
    { api: "assignment", db: "assignment", insertable: true, updatable: true },
    { api: "internalAverage", db: "internal_average", insertable: true, updatable: true },
    { api: "maxMarks", db: "max_marks", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    studentId: zUuid,
    subjectId: zUuid,
    semester: z.number().int().min(1).max(12).optional(),
    test1: z.number().min(0).optional(),
    test2: z.number().min(0).optional(),
    assignment: z.number().min(0).optional(),
    maxMarks: z.number().min(1).optional(),
  }),
  updateSchema: z
    .object({
      test1: z.number().min(0),
      test2: z.number().min(0),
      assignment: z.number().min(0),
      internalAverage: z.number().min(0),
    })
    .partial(),
};

// ---------- Semester Results (Module 8) ----------
export const semesterResultResource: ResourceConfig = {
  table: "semester_results",
  entity: "semester_result",
  permissionView: "result.manage",
  permissionWrite: "result.manage",
  filterable: {
    student_id: "student_id",
    subject_id: "subject_id",
    semester: "semester",
    result: "result",
  },
  sortable: { semester: "semester" },
  defaultSort: "semester ASC",
  columns: [
    { api: "studentId", db: "student_id", insertable: true, updatable: true },
    { api: "subjectId", db: "subject_id", insertable: true, updatable: true },
    { api: "semester", db: "semester", insertable: true, updatable: true },
    { api: "grade", db: "grade", insertable: true, updatable: true },
    { api: "gradePoints", db: "grade_points", insertable: true, updatable: true },
    { api: "result", db: "result", insertable: true, updatable: true },
    { api: "creditsEarned", db: "credits_earned", insertable: true, updatable: true },
    { api: "isArrear", db: "is_arrear", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    studentId: zUuid,
    subjectId: zUuid,
    semester: z.number().int().min(1).max(12),
    grade: z.string().max(5).optional(),
    gradePoints: z.number().min(0).max(10).optional(),
    result: z.enum(RESULT).optional(),
    creditsEarned: z.number().min(0).max(20).optional(),
    isArrear: z.boolean().optional(),
  }),
  updateSchema: z
    .object({
      grade: z.string().max(5),
      gradePoints: z.number().min(0).max(10),
      result: z.enum(RESULT),
      creditsEarned: z.number().min(0).max(20),
      isArrear: z.boolean(),
    })
    .partial(),
};
