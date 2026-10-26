import { describe, it, expect } from 'vitest';
import { ariaCurrent, containsCurrent, format, isCurrentPath, makeId, normalizePath, resolveStrings, sameTarget } from '../src/utils';
import { DEFAULT_STRINGS } from '../src/types';

describe('normalizePath', () => {
	it('drops the query, hash, origin and trailing slash', () => {
		expect(normalizePath('/blog/')).toBe('/blog');
		expect(normalizePath('/blog?page=2#top')).toBe('/blog');
		expect(normalizePath('https://example.com/blog/')).toBe('/blog');
	});

	it('keeps the root as /', () => {
		expect(normalizePath('/')).toBe('/');
		expect(normalizePath('')).toBe('/');
		expect(normalizePath('https://example.com')).toBe('/');
	});
});

describe('isCurrentPath', () => {
	it('matches the same page, with or without a trailing slash', () => {
		expect(isCurrentPath('/blog/', '/blog')).toBe(true);
		expect(isCurrentPath('/blog', '/blog/')).toBe(true);
	});

	it('matches a section from a page below it', () => {
		expect(isCurrentPath('/blog', '/blog/hello/')).toBe(true);
	});

	it("doesn't match a sibling that only shares a prefix", () => {
		expect(isCurrentPath('/blog', '/blogroll')).toBe(false);
	});

	it('only matches the home page on the home page', () => {
		expect(isCurrentPath('/', '/')).toBe(true);
		expect(isCurrentPath('/', '/blog')).toBe(false);
	});

	it('never matches external links, hashes or nothing', () => {
		expect(isCurrentPath('https://github.com/blog', '/blog')).toBe(false);
		expect(isCurrentPath('mailto:a@b.c', '/')).toBe(false);
		expect(isCurrentPath('#pricing', '/')).toBe(false);
		expect(isCurrentPath('/#pricing', '/')).toBe(false);
		expect(isCurrentPath('/about#team', '/about/')).toBe(false);
		expect(isCurrentPath(undefined, '/')).toBe(false);
	});
});

describe('ariaCurrent', () => {
	it('is "page" on the page itself and "true" on a section above it', () => {
		expect(ariaCurrent({ href: '/blog' }, '/blog/')).toBe('page');
		expect(ariaCurrent({ href: '/blog' }, '/blog/hello')).toBe('true');
		expect(ariaCurrent({ href: '/about' }, '/blog')).toBeUndefined();
	});

	it('lets an item say for itself', () => {
		expect(ariaCurrent({ href: '/a', current: true }, '/b')).toBe('page');
		expect(ariaCurrent({ href: '/a', current: false }, '/a')).toBeUndefined();
	});
});

describe('sameTarget', () => {
	it('matches the same page and section, trailing slash or not', () => {
		expect(sameTarget('/', '/')).toBe(true);
		expect(sameTarget('/demos/', '/demos')).toBe(true);
		expect(sameTarget('/#features', '/#features')).toBe(true);
	});

	it("tells sections and pages apart, and nothing matches nothing", () => {
		expect(sameTarget('/#features', '/')).toBe(false);
		expect(sameTarget('/demos', '/demo')).toBe(false);
		expect(sameTarget(undefined, '/')).toBe(false);
	});
});

describe('containsCurrent', () => {
	it('finds the current page anywhere below an item', () => {
		const item = { label: 'Products', items: [{ label: 'Themes', items: [{ label: 'Halftone', href: '/themes/halftone' }] }] };
		expect(containsCurrent(item, '/themes/halftone/')).toBe(true);
		expect(containsCurrent(item, '/blog')).toBe(false);
	});
});

describe('strings', () => {
	it('merges onto the defaults', () => {
		expect(resolveStrings(undefined)).toEqual(DEFAULT_STRINGS);
		expect(resolveStrings({ open: 'Меню' }).open).toBe('Меню');
		expect(resolveStrings({ open: 'Меню' }).close).toBe(DEFAULT_STRINGS.close);
	});

	it('fills {label}', () => {
		expect(format('{label} pages', 'Plugins')).toBe('Plugins pages');
	});
});

describe('makeId', () => {
	it('slugs the label, and numbers repeats on one page', () => {
		const page = {};
		expect(makeId('Our Plugins!', page)).toBe('menu-our-plugins');
		expect(makeId('Our Plugins!', page)).toBe('menu-our-plugins-2');
	});

	it('starts again on every page', () => {
		expect(makeId('Plugins', {})).toBe('menu-plugins');
		expect(makeId('Plugins', {})).toBe('menu-plugins');
	});

	it('keeps letters from any script', () => {
		expect(makeId('Программы', {})).toBe('menu-программы');
	});
});
