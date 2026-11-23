import { readFileSync, writeFileSync } from "node:fs";
import { en } from "./src/lib/i18n/en";
import { hi } from "./src/lib/i18n/hi";
// Adds keys the original has and Kosh lacks to `export const <area> = {` in Kosh's errors.ts files.
const [file, area] = process.argv.slice(2);
for (const [lang, dict] of [["en", en], ["hi", hi]] as const) {
  const path = `/home/user/HRMS-Demo/src/i18n/${lang}/${file}.ts`;
  let s = readFileSync(path, "utf8");
  const start = s.indexOf(`export const ${area} = {`);
  const end = s.indexOf("\n};", start);
  const body = s.slice(start, end);
  const add = Object.entries((dict as Record<string, Record<string, string>>)[area])
    .filter(([k, v]) => typeof v === "string" && !new RegExp(`\\n  ${k}:`).test(body))
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v.replace(/the Board/g, "the organisation").replace(/परिषद/g, "संगठन"))},`);
  s = s.slice(0, end) + (add.length ? "\n" + add.join("\n") : "") + s.slice(end);
  writeFileSync(path, s);
  console.log(lang, area, "+", add.length);
}
