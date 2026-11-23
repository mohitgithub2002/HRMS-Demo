// One-off helper (not committed): writes areas of the original dictionaries as TS files for Kosh.
import { writeFileSync } from "node:fs";
import { en } from "./src/lib/i18n/en";
import { hi } from "./src/lib/i18n/hi";

const [outDir, ...areas] = process.argv.slice(2);
const ident = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function fixEn(s: string) {
  return s
    .replace(/the Board's/g, "the organisation's").replace(/The Board's/g, "The organisation's")
    .replace(/\bthe Board\b/g, "the organisation").replace(/\bThe Board\b/g, "The organisation")
    .replace(/\ba Board\b/g, "an organisation").replace(/\bBoard's\b/g, "organisation's").replace(/\bBoard\b/g, "organisation")
    .replace(/the FoxPro/g, "the old system").replace(/FoxPro/g, "the old system").replace(/\bDCB\b/g, "the organisation");
}
function fixHi(s: string) {
  return s.replace(/परिषद/g, "संगठन").replace(/फ़ॉक्सप्रो|फॉक्सप्रो/g, "पुरानी प्रणाली").replace(/FoxPro/g, "पुरानी प्रणाली");
}
function ser(v: unknown, fix: (s: string) => string, ind = "  "): string {
  if (typeof v === "string") return JSON.stringify(fix(v));
  const o = v as Record<string, unknown>;
  const lines = Object.entries(o).map(([k, x]) => `${ind}${ident.test(k) ? k : JSON.stringify(k)}: ${ser(x, fix, ind + "  ")},`);
  return `{\n${lines.join("\n")}\n${ind.slice(2)}}`;
}
for (const area of areas) {
  for (const [lang, dict, fix] of [["en", en, fixEn], ["hi", hi, fixHi]] as const) {
    const v = (dict as Record<string, unknown>)[area];
    writeFileSync(`${outDir}/${lang}/${area}.ts`, `export const ${area} = ${ser(v, fix)};\n`);
  }
}
console.log("wrote", areas.join(", "));
