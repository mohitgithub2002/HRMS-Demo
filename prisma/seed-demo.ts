/**
 * Two fictional organisations for development, training copies and the browser checks. Names, people and numbers
 * are made up. The same login IDs exist in both, on purpose: they are different people in different organisations.
 */
import type { ProvisionInput } from "@/platform/provision";

export const DEMO_PASSWORD = "Kosh@2026";

type DemoUser = { loginId: string; name: string; loginType: "ADMIN" | "HR_ACCOUNTS" | "EMPLOYEE"; permissions: ("APPROVER" | "PAY_BILL_SIGNER" | "USER_SETTINGS_MANAGER" | "HR" | "PAYROLL" | "PENSION" | "CHECKER" | "REPORTING_OFFICER")[]; mobile: string };

export const DEMO_TENANTS: { code: string; org: Omit<ProvisionInput, "code">; users: DemoUser[] }[] = [
  {
    code: "DEMO",
    org: {
      name: "Demo Cantonment Board",
      nameHi: "डेमो छावनी परिषद",
      shortName: "Demo Cantt",
      kind: "CANTONMENT_BOARD",
      city: "New Delhi",
      state: "Delhi",
      status: "ACTIVE",
      pack: "GOI_7CPC",
      modules: ["recruitment", "attendance", "leave", "payroll", "loans", "statutory", "pension", "reports", "ask"],
      admin: { name: "Anita Sharma", loginId: "ADMIN", mobile: "9810000001" },
    },
    users: [
      { loginId: "HR01", name: "Priya Singh", loginType: "HR_ACCOUNTS", permissions: ["HR"], mobile: "9810000003" },
      { loginId: "ACC01", name: "Mohit Gupta", loginType: "HR_ACCOUNTS", permissions: ["PAYROLL", "PENSION"], mobile: "9810000004" },
      { loginId: "CHK01", name: "Deepak Yadav", loginType: "HR_ACCOUNTS", permissions: ["CHECKER"], mobile: "9810000006" },
      { loginId: "IT01", name: "Rahul Mehta", loginType: "ADMIN", permissions: ["USER_SETTINGS_MANAGER"], mobile: "9810000007" },
    ],
  },
  {
    code: "SMC",
    org: {
      name: "Shivalik Municipal Council",
      nameHi: "शिवालिक नगर परिषद",
      shortName: "Shivalik MC",
      kind: "MUNICIPAL",
      city: "Solan",
      state: "Himachal Pradesh",
      status: "TRIAL",
      pack: "GOI_7CPC",
      modules: ["attendance", "leave", "payroll", "reports"],
      admin: { name: "Vikram Thakur", loginId: "ADMIN", mobile: "9820000001" },
    },
    users: [{ loginId: "HR01", name: "Neha Verma", loginType: "HR_ACCOUNTS", permissions: ["HR", "PAYROLL"], mobile: "9820000003" }],
  },
];
