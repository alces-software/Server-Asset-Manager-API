// @ts-check

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintPrettier from 'eslint-config-prettier';

export default defineConfig({
   files: ['src/**/*.{js,ts}'],
   extends: [js.configs.recommended, tseslint.configs.recommended, eslintPrettier]
});
