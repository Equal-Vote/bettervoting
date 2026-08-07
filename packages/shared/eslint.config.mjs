import base from "./eslint.base.mjs";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...base,
  { ignores: ["**/node_modules/**", "dist/**"] },
]);
