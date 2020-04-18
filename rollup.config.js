const { terser } = require("rollup-plugin-terser");
const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const globals = require("rollup-plugin-node-globals");
const typescript = require("rollup-plugin-typescript2");

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "docs/_lib/index.umd.js",
        format: "umd",
        name: "EdgeRouter",
        esModule: false,
      },
    ],
    plugins: [
      typescript({
        tsconfig: "tsconfig.json",
        tsconfigOverride: { compilerOptions: { declaration: false } },
      }),
      commonjs(),
      resolve({ preferBuiltins: true, module: false, browser: true }),
      globals(),
      terser({ output: { comments: false } }),
    ],
  },
];
