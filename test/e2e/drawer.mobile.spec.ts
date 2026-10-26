/**
 * The drawer in real browsers at phone size — Chromium and WebKit, the
 * engines behind Android and iOS browsers: what `showModal()` gives (focus
 * in and kept in, the page behind unreachable, Escape), what the runtime
 * adds (the backdrop, links, the scroll lock, focus back to the button,
 * `closeAbove`), the groups, and axe with it open.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const hamburger = (page: Page) => page.getByRole('button', { name: 'Open menu' });
const drawer = (page: Page) => page.locator('#site-menu');

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.menu-bar')).toBeHidden();
});

test('opens from the button as a named dialog, with focus inside', async ({ page }) => {
	await hamburger(page).click();
	await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
	await expect(hamburger(page)).toHaveAttribute('aria-expanded', 'true');
	expect(await drawer(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
});

test('keeps keyboard focus inside', async ({ page }) => {
	await hamburger(page).click();
	for (let i = 0; i < 25; i++) {
		await page.keyboard.press('Tab');
		const escaped = await page.evaluate(() => {
			const active = document.activeElement;
			return !!active && active !== document.body && !document.getElementById('site-menu')!.contains(active);
		});
		expect(escaped).toBe(false);
	}
});

test('makes the page behind unreachable', async ({ page }) => {
	await hamburger(page).click();
	const behind = await page.locator('#behind').boundingBox();
	const hit = await page.evaluate(
		([x, y]) => document.elementFromPoint(x, y)?.closest('#site-menu, #behind')?.id ?? null,
		[behind!.x + 5, behind!.y + 5]
	);
	expect(hit).toBe('site-menu');
});

test('Escape closes it and focus goes back to the button', async ({ page }) => {
	await hamburger(page).click();
	await page.keyboard.press('Escape');
	await expect(drawer(page)).toBeHidden();
	await expect(hamburger(page)).toHaveAttribute('aria-expanded', 'false');
	await expect(hamburger(page)).toBeFocused();
});

test('the close button closes it', async ({ page }) => {
	await hamburger(page).click();
	await page.getByRole('button', { name: 'Close menu' }).click();
	await expect(drawer(page)).toBeHidden();
});

test('a tap on the backdrop closes it', async ({ page }) => {
	await hamburger(page).click();
	await expect(drawer(page)).toBeVisible();
	await page.mouse.click(10, 300);
	await expect(drawer(page)).toBeHidden();
});

test('a link to a section closes it and goes there', async ({ page }) => {
	await hamburger(page).click();
	await drawer(page).getByText('Resources').click();
	await drawer(page).getByRole('link', { name: 'Pricing' }).click();
	await expect(drawer(page)).toBeHidden();
	await expect(page.locator('#pricing')).toBeInViewport();
});

test("the page doesn't scroll behind it", async ({ page }) => {
	await hamburger(page).click();
	await expect(drawer(page)).toBeVisible();
	expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
	await hamburger(page).evaluate(() => window.scrollTo(0, 400)).catch(() => {});
	await page.keyboard.press('Escape');
	expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
});

test('dropdowns are groups, the parent page first', async ({ page }) => {
	await hamburger(page).click();
	const group = drawer(page).locator('details', { hasText: 'Plugins' }).first();
	await group.locator('summary').click();
	await expect(group.getByRole('link', { name: 'Plugins', exact: true })).toBeVisible();
	await expect(group.getByRole('link', { name: /Forms/ })).toBeVisible();
});

test('the group holding the current page starts open', async ({ page }) => {
	await page.goto('/plugins/forms/');
	await hamburger(page).click();
	const group = drawer(page).locator('details', { hasText: 'Plugins' }).first();
	await expect(group).toHaveAttribute('open', '');
	await expect(group.getByRole('link', { name: /Forms/ })).toHaveAttribute('aria-current', 'page');
});

test('closes when the window widens past closeAbove', async ({ page }) => {
	await hamburger(page).click();
	await expect(drawer(page)).toBeVisible();
	await page.setViewportSize({ width: 1024, height: 800 });
	await expect(drawer(page)).toBeHidden();
});

test('no axe violations with it open', async ({ page }) => {
	await hamburger(page).click();
	await expect(drawer(page)).toBeVisible();
	const results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);
});
