import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

// Baseline rules shared by every package in the monorepo. No environment-specific
// globals or framework plugins belong here — each package's own eslint.config
// layers those on top (browser + React + a11y for frontend, Node + security + jest for backend).
export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], plugins: { js }, extends: ["js/recommended"] },
  tseslint.configs.recommended,
  {
    rules: {
      // A leading underscore is this codebase's existing convention for "intentionally
      // unused" (destructured-discard fields, params kept only for interface/signature
      // conformance) — recognize it instead of flagging those as errors.
      "@typescript-eslint/no-unused-vars": ["error", {
        args: "after-used",
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
  { ignores: ["**/node_modules/**"] },
]);
