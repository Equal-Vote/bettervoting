import base from "../shared/eslint.base.mjs";
import globals from "globals";
import security from "eslint-plugin-security";
import jest from "eslint-plugin-jest";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...base,
  { languageOptions: { globals: globals.node } },
  security.configs.recommended,
  {
    files: ["**/*.test.{js,ts}"],
    ...jest.configs["flat/recommended"],
  },
  { ignores: ["**/node_modules/**", "build/**"] },
]);
