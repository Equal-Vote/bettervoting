import path from 'node:path';
import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginYaml } from "@rsbuild/plugin-yaml";
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";


const { publicVars, rawPublicVars } = loadEnv({ prefixes: ['REACT_APP_'] });
const sharedDir = path.resolve(__dirname, '../../node_modules/@equal-vote/star-vote-shared');


export default defineConfig({
  source: {
  },
});
export default defineConfig({
  plugins: [pluginNodePolyfill(), pluginReact(), pluginYaml()],
  html: {
    template: './index.html',
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
      // Typst ballot templates, a git submodule (run `git submodule update --init --recursive`).
      "@bettervoting-typst": path.resolve(__dirname, "../shared/bettervoting-typst"),
    },
  },
  server: {
    port: rawPublicVars.REACT_APP_FRONTEND_PORT ?? 3000,
    proxy: {
      "/API": {
        target: `${rawPublicVars.REACT_APP_BACKEND_URL ?? "http://localhost:5000"}`,
        changeOrigin: true,
      },
    },
  },
  source: {
    define: {
      ...publicVars,
      'process.env': JSON.stringify(rawPublicVars),
    },
    entry: {
      index: './src/index.tsx',
    },
    include: [
      // Compile all files in monorepo's package directory
      // It is recommended to exclude the node_modules
      {
        and: [sharedDir],
      },
    ],
  },
  output: {
    distPath: {
      root: 'build',
    },
  },
  tools: {
    rspack: (_config, { appendRules }) => {
      // `?url` imports of files Rsbuild doesn't already treat as assets: the Typst
      // templates and their WebAssembly (see components/PaperBallots/renderBallotsPdf.ts).
      // Emit them as plain files so they're only fetched when ballots are printed.
      appendRules({ test: /\.(typ|toml|wasm)$/, resourceQuery: /url/, type: 'asset/resource' });
    },
  },
});
