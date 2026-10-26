/**
 * The components' markup, rendered through Astro's container: the ARIA each
 * one has to carry, the data attributes the runtime reads, and how `items`
 * turn into links, dropdowns, columns and drawer groups.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import MenuBarRaw from '../src/MenuBar.astro';
import MenuDropdownRaw from '../src/MenuDropdown.astro';
import MenuDrawerRaw from '../src/MenuDrawer.astro';
import MenuButtonRaw from '../src/MenuButton.astro';
import MenuGroupRaw from '../src/MenuGroup.astro';
import type { MenuItem } from '../src/types';

type Component = Parameters<AstroContainer['renderToString']>[0];
const MenuBar = MenuBarRaw as Component;
const MenuDropdown = MenuDropdownRaw as Component;
const MenuDrawer = MenuDrawerRaw as Component;
const MenuButton = MenuButtonRaw as Component;
const MenuGroup = MenuGroupRaw as Component;

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

const render = (component: Component, props: Record<string, unknown> = {}, url = 'https://example.com/', slots?: Record<string, string>) =>
	container.renderToString(component, { props, request: new Request(url), slots });

const nav: MenuItem[] = [
	{ label: 'Home', href: '/' },
	{
		label: 'Plugins',
		href: '/plugins',
		items: [
			{ label: 'Forms', href: '/plugins/forms', description: 'Build any form' },
			{ label: 'Shop', href: '/plugins/shop' },
		],
	},
	{
		label: 'Products',
		size: 'wide',
		items: [
			{ label: 'Themes', items: [{ label: 'Halftone', href: '/themes/halftone' }] },
			{ label: 'Sale', href: '/sale' },
		],
	},
	{ label: 'GitHub', href: 'https://github.com/arraypress', external: true },
];

describe('<MenuBar>', () => {
	it('is a named nav landmark holding a list', async () => {
		const html = await render(MenuBar, { items: nav });
		expect(html).toMatch(/<nav[^>]*class="menu-bar[^"]*"[^>]*aria-label="Main"/);
		expect(html).toContain('<ul class="menu-bar__list"');
		expect((html.match(/<li class="menu-bar__item"/g) ?? []).length).toBe(4);
	});

	it('marks the current page, and a section above it as "true"', async () => {
		const home = await render(MenuBar, { items: nav }, 'https://example.com/');
		expect(home).toMatch(/href="\/"[^>]*aria-current="page"/);
		const post = await render(MenuBar, { items: nav }, 'https://example.com/plugins/forms/');
		expect(post).toMatch(/href="\/plugins"[^>]*aria-current="true"/);
		expect(post).toMatch(/href="\/plugins\/forms"[^>]*aria-current="page"/);
	});

	it('opens external links in a new tab, and says so to screen readers', async () => {
		const html = await render(MenuBar, { items: nav });
		expect(html).toMatch(/href="https:\/\/github.com\/arraypress"[^>]*target="_blank"[^>]*rel="noopener"/);
		expect(html).toContain('<span class="menu-sr"> (opens in a new tab)</span>');
	});

	it('passes extra attributes through to links', async () => {
		const html = await render(MenuBar, { items: [{ label: 'Blog', href: '/blog', attrs: { 'data-astro-prefetch': '' } }] });
		expect(html).toMatch(/<a data-astro-prefetch class="menu-bar__link" href="\/blog"/);
	});

	it('lines every panel up as told', async () => {
		const html = await render(MenuBar, { items: nav, align: 'center' });
		expect(html).toMatch(/data-menu-dropdown data-hover data-size="default" data-align="center"/);
	});

	it('turns items with children into dropdowns', async () => {
		const html = await render(MenuBar, { items: nav });
		expect((html.match(/data-menu-dropdown/g) ?? []).length).toBe(2);
	});
});

describe('<MenuDropdown>', () => {
	it('is a disclosure: a button with aria-expanded and aria-controls, no menu roles', async () => {
		const html = await render(MenuDropdown, { label: 'Resources', items: [{ label: 'Docs', href: '/docs' }] });
		expect(html).toMatch(/<button type="button" class="menu-dropdown__trigger" aria-expanded="false" aria-controls="menu-resources"/);
		expect(html).toContain('id="menu-resources" class="menu-dropdown__panel" data-menu-panel');
		expect(html).not.toMatch(/role="menu/);
		expect(html).not.toContain('aria-haspopup');
	});

	it('with an href, keeps the label a link and adds a named toggle beside it', async () => {
		const html = await render(MenuDropdown, { label: 'Plugins', href: '/plugins', items: nav[1].items });
		expect(html).toMatch(/<a class="menu-dropdown__link" href="\/plugins"/);
		expect(html).toMatch(/<button[^>]*class="menu-dropdown__toggle"[^>]*aria-label="Plugins pages"/);
	});

	it('hides its caret from screen readers', async () => {
		const html = await render(MenuDropdown, { label: 'Resources', items: [] });
		expect(html).toMatch(/<svg class="menu-caret"[^>]*aria-hidden="true"/);
	});

	it('opens on hover unless told not to', async () => {
		expect(await render(MenuDropdown, { label: 'A', items: [] })).toContain('data-hover');
		expect(await render(MenuDropdown, { label: 'A', items: [], hover: false })).not.toContain('data-hover');
	});

	it('lays a wide panel out as headed columns, each list named by its heading', async () => {
		const html = await render(MenuDropdown, { ...nav[2] });
		expect(html).toContain('data-size="wide"');
		expect(html).toContain('<p class="menu-dropdown__heading" id="menu-products-col-0">Themes</p>');
		expect(html).toContain('<ul class="menu-dropdown__list" aria-labelledby="menu-products-col-0">');
		// The loose link gets a column of its own, with no heading.
		expect(html).toMatch(/<div class="menu-dropdown__column"><ul class="menu-dropdown__list"><li><a class="menu-dropdown__item" href="\/sale"/);
	});

	it('draws an icon before the label, hidden from screen readers', async () => {
		const html = await render(MenuDropdown, { label: 'Plugins', items: [{ label: 'Forms', href: '/forms', icon: 'ti ti-forms' }] });
		expect(html).toMatch(/<a class="menu-dropdown__item" href="\/forms"><i class="menu-icon ti ti-forms" aria-hidden="true"><\/i><span class="menu-dropdown__label">Forms<\/span>/);
	});

	it('shows descriptions under the label, inside the link', async () => {
		const html = await render(MenuDropdown, { label: 'Plugins', items: nav[1].items });
		expect(html).toContain('<span class="menu-dropdown__desc">Build any form</span>');
	});

	it('marks a label-only trigger while you are on one of its pages', async () => {
		const html = await render(MenuDropdown, { ...nav[2] }, 'https://example.com/themes/halftone/');
		expect(html).toMatch(/class="menu-dropdown__trigger"[^>]*data-current/);
	});

	it('takes custom panel content from the default slot', async () => {
		const html = await render(MenuDropdown, { label: 'Mega', size: 'wide' }, undefined, { default: '<p>Anything</p>' });
		expect(html).toContain('<p>Anything</p>');
	});

	it('gives two dropdowns with one label on a page different ids', async () => {
		const page = new Request('https://example.com/');
		const a = await container.renderToString(MenuDropdown, { props: { label: 'Shop', items: [] }, request: page });
		const b = await container.renderToString(MenuDropdown, { props: { label: 'Shop', items: [] }, request: page });
		expect(a).toContain('id="menu-shop"');
		expect(b).toContain('id="menu-shop-2"');
	});
});

describe('<MenuButton>', () => {
	it('names itself, points at the drawer and starts collapsed', async () => {
		const html = await render(MenuButton, { controls: 'site-menu' });
		expect(html).toMatch(/<button type="button" class="menu-button"[^>]*aria-label="Open menu" aria-expanded="false" aria-controls="site-menu" data-menu-open="site-menu"/);
	});

	it('takes its name from strings', async () => {
		const html = await render(MenuButton, { strings: { open: 'Открыть меню' } });
		expect(html).toContain('aria-label="Открыть меню"');
	});
});

describe('<MenuDrawer>', () => {
	it('is a dialog named by its heading, with a named close button', async () => {
		const html = await render(MenuDrawer, { id: 'site-menu', items: nav });
		expect(html).toMatch(/<dialog id="site-menu" class="menu-drawer"[^>]*aria-labelledby="site-menu-title"[^>]*data-menu-drawer data-side="end"/);
		expect(html).toContain('<h2 class="menu-drawer__title" id="site-menu-title">Menu</h2>');
		expect(html).toMatch(/<button type="button" class="menu-drawer__close" aria-label="Close menu" data-menu-close/);
	});

	it('carries the closeAbove query for the runtime', async () => {
		const html = await render(MenuDrawer, { closeAbove: '(min-width: 768px)' });
		expect(html).toContain('data-close-above="(min-width: 768px)"');
	});

	it('turns dropdowns into groups, with the parent page first', async () => {
		const html = await render(MenuDrawer, { items: nav });
		expect(html).toMatch(/<details class="menu-group">\s*<summary class="menu-group__summary"><span>Plugins<\/span>/);
		expect(html).toMatch(/<ul class="menu-group__items">\s*<li><a class="menu-drawer__link" href="\/plugins">All Plugins<\/a>/);
	});

	it('opens the group holding the current page', async () => {
		const html = await render(MenuDrawer, { items: nav }, 'https://example.com/plugins/shop/');
		expect(html).toMatch(/<details class="menu-group" open>\s*<summary class="menu-group__summary"><span>Plugins/);
		expect(html).toMatch(/<details class="menu-group">\s*<summary class="menu-group__summary"><span>Products/);
	});

	it('keeps a mega column as a labelled list inside its group', async () => {
		const html = await render(MenuDrawer, { id: 'nav', items: nav });
		expect(html).toContain('<p class="menu-group__heading" id="nav-products-0">Themes</p>');
		expect(html).toContain('aria-labelledby="nav-products-0"');
	});

	it('renders the footer slot only when given', async () => {
		expect(await render(MenuDrawer, {})).not.toContain('menu-drawer__foot');
		const html = await render(MenuDrawer, {}, undefined, { footer: '<p>hi@example.com</p>' });
		expect(html).toContain('<div class="menu-drawer__foot">');
		expect(html).toContain('hi@example.com');
	});
});

describe('<MenuGroup>', () => {
	it('is a native details/summary, closed unless asked', async () => {
		expect(await render(MenuGroup, { label: 'Docs' })).toMatch(/<details class="menu-group">\s*<summary/);
		expect(await render(MenuGroup, { label: 'Docs', open: true })).toContain('<details class="menu-group" open>');
	});
});
