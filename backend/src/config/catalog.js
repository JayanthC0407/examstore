// Single source of truth for the catalogue taxonomy. The frontend reads this
// from GET /api/meta, so adding a department here is all that's needed.
export const DEPARTMENTS = [
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "ECE", name: "Electronics & Communication Engineering" },
  { code: "EEE", name: "Electrical & Electronics Engineering" },
  { code: "ME", name: "Mechanical Engineering" },
  { code: "CE", name: "Civil Engineering" },
  { code: "CHE", name: "Chemical Engineering" },
  { code: "MME", name: "Metallurgical & Materials Engineering" },
  { code: "BT", name: "Biotechnology" },
  { code: "MA", name: "Mathematics" },
  { code: "PH", name: "Physics" },
  { code: "CY", name: "Chemistry" },
  { code: "HS", name: "Humanities & Social Sciences" },
  { code: "SM", name: "School of Management" },
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
