import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
  // ── Ignore generated / build output ──────────────────────────────────────
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "**/.turbo/**",
    ],
  },

  // ── TypeScript rules for all packages ─────────────────────────────────────
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // `any` is sometimes unavoidable in generic adapters and type gymnastics
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused locals/params — underscore prefix opts out
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Non-null assertions are used deliberately in a few places
      "@typescript-eslint/no-non-null-assertion": "warn",
      // Allow empty catch blocks (used in FileTransport.loadAll)
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  // ── React rules for devtools app and ui package ───────────────────────────
  {
    files: [
      "apps/devtools/src/**/*.{ts,tsx}",
      "packages/ui/src/**/*.{ts,tsx}",
    ],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: { version: "19" },
    },
    rules: {
      // Core React rules
      "react/jsx-key": "error",
      "react/no-unknown-property": "error",
      "react/no-direct-mutation-state": "error",
      // No need to import React in scope with the new JSX transform
      "react/react-in-jsx-scope": "off",
      // TypeScript already validates prop types
      "react/prop-types": "off",
      // Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
