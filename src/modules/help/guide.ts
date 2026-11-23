/**
 * The Help Centre (/help): every question a new organisation asks, in the order a business sets itself up. Pure data —
 * the words live in src/i18n/{en,hi}/help.ts under help.q.<id> (q, a, s1…sN, and tip when `tip` is set); this file says
 * where each answer leads, who does it, and how the questions hang together. tests/unit/help.test.ts checks that every
 * question has its words in both languages and that every link is a real screen.
 */

export type HelpWho = "owner" | "admin" | "hr" | "accounts" | "checker" | "officer" | "employee" | "pensioner" | "everyone";

export interface HelpQuestion {
  id: string;
  /** How many numbered steps the answer has (s1 … sN). */
  steps: number;
  /** The answer ends with a tip (help.q.<id>.tip). */
  tip?: boolean;
  /** The screen the answer is about ("Open this screen"). */
  href?: string;
  who: HelpWho[];
  related?: string[];
}

export interface HelpCategory {
  id: string;
  icon: "rocket" | "building" | "users" | "idcard" | "calendar" | "leaf" | "scale" | "wallet" | "landmark" | "heart" | "briefcase" | "chart" | "user" | "lifebuoy";
  questions: HelpQuestion[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "start",
    icon: "rocket",
    questions: [
      { id: "whatIsKosh", steps: 0, who: ["everyone"], related: ["firstDay", "simpleOrTwoStep"] },
      { id: "firstDay", steps: 10, tip: true, href: "/admin/setup", who: ["admin"], related: ["orgProfile", "createUser", "firstEmployee", "firstPayroll"] },
      { id: "newOrganisation", steps: 5, tip: true, href: "/platform", who: ["owner"], related: ["firstSignIn"] },
      { id: "firstSignIn", steps: 5, tip: true, href: "/login", who: ["everyone"], related: ["otpNotReceived", "changePassword"] },
      { id: "changePassword", steps: 3, href: "/profile", who: ["everyone"], related: ["lockedOut"] },
      { id: "simpleOrTwoStep", steps: 3, tip: true, href: "/admin/settings#workflow", who: ["admin"], related: ["whoApproves", "assignPermission"] },
      { id: "setupChecklist", steps: 3, href: "/admin/setup", who: ["admin"], related: ["firstDay"] },
      { id: "languageTheme", steps: 2, href: "/profile", who: ["everyone"] },
    ],
  },
  {
    id: "org",
    icon: "building",
    questions: [
      { id: "orgProfile", steps: 4, href: "/admin/organisation", who: ["admin"], related: ["statutoryDetails"] },
      { id: "statutoryDetails", steps: 5, tip: true, href: "/admin/settings#statutory", who: ["admin", "accounts"], related: ["professionalTax", "form24q"] },
      { id: "createSection", steps: 4, tip: true, href: "/admin/sections", who: ["admin", "hr"], related: ["createPost", "workingDays"] },
      { id: "createPost", steps: 4, href: "/admin/posts", who: ["admin", "hr"], related: ["sanctionedPosts", "payMatrix"] },
      { id: "workingDays", steps: 6, tip: true, href: "/admin/settings#attendance", who: ["admin", "hr"], related: ["holidays", "lateRules"] },
      { id: "holidays", steps: 4, tip: true, href: "/attendance/holidays", who: ["admin", "hr"], related: ["workingDays"] },
      { id: "salaryBank", steps: 4, href: "/admin/settings#bank", who: ["admin", "accounts"], related: ["bankFile"] },
      { id: "smsGateway", steps: 5, tip: true, href: "/admin/settings#sms", who: ["admin"], related: ["otpNotReceived"] },
      { id: "emailSetup", steps: 4, href: "/admin/settings#email", who: ["admin"], related: ["finishMonth"] },
      { id: "documentTypes", steps: 3, href: "/admin/settings#documents", who: ["admin"], related: ["uploadDocuments"] },
      { id: "payslipSettings", steps: 2, href: "/admin/settings#payslip", who: ["admin"], related: ["employeePayslip"] },
    ],
  },
  {
    id: "users",
    icon: "users",
    questions: [
      { id: "createUser", steps: 5, tip: true, href: "/admin/users", who: ["admin"], related: ["assignPermission", "whatEachRoleDoes"] },
      { id: "whatEachRoleDoes", steps: 0, href: "/admin/users", who: ["admin"], related: ["assignPermission"] },
      { id: "assignPermission", steps: 5, tip: true, href: "/admin/users", who: ["admin"], related: ["whatEachRoleDoes", "sectionHead"] },
      { id: "sectionHead", steps: 4, href: "/admin/users", who: ["admin", "hr"], related: ["approveLeave", "missedPunch"] },
      { id: "resetPassword", steps: 3, href: "/admin/users", who: ["admin"], related: ["lockedOut"] },
      { id: "switchOffUser", steps: 3, tip: true, href: "/admin/users", who: ["admin"], related: ["employeeLeaves"] },
      { id: "whoApproves", steps: 4, tip: true, href: "/approvals", who: ["admin", "checker", "officer"], related: ["simpleOrTwoStep", "ownEntry"] },
      { id: "auditTrail", steps: 3, href: "/admin/audit", who: ["admin"] },
    ],
  },
  {
    id: "people",
    icon: "idcard",
    questions: [
      { id: "firstEmployee", steps: 7, tip: true, href: "/employees/new", who: ["admin", "hr"], related: ["employeeId", "employeeLogin", "bulkUpload"] },
      { id: "employeeId", steps: 3, href: "/employees", who: ["admin", "hr"], related: ["firstEmployee"] },
      { id: "bulkUpload", steps: 5, tip: true, href: "/employees/bulk", who: ["admin", "hr"], related: ["firstEmployee", "openingLeave"] },
      { id: "employeeLogin", steps: 4, tip: true, href: "/employees", who: ["admin", "hr"], related: ["employeeSignIn"] },
      { id: "editEmployee", steps: 4, href: "/employees", who: ["admin", "hr"], related: ["changeRequests"] },
      { id: "changeRequests", steps: 4, href: "/employees/requests", who: ["hr", "checker", "employee"], related: ["employeeBankChange"] },
      { id: "familyNominee", steps: 3, href: "/employees", who: ["hr"], related: ["familyPension"] },
      { id: "uploadDocuments", steps: 4, href: "/employees", who: ["hr"], related: ["documentTypes", "serviceBookScans"] },
      { id: "serviceBook", steps: 3, href: "/employees", who: ["hr"], related: ["serviceBookScans"] },
      { id: "serviceBookScans", steps: 3, href: "/employees/service-books", who: ["hr"] },
      { id: "sanctionedPosts", steps: 3, href: "/employees/posts", who: ["admin", "hr"], related: ["createVacancy"] },
      { id: "employeeLeaves", steps: 5, tip: true, href: "/employees/exits", who: ["hr", "checker", "admin"], related: ["settlement"] },
      { id: "findEmployee", steps: 2, href: "/employees", who: ["admin", "hr", "accounts"] },
    ],
  },
  {
    id: "attendance",
    icon: "calendar",
    questions: [
      { id: "connectDevice", steps: 5, tip: true, href: "/admin/settings#attendance", who: ["admin"], related: ["importPunches"] },
      { id: "importPunches", steps: 4, href: "/attendance?tab=import", who: ["hr"], related: ["connectDevice"] },
      { id: "musterRoll", steps: 4, href: "/attendance?tab=register", who: ["hr", "officer"], related: ["lockAttendance"] },
      { id: "lateRules", steps: 3, href: "/admin/settings#attendance", who: ["admin"], related: ["workingDays"] },
      { id: "missedPunch", steps: 4, href: "/my/attendance", who: ["employee", "officer"], related: ["lockAttendance"] },
      { id: "lockAttendance", steps: 6, tip: true, href: "/attendance?tab=lock", who: ["hr", "officer"], related: ["unlockAttendance", "firstPayroll"] },
      { id: "unlockAttendance", steps: 3, href: "/attendance?tab=lock", who: ["hr", "checker"], related: ["lockAttendance"] },
      { id: "todayBoard", steps: 2, href: "/attendance", who: ["hr", "officer"] },
    ],
  },
  {
    id: "leave",
    icon: "leaf",
    questions: [
      { id: "leaveRules", steps: 4, tip: true, href: "/leave/manage?tab=rules", who: ["admin", "hr"], related: ["leaveCredits"] },
      { id: "leaveCredits", steps: 0, href: "/leave/manage?tab=balances", who: ["hr"], related: ["openingLeave"] },
      { id: "openingLeave", steps: 4, tip: true, href: "/leave/manage?tab=opening", who: ["hr"], related: ["bulkUpload"] },
      { id: "applyLeave", steps: 4, href: "/leave/apply", who: ["employee"], related: ["approveLeave"] },
      { id: "approveLeave", steps: 3, href: "/approvals", who: ["officer", "hr"], related: ["sectionHead"] },
      { id: "paperLeave", steps: 3, href: "/leave/manage?tab=enter", who: ["hr"] },
      { id: "leaveAccount", steps: 2, href: "/leave/manage?tab=balances", who: ["hr", "employee"] },
    ],
  },
  {
    id: "rates",
    icon: "scale",
    questions: [
      { id: "setDa", steps: 5, tip: true, href: "/admin/rates?tab=rates", who: ["accounts", "admin"], related: ["setTa", "arrears"] },
      { id: "setTa", steps: 4, tip: true, href: "/admin/rates?tab=daTa", who: ["accounts", "admin"], related: ["setDa", "setHra"] },
      { id: "setHra", steps: 4, href: "/admin/rates?tab=rates", who: ["accounts", "admin"], related: ["statutoryDetails"] },
      { id: "payMatrix", steps: 4, tip: true, href: "/admin/rates?tab=matrix", who: ["accounts", "admin"], related: ["firstEmployee", "increments"] },
      { id: "payHeads", steps: 5, tip: true, href: "/admin/rates?tab=heads", who: ["accounts", "admin"], related: ["payItems"] },
      { id: "payItems", steps: 5, href: "/payroll/items", who: ["accounts"], related: ["payHeads", "loans"] },
      { id: "taxSlabs", steps: 3, href: "/admin/rates?tab=tax", who: ["accounts", "admin"], related: ["taxDeclarations"] },
      { id: "professionalTax", steps: 3, href: "/admin/settings#statutory", who: ["admin", "accounts"] },
      { id: "npsGpf", steps: 0, href: "/admin/rates?tab=rates", who: ["accounts"], related: ["gpf", "statutoryFiles"] },
    ],
  },
  {
    id: "payroll",
    icon: "wallet",
    questions: [
      { id: "firstPayroll", steps: 8, tip: true, href: "/payroll", who: ["accounts", "admin"], related: ["preChecks", "approvePay", "bankFile"] },
      { id: "preChecks", steps: 3, tip: true, href: "/payroll", who: ["accounts"], related: ["holdPay"] },
      { id: "holdPay", steps: 3, href: "/payroll", who: ["accounts"], related: ["preChecks"] },
      { id: "approvePay", steps: 5, tip: true, href: "/approvals", who: ["checker", "admin"], related: ["simpleOrTwoStep", "bankFile"] },
      { id: "bankFile", steps: 4, tip: true, href: "/payroll", who: ["accounts", "admin"], related: ["failedCredits", "salaryBank"] },
      { id: "failedCredits", steps: 4, href: "/payroll", who: ["accounts"] },
      { id: "finishMonth", steps: 3, href: "/payroll", who: ["accounts", "admin"], related: ["employeePayslip"] },
      { id: "reopenBill", steps: 3, tip: true, href: "/payroll", who: ["admin"], related: ["wrongSalary"] },
      { id: "downloadPayslips", steps: 3, href: "/payroll/payslips", who: ["accounts"], related: ["employeePayslip"] },
      { id: "increments", steps: 4, tip: true, href: "/payroll/increments", who: ["accounts", "checker"], related: ["promotion"] },
      { id: "promotion", steps: 4, href: "/payroll/increments", who: ["accounts", "checker", "admin"], related: ["arrears"] },
      { id: "arrears", steps: 4, tip: true, href: "/payroll/arrears", who: ["accounts"], related: ["setDa"] },
      { id: "loans", steps: 5, href: "/payroll/loans", who: ["accounts", "checker", "admin"], related: ["payItems"] },
      { id: "settlement", steps: 5, href: "/employees/exits", who: ["accounts", "checker", "admin"], related: ["employeeLeaves"] },
    ],
  },
  {
    id: "statutory",
    icon: "landmark",
    questions: [
      { id: "taxDeclarations", steps: 4, tip: true, href: "/statutory/declarations", who: ["accounts", "employee"], related: ["taxSlabs", "employeeTax"] },
      { id: "tdsChallans", steps: 4, href: "/statutory/tds", who: ["accounts"], related: ["form24q"] },
      { id: "form24q", steps: 4, tip: true, href: "/statutory/tds", who: ["accounts", "admin"], related: ["statutoryDetails"] },
      { id: "form16", steps: 4, href: "/statutory/form16", who: ["accounts"], related: ["employeeTax"] },
      { id: "gpf", steps: 4, href: "/statutory/funds", who: ["accounts"], related: ["npsGpf"] },
      { id: "statutoryFiles", steps: 4, tip: true, href: "/statutory/files", who: ["accounts", "admin"], related: ["statutoryCalendar"] },
      { id: "statutoryCalendar", steps: 2, href: "/statutory", who: ["accounts"], related: ["statutoryFiles"] },
    ],
  },
  {
    id: "pension",
    icon: "heart",
    questions: [
      { id: "addPensioner", steps: 5, tip: true, href: "/pension/pensioners/new", who: ["accounts", "checker"], related: ["pensionBill"] },
      { id: "pensionBill", steps: 4, href: "/pension", who: ["accounts", "admin"], related: ["lifeCertificate"] },
      { id: "lifeCertificate", steps: 4, tip: true, href: "/pension/life-certificates", who: ["accounts", "pensioner"], related: ["pensionerLifeCert"] },
      { id: "retirementCase", steps: 6, tip: true, href: "/pension/cases", who: ["accounts", "checker", "admin"], related: ["pensionBill"] },
      { id: "familyPension", steps: 4, href: "/pension/pensioners", who: ["accounts", "checker"], related: ["familyNominee"] },
    ],
  },
  {
    id: "hiring",
    icon: "briefcase",
    questions: [
      { id: "createVacancy", steps: 5, tip: true, href: "/recruitment/vacancies/new", who: ["hr", "admin"], related: ["sanctionedPosts", "addApplicants"] },
      { id: "addApplicants", steps: 4, href: "/recruitment", who: ["hr"], related: ["appointmentLetter"] },
      { id: "appointmentLetter", steps: 4, href: "/recruitment", who: ["hr", "admin"], related: ["joining"] },
      { id: "joining", steps: 5, tip: true, href: "/recruitment?tab=joining", who: ["hr", "checker"], related: ["employeeLogin"] },
      { id: "contractWorker", steps: 4, href: "/recruitment/joining/new", who: ["hr"], related: ["firstEmployee"] },
      { id: "probation", steps: 3, href: "/recruitment?tab=probation", who: ["hr"] },
    ],
  },
  {
    id: "reports",
    icon: "chart",
    questions: [
      { id: "runReport", steps: 4, href: "/reports", who: ["admin", "hr", "accounts"], related: ["ghostCheck"] },
      { id: "ghostCheck", steps: 3, tip: true, href: "/reports/ghost-check", who: ["admin", "accounts"], related: ["firstPayroll"] },
      { id: "homeDashboard", steps: 0, href: "/", who: ["everyone"] },
      { id: "askAi", steps: 5, tip: true, href: "/admin/settings", who: ["owner", "admin"], related: ["askDocuments"] },
      { id: "askDocuments", steps: 3, href: "/ask/documents", who: ["admin"], related: ["askAi"] },
    ],
  },
  {
    id: "self",
    icon: "user",
    questions: [
      { id: "employeeSignIn", steps: 4, href: "/login", who: ["employee", "pensioner"], related: ["otpNotReceived"] },
      { id: "employeePayslip", steps: 3, href: "/my/payslips", who: ["employee"], related: ["employeeTax"] },
      { id: "employeeTax", steps: 4, href: "/my/tax", who: ["employee"], related: ["taxDeclarations", "form16"] },
      { id: "employeeBankChange", steps: 4, tip: true, href: "/my/requests", who: ["employee"], related: ["changeRequests"] },
      { id: "employeeAttendance", steps: 2, href: "/my/attendance", who: ["employee"], related: ["missedPunch"] },
      { id: "pensionerLifeCert", steps: 4, href: "/my/life-certificate", who: ["pensioner"], related: ["lifeCertificate"] },
      { id: "pensionerSlip", steps: 2, href: "/my/pension-slips", who: ["pensioner"] },
    ],
  },
  {
    id: "trouble",
    icon: "lifebuoy",
    questions: [
      { id: "otpNotReceived", steps: 4, tip: true, who: ["everyone"], related: ["smsGateway"] },
      { id: "lockedOut", steps: 3, who: ["everyone"], related: ["resetPassword"] },
      { id: "noAccess", steps: 3, who: ["everyone"], related: ["assignPermission"] },
      { id: "ownEntry", steps: 0, who: ["everyone"], related: ["whoApproves"] },
      { id: "payrollBlocked", steps: 3, href: "/attendance?tab=lock", who: ["accounts"], related: ["lockAttendance"] },
      { id: "wrongSalary", steps: 4, href: "/payroll", who: ["accounts", "employee"], related: ["reopenBill", "payItems"] },
      { id: "duplicateId", steps: 2, who: ["hr"], related: ["firstEmployee"] },
      { id: "wrongDa", steps: 3, href: "/admin/rates?tab=rates", who: ["accounts"], related: ["setDa", "arrears"] },
    ],
  },
];

/** The first-day path: what a new organisation does, in order, to pay its first salaries. */
export const FIRST_DAY_PATH = [
  "orgProfile",
  "statutoryDetails",
  "simpleOrTwoStep",
  "createSection",
  "createPost",
  "workingDays",
  "holidays",
  "createUser",
  "setDa",
  "firstEmployee",
  "salaryBank",
  "lockAttendance",
  "firstPayroll",
] as const;

export const HELP_QUESTIONS: (HelpQuestion & { cat: string })[] = HELP_CATEGORIES.flatMap((c) => c.questions.map((q) => ({ ...q, cat: c.id })));
