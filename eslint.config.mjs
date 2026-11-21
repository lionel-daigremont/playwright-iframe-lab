// ESLint configuration: TypeScript rules + the official Playwright plugin.
// Goal: catch missing awaits and assertions that never run, before the first test run.
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  { ignores: ['node_modules/', 'playwright-report*/', 'test-results/', 'td/site/', 'eslint.config.mjs'] },

  // All TypeScript files: type-aware rules (they need the tsconfig)
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',   // a Promise that nobody awaits
      '@typescript-eslint/await-thenable': 'error',         // await on something that is not a Promise
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // warning only: TODO stubs
    },
  },

  // Test files: the Playwright rules
  {
    files: ['tests/**/*.ts', 'tests-td/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/missing-playwright-await': 'error',  // action or web-first assertion without await
      'playwright/valid-expect': 'error',              // expect() without a matcher call
      'playwright/no-wait-for-timeout': 'error',       // no fixed sleeps
      'playwright/no-wait-for-selector': 'error',      // no explicit waitForSelector
      'playwright/no-force-option': 'error',           // no { force: true } to bypass checks
      'playwright/prefer-web-first-assertions': 'error', // expect(await x.innerText()) -> expect(x).toHaveText()
    },
  },
);
