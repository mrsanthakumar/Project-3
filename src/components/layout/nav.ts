/**
 * Sidebar navigation. Each item declares the permission that gates it; the
 * Sidebar filters by the current user's permissions (super_admin sees all).
 * `anyOf` items show if the user holds at least one of the listed permissions.
 */
export interface NavItem {
  label: string;
  href: string;
  anyOf: string[];
}
export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Executive Dashboard", href: "/dashboard", anyOf: ["dashboard.executive", "analytics.read"] }],
  },
  {
    title: "People & Structure",
    items: [
      { label: "Students", href: "/students", anyOf: ["student.read"] },
      { label: "Departments", href: "/departments", anyOf: ["department.crud"] },
      { label: "Subjects", href: "/subjects", anyOf: ["subject.crud"] },
      { label: "Admissions", href: "/admissions", anyOf: ["admission.crud"] },
    ],
  },
  {
    title: "Academics",
    items: [
      { label: "Attendance", href: "/attendance", anyOf: ["attendance.manage"] },
      { label: "Internal Marks", href: "/internal-marks", anyOf: ["internal.manage"] },
      { label: "Semester Results", href: "/semester-results", anyOf: ["result.manage"] },
    ],
  },
  {
    title: "Placement",
    items: [
      { label: "Companies", href: "/companies", anyOf: ["company.crud"] },
      { label: "Recruitment Drives", href: "/recruitment-drives", anyOf: ["drive.manage", "placement.read"] },
      { label: "Placements", href: "/placements", anyOf: ["placement.read", "placement.manage"] },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Risk", href: "/risk", anyOf: ["risk.read"] },
      { label: "Statistics", href: "/stats", anyOf: ["stats.run"] },
      { label: "Recommendations", href: "/recommendations", anyOf: ["recommendation.manage"] },
      { label: "Reports", href: "/reports", anyOf: ["report.export"] },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Institutions", href: "/institutions", anyOf: ["institution.manage"] },
      { label: "Users", href: "/users", anyOf: ["user.read"] },
      { label: "Roles & Permissions", href: "/roles", anyOf: ["role.manage"] },
      { label: "Audit Logs", href: "/audit-logs", anyOf: ["audit.read"] },
    ],
  },
];
