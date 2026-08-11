// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginVue from "eslint-plugin-vue";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/build/**", "**/node_modules/**", "**/coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginVue.configs["flat/recommended"],
  {
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Les props optionnelles sont déjà documentées par `?` côté TypeScript.
      "vue/require-default-prop": "off",
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ["src/pages/**/*.vue", "src/App.vue"],
    rules: {
      // Les pages/routes en un seul mot (Home, Play, Options...) sont l'usage courant avec vue-router.
      "vue/multi-word-component-names": "off",
    },
  },
  eslintConfigPrettier,
);
