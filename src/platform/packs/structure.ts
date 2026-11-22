/**
 * Sections and posts a new organisation starts with, by kind. Every one can be renamed, switched off or added to.
 * Posts carry 7th CPC pay levels and groups; the Medical Officer retires at 62.
 */
import type { Prisma } from "@/generated/prisma/client";
import type { PackInstaller, TenantKind } from "./types";

type S = [code: string, name: string, nameHi: string];
type P = [code: string, name: string, nameHi: string, level: string, group: string, retirementAge?: number];

const LOCAL_BODY_SECTIONS: S[] = [
  ["ADM", "Administration", "प्रशासन"],
  ["ACC", "Accounts", "लेखा"],
  ["REV", "Revenue and Tax", "राजस्व एवं कर"],
  ["HLT", "Health and Sanitation", "स्वास्थ्य एवं स्वच्छता"],
  ["ENG", "Engineering", "अभियांत्रिकी"],
  ["WTR", "Water Supply", "जल आपूर्ति"],
  ["ELE", "Electrical", "विद्युत"],
  ["EDU", "Education", "शिक्षा"],
  ["HSP", "General Hospital", "सामान्य अस्पताल"],
  ["EST", "Estate and Land", "संपदा एवं भूमि"],
  ["HRT", "Horticulture", "उद्यान"],
  ["ITC", "IT Cell", "आईटी सेल"],
];

const OFFICE_SECTIONS: S[] = [
  ["ADM", "Administration", "प्रशासन"],
  ["ACC", "Accounts", "लेखा"],
  ["HRD", "Human Resources", "मानव संसाधन"],
  ["OPS", "Operations", "संचालन"],
  ["ITC", "IT Cell", "आईटी सेल"],
];

const GOVT_POSTS: P[] = [
  ["CEO", "Chief Executive Officer", "मुख्य कार्यपालक अधिकारी", "12", "A"],
  ["AO", "Administrative Officer", "प्रशासनिक अधिकारी", "10", "A"],
  ["MO", "Medical Officer", "चिकित्सा अधिकारी", "10", "A", 62],
  ["AE", "Assistant Engineer", "सहायक अभियंता", "10", "A"],
  ["OS", "Office Superintendent", "कार्यालय अधीक्षक", "7", "B"],
  ["ACCT", "Accountant", "लेखाकार", "6", "B"],
  ["JE", "Junior Engineer", "कनिष्ठ अभियंता", "6", "B"],
  ["SI", "Sanitary Inspector", "स्वच्छता निरीक्षक", "6", "B"],
  ["SN", "Staff Nurse", "स्टाफ़ नर्स", "7", "B"],
  ["PRT", "Primary Teacher", "प्राथमिक शिक्षक", "6", "B"],
  ["HC", "Head Clerk", "प्रधान लिपिक", "5", "C"],
  ["UDC", "Upper Division Clerk", "उच्च श्रेणी लिपिक", "4", "C"],
  ["LDC", "Lower Division Clerk", "निम्न श्रेणी लिपिक", "2", "C"],
  ["DRV", "Driver", "चालक", "2", "C"],
  ["ELC", "Electrician", "विद्युतकार", "2", "C"],
  ["PMP", "Pump Operator", "पंप ऑपरेटर", "2", "C"],
  ["MTS", "Multi Tasking Staff", "मल्टी टास्किंग स्टाफ़", "1", "C"],
  ["SK", "Safai Karamchari", "सफ़ाई कर्मचारी", "1", "C"],
  ["MALI", "Mali", "माली", "1", "C"],
];

export function sectionsFor(kind: TenantKind): S[] {
  return kind === "CANTONMENT_BOARD" || kind === "MUNICIPAL" ? LOCAL_BODY_SECTIONS : OFFICE_SECTIONS;
}

export const structureInstaller: PackInstaller = {
  key: "structure",
  async install(tx, ctx) {
    await tx.section.createMany({
      data: sectionsFor(ctx.kind).map(([code, name, nameHi]) => ({ code, name, nameHi })) as Prisma.SectionCreateManyInput[],
    });
    await tx.post.createMany({
      data: GOVT_POSTS.map(([code, name, nameHi, payLevel, group, retirementAge = 60]) => ({ code, name, nameHi, payLevel, group, retirementAge })) as Prisma.PostCreateManyInput[],
    });
  },
};
