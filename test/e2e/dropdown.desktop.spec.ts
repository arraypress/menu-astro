/**
 * Dropdowns and the mega panel in real browsers — Chromium, Firefox and
 * WebKit at desktop width: the keyboard paths of the disclosure pattern,
 * hover with a real mouse, the split link-and-toggle, the wide panel's
 * width, axe in each state, and the bar still working after an Astro view
 * transition swaps the header.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const toggle = (page: Page, label: string) =>
	page.locator('.menu-bar [data-menu-dropdown]', { hasText: label }).locator('[data-menu-toggle]').first();
const panel = (page: Page, label: string) =>
	page.locator('.menu-bar [data-menu-dropdown]', { hasText: label }).locator('[data-menu-panel]').first();

/**
 * Tab to the next link. Safari's Tab visits only form controls unless the
 * user changes a setting; Option-Tab is how its keyboard users reach links,
 * and WebKit here behaves the same.
 */
const tab = (page: Page, browserName: string) => page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');

/** Wait for a panel's fade-in to finish, so nothing is measured half-drawn. */
const settled = (page: Page, label: string) =>
	expect.poll(() => panel(page, label).evaluate((el) => getComputedStyle(el).opacity)).toBe('1');

test.beforeEach(async ({ page }) => {
	await page.goto('/');
});

test.describe('keyboard', () => {
	test('Enter opens, Tab walks the links, Escape closes back to the toggle', async ({ page, browserName }) => {
		await toggle(page, 'Resources').focus();
		await page.keyboard.press('Enter');
		await expect(toggle(page, 'Resources')).toHaveAttribute('aria-expanded', 'true');
		await expect(panel(page, 'Resources')).toBeVisible();

		await tab(page, browserName);
		await expect(panel(page, 'Resources').getByRole('link', { name: 'Docs' })).toBeFocused();

		await page.keyboard.press('Escape');
		await expect(toggle(page, 'Resources')).toHaveAttribute('aria-expanded', 'false');
		await expect(panel(page, 'Resources')).toBeHidden();
		await expect(toggle(page, 'Resources')).toBeFocused();
	});

	test('Space toggles it open and shut', async ({ page }) => {
		await toggle(page, 'Resources').focus();
		await page.keyboard.press(' ');
		await expect(toggle(page, 'Resources')).toHaveAttribute('aria-expanded', 'true');
		await page.keyboard.press(' ');
		await expect(toggle(page, 'Resources')).toHaveAttribute('aria-expanded', 'false');
	});

	test('tabbing past the last link closes it', async ({ page, browserName }) => {
		await toggle(page, 'Resources').focus();
		await page.keyboard.press('Enter');
		await tab(page, browserName);
		await tab(page, browserName);
		await expect(panel(page, 'Resources').getByRole('link', { name: 'Pricing' })).toBeFocused();
		await tab(page, browserName);
		await expect(toggle(page, 'Resources')).toHaveAttribute('aria-expanded', 'false');
	});

	test("a closed panel's links are out of the tab order and the accessibility tree", async ({ page, browserName }) => {
		await toggle(page, 'Resources').focus();
		await tab(page, browserName);
		expect(await page.evaluate(() => !!document.activeElement?.closest('[data-menu-panel]'))).toBe(false);
		await expect(panel(page, 'Resources').getByRole('link')).toHaveCount(0);
	});
});

test.describe('pointer', () => {
	test('a mouse resting on it opens it, and leaving closes it', async ({ page }) => {
		await toggle(page, 'Resources').hover();
		await expect(toggle(page, 'Resources')).toHaveAttribute('aria-expanded', 'true');
		await page.mouse.move(5, 600);
		await expect(toggle(page, 'Resources')).toHaveAttribute('aria-expanded', 'false');
	});

	test('it stays open on the way from the toggle into the panel', async ({ page }) => {
		await toggle(page, 'Resources').hover();
		await expect(panel(page, 'Resources')).toBeVisible();
		await panel(page, 'Resources').getByRole('link', { name: 'Pricing' }).hover();
		await page.waitForTimeout(400);
		await expect(panel(page, 'Resources')).toBeVisible();
	});

	test('a click pins it open after the mouse leaves; a click outside closes it', async ({ page }) => {
		await toggle(page, 'Resources').click();
		await page.mouse.move(5, 600);
		await page.waitForTimeout(400);
		await expect(panel(page, 'Resources')).toBeVisible();
		await page.locator('h1').click();
		await expect(panel(page, 'Resources')).toBeHidden();
	});

	test('one open at a time', async ({ page }) => {
		await toggle(page, 'Resources').click();
		await toggle(page, 'Plugins').click();
		await expect(toggle(page, 'Resources')).toHaveAttribute('aria-expanded', 'false');
		await expect(toggle(page, 'Plugins')).toHaveAttribute('aria-expanded', 'true');
	});
});

test.describe('a parent that is also a page', () => {
	test('the label navigates, and the toggle beside it opens the panel', async ({ page }) => {
		await toggle(page, 'Plugins').click();
		await expect(panel(page, 'Plugins')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Plugins pages' })).toHaveAttribute('aria-expanded', 'true');
		await page.locator('.menu-bar').getByRole('link', { name: 'Plugins', exact: true }).click();
		await expect(page).toHaveURL(/\/plugins\/$/);
	});
});

test.describe('mega panel', () => {
	test('spans the header, and names each column list by its heading', async ({ page }) => {
		await toggle(page, 'Products').click();
		const header = await page.locator('.site-header').boundingBox();
		const box = await panel(page, 'Products').boundingBox();
		expect(Math.abs(box!.width - header!.width)).toBeLessThan(2);
		await expect(panel(page, 'Products').getByRole('list', { name: 'Themes' })).toBeVisible();
	});
});

test.describe('axe', () => {
	test('no violations with the menus closed', async ({ page }) => {
		const results = await new AxeBuilder({ page }).include('.site-header').analyze();
		expect(results.violations).toEqual([]);
	});

	test('no violations with a dropdown and the mega panel open', async ({ page }) => {
		await toggle(page, 'Plugins').click();
		await settled(page, 'Plugins');
		let results = await new AxeBuilder({ page }).include('.site-header').analyze();
		expect(results.violations).toEqual([]);
		await toggle(page, 'Products').click();
		await settled(page, 'Products');
		results = await new AxeBuilder({ page }).include('.site-header').analyze();
		expect(results.violations).toEqual([]);
	});
});

test.describe('view transitions', () => {
	test('the swapped-in header works, once per click', async ({ page }) => {
		await page.locator('#to-forms').click();
		await expect(page).toHaveURL(/\/plugins\/forms\/$/);
		await page.locator('#to-home').click();
		await expect(page).toHaveURL(/\/$/);
		await page.locator('#to-forms').click();
		await expect(page.locator('h1')).toHaveText('Forms');

		// Listeners stacked up per navigation would toggle twice and cancel out.
		await toggle(page, 'Resources').click();
		await expect(toggle(page, 'Resources')).toHaveAttribute('aria-expanded', 'true');
		await toggle(page, 'Resources').click();
		await expect(toggle(page, 'Resources')).toHaveAttribute('aria-expanded', 'false');
	});

	test('the current page is marked after navigating', async ({ page }) => {
		await page.locator('#to-forms').click();
		await expect(page.locator('h1')).toHaveText('Forms');
		await expect(page.locator('.menu-bar').getByRole('link', { name: 'Plugins', exact: true })).toHaveAttribute('aria-current', 'true');
		await toggle(page, 'Plugins').click();
		await expect(panel(page, 'Plugins').getByRole('link', { name: /Forms/ })).toHaveAttribute('aria-current', 'page');
	});
});
