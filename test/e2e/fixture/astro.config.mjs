/**
 * The site the browser tests run against: every component on a real page,
 * built and served by `astro preview` from playwright.config.ts.
 */
import { defineConfig } from 'astro/config';

export default defineConfig({
	site: 'https://example.com',
	devToolbar: { enabled: false },
});
