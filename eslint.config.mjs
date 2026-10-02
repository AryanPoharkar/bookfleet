import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    files: ["src/app/**", "src/features/**"],
    ignores: ["src/features/auth/**"],
    rules: {
      "no-restricted-imports": ["error", { "paths": [{ "name": "@/server/db", "message": "Use requireTenant().db" }], "patterns": [{ "group": ["**/server/db"], "message": "Use requireTenant().db" }] }],
      "no-restricted-syntax": ["error", { "selector": "MemberExpression[property.name=/^(\$queryRaw|\$queryRawUnsafe|\$executeRaw|\$executeRawUnsafe)$/]", "message": "Use requireTenant().db" }],
    },
  },
]);

export default eslintConfig;
