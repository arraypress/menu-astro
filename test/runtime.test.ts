/**
 * The runtime, run in a real DOM.
 *
 * `components.test.ts` checks the rendered markup; these tests render the
 * components the same way, put the HTML in jsdom and install the runtime on
 * that document, then drive it the way a user would — clicks, keys, the
 * mouse moving on and off, focus moving away.
 *
 * jsdom has no `showModal()` or `close()`, so the drawer tests give it the
 * smallest stand-in that keeps the contract — `open`, and a `close` event
 * that doesn't bubble — and check the runtime's half: opening, the ways it
 * closes, `aria-expanded`, the scroll padding and focus going back. What the
 * browser itself does with a modal dialog (trapping focus, the inert page,
 * Escape) is the browser's, and is checked in real browsers in `e2e/`.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import MenuBarRaw from '../src/MenuBar.astro';
import MenuDrawerRaw from '../src/MenuDrawer.astro';
import MenuButtonRaw from '../src/MenuButton.astro';
import { install } from '../src/runtime/menu';
import type { MenuItem } from '../src/types';

type Component = Parameters<AstroContainer['renderToString']>[0];

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

const nav: MenuItem[] = [
	{ label: 'Home', href: '/' },
	{ label: 'Plugins', href: '/plugins', items: [{ label: 'Forms', href: '/plugins/forms' }, { label: 'Shop', href: '/plugins/shop' }] },
	{ label: 'Resources', items: [{ label: 'Docs', href: '/docs' }, { label: 'Pricing', href: '#pricing' }] },
];

let dom: JSDOM;
let doc: Document;
let uninstall: () => void;

/** Render the bar, a hamburger and the drawer into a fresh jsdom page. */
async function mount(drawerProps: Record<string, unknown> = {}): Promise<void> {
	const request = new Request('https://example.com/');
	const parts = await Promise.all([
		container.renderToString(MenuBarRaw as Component, { props: { items: nav }, request }),
		container.renderToString(MenuButtonRaw as Component, { props: { controls: 'site-menu' }, request }),
		container.renderToString(MenuDrawerRaw as Component, { props: { id: 'site-menu', items: nav, ...drawerProps }, request }),
	]);
	dom = new JSDOM(`<!doctype html><html><body><header>${parts.join('')}</header><main><p id="outside">Text</p><button id="elsewhere">Elsewhere</button></main></body></html>`, {
		url: 'https://example.com/',
		pretendToBeVisual: true,
	});
	doc = dom.window.document;
	stubDialog(dom.window);
	uninstall = install(doc);
}

/** The smallest `showModal()` / `close()` that keeps the dialog contract. */
function stubDialog(window: JSDOM['window']): void {
	const proto = window.HTMLDialogElement.prototype as HTMLDialogElement;
	proto.showModal = function (this: HTMLDialogElement) {
		this.setAttribute('open', '');
		this.querySelector<HTMLElement>('button, a[href]')?.focus();
	};
	proto.close = function (this: HTMLDialogElement) {
		if (!this.hasAttribute('open')) return;
		this.removeAttribute('open');
		this.dispatchEvent(new window.Event('close'));
	};
	Object.defineProperty(proto, 'open', {
		configurable: true,
		get(this: HTMLDialogElement) {
			return this.hasAttribute('open');
		},
	});
}

const $ = <T extends Element = HTMLElement>(selector: string) => doc.querySelector<T>(selector)!;
const dropdown = (label: string) =>
	Array.from(doc.querySelectorAll('[data-menu-dropdown]')).find((el) => el.textContent?.includes(label))!;
const toggle = (label: string) => dropdown(label).querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
const panel = (label: string) => doc.getElementById(toggle(label).getAttribute('aria-controls')!)!;

const click = (el: Element) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
const press = (el: Element) => el.dispatchEvent(new dom.window.PointerEvent('pointerdown', { bubbles: true }));
const key = (key: string, target: Element = doc.activeElement ?? doc.body) =>
	target.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true }));
const pointer = (type: 'pointerover' | 'pointerout', el: Element, pointerType: string, relatedTarget: Element | null = null) =>
	el.dispatchEvent(new dom.window.PointerEvent(type, { bubbles: true, pointerType, relatedTarget }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	uninstall?.();
	vi.useRealTimers();
});

describe('dropdowns', () => {
	it('opens on click, keeping aria-expanded and the panel in step', async () => {
		await mount();
		click(toggle('Resources'));
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('true');
		expect(panel('Resources').hasAttribute('data-open')).toBe(true);
		expect(dropdown('Resources').hasAttribute('data-open')).toBe(true);
	});

	it('closes on a second click', async () => {
		await mount();
		click(toggle('Resources'));
		click(toggle('Resources'));
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
		expect(panel('Resources').hasAttribute('data-open')).toBe(false);
	});

	it('keeps one open at a time', async () => {
		await mount();
		click(toggle('Resources'));
		click(toggle('Plugins'));
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
		expect(toggle('Plugins').getAttribute('aria-expanded')).toBe('true');
	});

	it('closes on Escape and gives focus back to the toggle', async () => {
		await mount();
		click(toggle('Resources'));
		panel('Resources').querySelector<HTMLElement>('a')!.focus();
		key('Escape');
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
		expect(doc.activeElement).toBe(toggle('Resources'));
	});

	it("closes on Escape without moving focus that wasn't inside", async () => {
		await mount();
		click(toggle('Resources'));
		$('#elsewhere').focus();
		key('Escape');
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
		expect(doc.activeElement).toBe($('#elsewhere'));
	});

	it('closes on a press outside, but not on one inside', async () => {
		await mount();
		click(toggle('Resources'));
		press(panel('Resources'));
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('true');
		press($('#outside'));
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
	});

	it('closes when focus moves on past it', async () => {
		await mount();
		click(toggle('Resources'));
		const links = panel('Resources').querySelectorAll<HTMLElement>('a');
		links[0].focus();
		links[1].focus();
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('true');
		$('#elsewhere').focus();
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
	});

	it('closes when one of its links is followed', async () => {
		await mount();
		click(toggle('Resources'));
		click(panel('Resources').querySelector('a[href="#pricing"]')!);
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
	});

	it('opens on mouse hover after a moment, and closes after leaving', async () => {
		await mount();
		pointer('pointerover', toggle('Resources'), 'mouse');
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
		vi.advanceTimersByTime(100);
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('true');
		pointer('pointerout', dropdown('Resources'), 'mouse', $('#outside'));
		vi.advanceTimersByTime(250);
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
	});

	it('stays open while the mouse moves from the toggle into the panel', async () => {
		await mount();
		pointer('pointerover', toggle('Resources'), 'mouse');
		vi.advanceTimersByTime(100);
		pointer('pointerout', toggle('Resources'), 'mouse', panel('Resources'));
		vi.advanceTimersByTime(250);
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('true');
	});

	it("doesn't open for a mouse that only passes over", async () => {
		await mount();
		pointer('pointerover', toggle('Resources'), 'mouse');
		vi.advanceTimersByTime(40);
		pointer('pointerout', dropdown('Resources'), 'mouse', $('#outside'));
		vi.advanceTimersByTime(200);
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
	});

	it('never opens on touch or pen hover', async () => {
		await mount();
		pointer('pointerover', toggle('Resources'), 'touch');
		pointer('pointerover', toggle('Plugins'), 'pen');
		vi.advanceTimersByTime(200);
		expect(doc.querySelectorAll('[data-menu-dropdown][data-open]').length).toBe(0);
	});

	it('stays open after the mouse leaves once clicked — pinned', async () => {
		await mount();
		pointer('pointerover', toggle('Resources'), 'mouse');
		vi.advanceTimersByTime(100);
		click(toggle('Resources'));
		pointer('pointerout', dropdown('Resources'), 'mouse', $('#outside'));
		vi.advanceTimersByTime(250);
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('true');
	});

	it('fires menu:toggle on open and close', async () => {
		await mount();
		const seen: boolean[] = [];
		doc.addEventListener('menu:toggle', (e) => seen.push((e as CustomEvent).detail.open));
		click(toggle('Resources'));
		click(toggle('Resources'));
		expect(seen).toEqual([true, false]);
	});
});

describe('drawer', () => {
	const drawer = () => $<HTMLDialogElement>('#site-menu');
	const hamburger = () => $<HTMLButtonElement>('[data-menu-open="site-menu"]');

	it('opens from the button, moving focus in and expanding the button', async () => {
		await mount();
		hamburger().focus();
		click(hamburger());
		expect(drawer().open).toBe(true);
		expect(hamburger().getAttribute('aria-expanded')).toBe('true');
		expect(drawer().contains(doc.activeElement)).toBe(true);
	});

	it('closes from its close button and gives focus back to the hamburger', async () => {
		await mount();
		hamburger().focus();
		click(hamburger());
		click($('[data-menu-close]'));
		expect(drawer().open).toBe(false);
		expect(hamburger().getAttribute('aria-expanded')).toBe('false');
		expect(doc.activeElement).toBe(hamburger());
	});

	it('closes on a click on the backdrop — the dialog itself — but not inside', async () => {
		await mount();
		click(hamburger());
		click(drawer().querySelector('.menu-drawer__title')!);
		expect(drawer().open).toBe(true);
		click(drawer());
		expect(drawer().open).toBe(false);
	});

	it('closes when one of its links is followed', async () => {
		await mount();
		click(hamburger());
		click(drawer().querySelector('a[href="/docs"]')!);
		expect(drawer().open).toBe(false);
	});

	it("doesn't close when a group opens", async () => {
		await mount();
		click(hamburger());
		click(drawer().querySelector('summary')!);
		expect(drawer().open).toBe(true);
	});

	it('pads out the scrollbar while open, and stops after', async () => {
		await mount();
		click(hamburger());
		expect(doc.documentElement.style.getPropertyValue('--menu-scrollbar')).toMatch(/px$/);
		click($('[data-menu-close]'));
		expect(doc.documentElement.style.getPropertyValue('--menu-scrollbar')).toBe('');
	});

	it('closes any open dropdown as it opens', async () => {
		await mount();
		click(toggle('Resources'));
		click(hamburger());
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
	});

	it('closes when the closeAbove query starts to match', async () => {
		await mount({ closeAbove: '(min-width: 768px)' });
		const listeners: Array<() => void> = [];
		const list = { matches: false, addEventListener: (_: string, fn: () => void) => listeners.push(fn), removeEventListener: vi.fn() };
		dom.window.matchMedia = vi.fn().mockReturnValue(list) as unknown as typeof dom.window.matchMedia;
		click(hamburger());
		expect(dom.window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
		list.matches = true;
		listeners.forEach((fn) => fn());
		expect(drawer().open).toBe(false);
		expect(list.removeEventListener).toHaveBeenCalled();
	});

	it('fires menu:toggle from the dialog', async () => {
		await mount();
		const seen: boolean[] = [];
		drawer().addEventListener('menu:toggle', (e) => seen.push((e as CustomEvent).detail.open));
		click(hamburger());
		click($('[data-menu-close]'));
		expect(seen).toEqual([true, false]);
	});
});

describe('install', () => {
	it('wires a document once, however often it is called', async () => {
		await mount();
		expect(install(doc)).toBe(uninstall);
		click(toggle('Resources'));
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('true');
		click(toggle('Resources'));
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
	});

	it('covers menus added after it ran — an Astro view-transition swap', async () => {
		await mount();
		const header = doc.querySelector('header')!;
		header.innerHTML = header.innerHTML;
		click(toggle('Resources'));
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('true');
	});

	it('takes every listener off', async () => {
		await mount();
		uninstall();
		click(toggle('Resources'));
		expect(toggle('Resources').getAttribute('aria-expanded')).toBe('false');
	});
});
