/**
 * playwright.config.ts
 * --------------------
 *
 * The browser tests: the fixture site in `test/e2e/fixture` built, served
 * by `test/e2e/serve.mjs`, then driven in Chromium, Firefox and WebKit at desktop
 * width, and in Chromium and WebKit at phone size for the drawer. Each spec
 * says which it needs with its file name — `*.desktop.spec.ts` or
 * `*.mobile.spec.ts`.
 *
 *   npm run test:e2e
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4399;

export default defineConfig({
	testDir: 'test/e2e',
	fullyParallel: true,
	reporter: [['list']],
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
	},
	webServer: {
		command: `npx astro build --root test/e2e/fixture && node test/e2e/serve.mjs ${PORT}`,
		url: `http://127.0.0.1:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
	projects: [
		{ name: 'chromium', testMatch: /\.desktop\.spec\.ts$/, use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', testMatch: /\.desktop\.spec\.ts$/, use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', testMatch: /\.desktop\.spec\.ts$/, use: { ...devices['Desktop Safari'] } },
		{ name: 'mobile-chromium', testMatch: /\.mobile\.spec\.ts$/, use: { ...devices['Pixel 7'] } },
		{ name: 'mobile-webkit', testMatch: /\.mobile\.spec\.ts$/, use: { ...devices['iPhone 15'] } },
	],
});
