import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Isolation wall (docs/ARCHITECTURE.md): business modules and the organisation app never hold the raw database client
// or the cross-tenant door. Only src/core, src/platform, the console's routes, the seed and tests may.
const tenantWall = {
  files: ["src/modules/**/*.{ts,tsx}", "src/app/(app)/**/*.{ts,tsx}", "src/app/(auth)/**/*.{ts,tsx}", "src/app/api/v1/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          { name: "@/core/tenancy/raw", message: "Use actor.db / tenantDb(tenantId): every query must run as one organisation." },
          { name: "@/core/tenancy/platform", message: "Cross-organisation access belongs to src/platform only." },
        ],
        patterns: [{ group: ["@/platform/*"], message: "The organisation app does not call platform services." }],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  tenantWall,
  { rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }] } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
