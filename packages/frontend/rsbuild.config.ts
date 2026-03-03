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
});
