/**
 * @module @arraypress/menu-astro/utils
 *
 * Pure helpers the components share: which item is the current page, the
 * `{label}` strings, and DOM ids. No DOM, so they run at build time.
 */
import { DEFAULT_STRINGS } from './types';
import type { MenuItem, MenuStrings } from './types';

/**
 * A path without its query, hash or trailing slash — `/blog/` and `/blog`
 * are one page. The root stays `/`.
 *
 * @param path A path or URL.
 * @returns The bare path.
 */
export function normalizePath(path: string): string {
	let bare = path.replace(/^[a-z][a-z\d+.-]*:\/\/[^/]+/i, '').split(/[?#]/)[0] || '/';
	if (bare.length > 1) bare = bare.replace(/\/+$/, '');
	return bare || '/';
}

/**
 * Whether a link points at the current page: the same path, or — for
 * anything but the home page — a page below it, so "Blog" stays marked on
 * every post. External links never match, and nor does anything with a
 * `#`: `/#pricing` is a place on the home page, not the home page, and
 * marking it would mark every section link on the page at once.
 *
 * @param href The link's target.
 * @param currentPath The page's path.
 * @returns True when the link is the current page or one of its parents.
 */
export function isCurrentPath(href: string | undefined, currentPath: string): boolean {
	if (!href || href.includes('#') || /^[a-z][a-z\d+.-]*:/i.test(href)) return false;
	const target = normalizePath(href);
	const here = normalizePath(currentPath);
	if (target === here) return true;
	return target !== '/' && here.startsWith(target + '/');
}

/**
 * The `aria-current` value for a link: `'page'` when it is this page,
 * `'true'` when this page sits below it (the "Blog" link while you read a
 * post — part of the current location, but not the page itself), and
 * nothing otherwise. An item's own `current` forces `'page'` or nothing.
 *
 * @param item The link's `href` and optional `current`.
 * @param currentPath The page's path.
 * @returns The attribute's value, or undefined to leave it off.
 */
export function ariaCurrent(
	item: Pick<MenuItem, 'href' | 'current'>,
	currentPath: string
): 'page' | 'true' | undefined {
	if (item.current !== undefined) return item.current ? 'page' : undefined;
	if (!isCurrentPath(item.href, currentPath)) return undefined;
	return normalizePath(item.href ?? '') === normalizePath(currentPath) ? 'page' : 'true';
}

/**
 * Whether two links go to the same place — the same path, trailing slash
 * or not, and the same `#` section. Used to drop a parent's own link from
 * its drawer group when one of its children already goes there.
 *
 * @param a A link's target.
 * @param b Another link's target.
 * @returns True when both lead to the same page and section.
 */
export function sameTarget(a: string | undefined, b: string | undefined): boolean {
	if (!a || !b) return false;
	const split = (href: string) => {
		const hash = href.includes('#') ? href.slice(href.indexOf('#')) : '';
		return normalizePath(href) + hash;
	};
	return split(a) === split(b);
}

/**
 * Whether an item, or anything under it, is the current page — so a
 * dropdown's label is marked while you're on one of its pages, and the
 * drawer opens that group.
 *
 * @param item The item.
 * @param currentPath The page's path.
 * @returns True when the item or a descendant is current.
 */
export function containsCurrent(item: MenuItem, currentPath: string): boolean {
	if (item.current ?? isCurrentPath(item.href, currentPath)) return true;
	return (item.items ?? []).some((child) => containsCurrent(child, currentPath));
}

/**
 * The strings to use: the defaults with the caller's on top.
 *
 * @param strings The caller's strings.
 * @returns Every string.
 */
export function resolveStrings(strings: MenuStrings | undefined): Required<MenuStrings> {
	return { ...DEFAULT_STRINGS, ...(strings ?? {}) };
}

/**
 * Fill a string's `{label}` with an item's label.
 *
 * @param template e.g. `'{label} pages'`.
 * @param label e.g. `'Plugins'`.
 * @returns e.g. `'Plugins pages'`.
 */
export function format(template: string, label: string): string {
	return template.replace(/\{label\}/g, label);
}

/**
 * Ids handed out so far, per page. Keyed on the page's own request object,
 * so the count starts again on every page of a static build — a module-wide
 * count would run on from page to page and end in `menu-plugins-37`.
 */
const issued = new WeakMap<object, Map<string, number>>();

/**
 * A DOM id from a label: lowercase, dashed, prefixed, and numbered when the
 * same label comes up twice on one page — two "Products" dropdowns get
 * `menu-products` and `menu-products-2`. The same page always gets the same
 * ids.
 *
 * @param label The text to make it from.
 * @param page Anything unique to the page being rendered: `Astro.request`.
 * @param prefix What goes in front. Default `'menu'`.
 * @returns e.g. `'menu-plugins'`, then `'menu-plugins-2'`.
 */
export function makeId(label: string, page: object, prefix = 'menu'): string {
	const slug =
		label
			.normalize('NFKD')
			.toLowerCase()
			.replace(/[^\p{L}\p{N}]+/gu, '-')
			.replace(/^-+|-+$/g, '') || 'item';
	const base = `${prefix}-${slug}`;
	let counts = issued.get(page);
	if (!counts) issued.set(page, (counts = new Map()));
	const count = (counts.get(base) ?? 0) + 1;
	counts.set(base, count);
	return count === 1 ? base : `${base}-${count}`;
}
