import base from "../shared/eslint.base.mjs";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { defineConfig } from "eslint/config";


export default defineConfig([
  ...base,
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], languageOptions: { globals: globals.browser } },
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  jsxA11y.flatConfigs.recommended,
  {
    settings: {
      react: {
        version: "detect",
      },
    }
  },
  {
    rules: {
      "react/react-in-jsx-scope": "off",
    }
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/vite.config.ts"
    ]
  },
]);
