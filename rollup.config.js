import { defineConfig } from "rollup";

import typescript from "@rollup/plugin-typescript";
import clear from "rollup-plugin-clear";
import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default defineConfig({
  input: "src/index.ts",
  output: [
    {
      dir: "./dist/cjs",
      format: "cjs",
      sourcemap: "inline",
    },

    {
      dir: "./dist/esm",
      sourcemap: "inline",
    },
    {
      file: "./dist/index.min.js",
      format: "umd",
      name: "hd-request", // UMD全局变量名
      plugins: [terser()],
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      outDir: undefined,
      declaration: false,
      declarationMap: false,
      declarationDir: undefined,
    }),
    // terser(),
    clear({
      targets: ["dist"],
      watch: true,
    }),
    resolve(),
    commonjs(),
  ],
});
