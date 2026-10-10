// Track registry — configuration, not code paths. Adding a track = one entry here.
export const TRACKS = [
  { key: "banking", label: "Banking", priority: 1, relevance: 25, career: 10,
    subs: ["psu_bank", "private_bank", "regulator", "rrb_bank", "cooperative"] },
  { key: "government", label: "Government & competitive exams", priority: 2, relevance: 22, career: 9,
    subs: ["ssc", "railways", "central_govt", "state_govt", "psc", "court", "legislature", "postal"] },
  { key: "insurance", label: "Insurance", priority: 3, relevance: 21, career: 9, subs: ["public_insurer", "regulator", "private_insurer"] },
  { key: "physics_research", label: "Physics, teaching exams & research", priority: 4, relevance: 21, career: 9,
    subs: ["research_exam", "teaching_exam", "research_role", "lab_role"] },
  { key: "schools", label: "Schools", priority: 5, relevance: 20, career: 8, subs: ["central_school", "private_school", "state_school"] },
  { key: "colleges", label: "Colleges & institutes", priority: 6, relevance: 19, career: 8,
    subs: ["iit", "nit", "central_institute", "state_university", "private_institute"] },
  { key: "apprenticeship", label: "Apprenticeships & internships", priority: 7, relevance: 19, career: 7,
    subs: ["bank_apprentice", "govt_apprentice", "psu_apprentice", "internship"] },
  { key: "corporate", label: "Corporate & MNC", priority: 8, relevance: 18, career: 8, subs: ["operations", "analyst", "consulting", "pmo", "trainee"] },
];
export const TRACK = Object.fromEntries(TRACKS.map((t) => [t.key, t]));

export const SUB_LABELS = {
  ssc: "SSC", railways: "Railways", central_govt: "Central government", state_govt: "State government", psc: "Public Service Commission", court: "Court / judiciary", legislature: "Parliament / legislature", postal: "India Post",
  psu_bank: "PSU bank", private_bank: "Private bank", regulator: "Regulator", rrb_bank: "Regional rural bank", cooperative: "Cooperative bank",
  research_exam: "Research exam", teaching_exam: "Teaching eligibility exam", research_role: "Research role", lab_role: "Lab role",
  central_school: "Central school", private_school: "Private school", state_school: "State school", iit: "IIT", nit: "NIT",
  central_institute: "Central institute", state_university: "State university", private_institute: "Private institute",
  bank_apprentice: "Bank apprenticeship", govt_apprentice: "Government apprenticeship", psu_apprentice: "PSU apprenticeship",
  internship: "Internship", operations: "Operations", analyst: "Analyst", consulting: "Consulting", pmo: "PMO / coordination",
  trainee: "Trainee", public_insurer: "Public insurer", private_insurer: "Private insurer",
};

export const EMPLOYMENT_TYPES = { full_time: "Full-time", temporary: "Temporary", contract: "Contract", internship: "Internship", apprenticeship: "Apprenticeship", exam: "Exam" };

export const CODING_HEAVY = ["software developer", "software engineer", "full stack", "full-stack", "backend developer", "frontend developer",
  "java developer", ".net developer", "react developer", "sde", "devops engineer", "data engineer", "ml engineer", "android developer", "ios developer"];
export const HIGH_VALUE = ["officer", " po", "probationary", "pgt", "scientific", "manager", "assistant professor", "jrf", "analyst", "consultant", "cgl"];
export const LOWER_VALUE = ["apprentice", "intern", "mts", "group d", "office assistant", "peon"];

export const trackList = () => TRACKS.map((t) => ({ key: t.key, label: t.label, priority: t.priority,
  subcategories: t.subs.map((s) => ({ key: s, label: SUB_LABELS[s] || s })) }));
