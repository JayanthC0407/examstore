// Single source of truth for the catalogue taxonomy. The frontend reads this
// from GET /api/meta, so adding a department here is all that's needed.
// `short` is shown where space is tight (e.g. a closed dropdown).
export const DEPARTMENTS = [
  { code: "CSE", name: "Computer Science & Engineering", short: "Computer Science" },
  { code: "ECE", name: "Electronics & Communication Engineering", short: "Electronics & Comm." },
  { code: "EEE", name: "Electrical & Electronics Engineering", short: "Electrical" },
  { code: "ME", name: "Mechanical Engineering", short: "Mechanical" },
  { code: "CE", name: "Civil Engineering", short: "Civil" },
  { code: "CHE", name: "Chemical Engineering", short: "Chemical" },
  { code: "MME", name: "Metallurgical & Materials Engineering", short: "Metallurgy" },
  { code: "BT", name: "Biotechnology", short: "Biotechnology" },
  { code: "MA", name: "Mathematics", short: "Mathematics" },
  { code: "PH", name: "Physics", short: "Physics" },
  { code: "CY", name: "Chemistry", short: "Chemistry" },
  { code: "HS", name: "Humanities & Social Sciences", short: "Humanities" },
  { code: "SM", name: "School of Management", short: "Management" },
];

export const EXAM_TYPES = [
  { code: "mid-sem", name: "Mid-semester" },
  { code: "end-sem", name: "End-semester" },
  { code: "supplementary", name: "Supplementary" },
  { code: "quiz", name: "Quiz / Class test" },
  { code: "other", name: "Other" },
];

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export const DEPARTMENT_CODES = DEPARTMENTS.map((d) => d.code);
export const EXAM_TYPE_CODES = EXAM_TYPES.map((e) => e.code);
