/** @type {import("@ianvs/prettier-plugin-sort-imports").PluginConfig} */
const importConfig = {
  // prettier-ignore
  importOrder: [
    "", "^react$",
    "", "<BUILTIN_MODULES>",
    "", "<THIRD_PARTY_MODULES>",
    "", "^@/(?!components|ui|lib).*$",
    "", "^@/lib/.*$",
    "", "^@/components/.*$",
    "", "^@/ui/.*$",
    "", "^(?!.*[.]css$)[./].*$",
    "", ".css$",
  ],
  importOrderTypeScriptVersion: "5.0.0",
}

/** @type {import("prettier-plugin-tailwindcss").PluginOptions} */
const tailwindConfig = {
  tailwindFunctions: ["cva", "clsx", "cn"],
  tailwindStylesheet: "./src/app/globals.css",
}

/** @type {import("prettier").Config} */
const config = {
  ...importConfig,
  ...tailwindConfig,

  semi: false,
  jsonRecursiveSort: true,

  plugins: [
    "prettier-plugin-sort-json",
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
}

export default config
