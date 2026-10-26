/**
 * @module @arraypress/menu-astro/types
 */

/**
 * One entry in a site's navigation — the shape `<MenuBar items>` and
 * `<MenuDrawer items>` render, so one array drives the desktop bar and the
 * mobile drawer alike.
 *
 *   - A link: `{ label, href }`.
 *   - A dropdown: add `items`. With an `href` too, the label stays a link to
 *     that page and a separate toggle beside it opens the panel; without one,
 *     the label is the toggle.
 *   - A mega panel: `size: 'wide'`, and give the children `items` of their
 *     own — each child becomes a column headed by its label.
 *
 * Two levels deep at most: a column's links don't nest further. Fly-out
 * submenus inside a dropdown are hard to use by pointer or keyboard, and a
 * wide panel shows the same links better.
 */
export interface MenuItem {
	/** Visible text. */
	label: string;
	/** Where it goes. Optional on a dropdown parent; required on a link. */
	href?: string;
	/** A line under the label — shown in dropdown and mega panels. */
	description?: string;
	/**
	 * Classes for an icon-font glyph before the label — `'ti ti-forms'` for
	 * Tabler Icons. Drawn as `<i class="menu-icon …" aria-hidden="true">`:
	 * decoration, so the label must still say what the link is.
	 */
	icon?: string;
	/** Children: makes this item a dropdown (bar) or a group (drawer). */
	items?: MenuItem[];
	/** `'wide'` spans the panel across the header: a mega panel. Default `'default'`. */
	size?: MenuPanelSize;
	/** Opens in a new tab, with `rel="noopener"`. */
	external?: boolean;
	/**
	 * Extra attributes for the `<a>` — `{ 'data-astro-prefetch': '' }`, say.
	 * `href`, `class`, `aria-current`, `target` and `rel` are the menu's own.
	 */
	attrs?: Record<string, string | number | boolean | undefined>;
	/**
	 * Marks this item as the current page (`aria-current="page"`), or not.
	 * Left out, it's worked out from the page URL: the same path is
	 * `"page"`, a path below this one (for anything but `/`) is `"true"`.
	 */
	current?: boolean;
}

/** How wide a dropdown's panel is. */
export type MenuPanelSize = 'default' | 'wide';

/** Where a dropdown's panel lines up under its trigger. */
export type MenuPanelAlign = 'start' | 'center' | 'end';

/** The edge the drawer slides in from. */
export type MenuDrawerSide = 'start' | 'end';

/** i18n strings. `{label}` is replaced with the item's label. */
export interface MenuStrings {
	/** The hamburger's accessible name. */
	open?: string;
	/** The drawer's close button. */
	close?: string;
	/** The drawer's heading, which also names the dialog. */
	title?: string;
	/**
	 * The separate toggle beside a dropdown parent that's also a link. It has
	 * no visible text, so this is its whole name; its state comes from
	 * `aria-expanded`, so the name doesn't change when it opens.
	 */
	submenu?: string;
	/** Read after an external link's text, which opens in a new tab. */
	external?: string;
}

export const DEFAULT_STRINGS: Required<MenuStrings> = {
	open:    'Open menu',
	close:   'Close menu',
	title:   'Menu',
	submenu: '{label} pages',
	external: '(opens in a new tab)',
};

/** Props for `<MenuBar>`. */
export interface MenuBarProps {
	/** The nav landmark's name — `aria-label`. Default `'Main'`. */
	label?: string;
	/** Render these instead of the default slot. */
	items?: MenuItem[];
	/** The path `current` is worked out against. Default: the page's own. */
	currentPath?: string;
	/** Open dropdowns on hover, on devices with a real pointer. Default `true`. */
	hover?: boolean;
	/** Where every dropdown's panel lines up under its trigger. Default `'start'`. */
	align?: MenuPanelAlign;
	/** i18n strings. Merged onto `DEFAULT_STRINGS`. */
	strings?: MenuStrings;
	/** Extra classes on the `<nav>`. */
	class?: string;
}

/** Props for `<MenuDropdown>`. */
export interface MenuDropdownProps {
	/** The trigger's text. */
	label: string;
	/** Makes the label a link, with a separate toggle beside it. */
	href?: string;
	/** Marks the label link as the current page. Left out, worked out from the URL. */
	current?: boolean;
	/** Render these in the panel instead of the default slot. */
	items?: MenuItem[];
	/** The path `current` is worked out against. Default: the page's own. */
	currentPath?: string;
	/** The panel's DOM id. Default: one made from the label. */
	id?: string;
	/** `'wide'` for a mega panel. Default `'default'`. */
	size?: MenuPanelSize;
	/** Where the panel lines up under the trigger. Default `'start'`. */
	align?: MenuPanelAlign;
	/** Open on hover, on devices with a real pointer. Default `true`. */
	hover?: boolean;
	/** Extra attributes for the label link, when there's an `href`. */
	attrs?: MenuItem['attrs'];
	/** i18n strings. Merged onto `DEFAULT_STRINGS`. */
	strings?: MenuStrings;
	/** Extra classes on the wrapper. */
	class?: string;
}

/** Props for `<MenuDrawer>`. */
export interface MenuDrawerProps {
	/** The `<dialog>`'s id — `<MenuButton controls>` points at it. Default `'menu-drawer'`. */
	id?: string;
	/** Render these as the drawer's nav instead of the default slot. */
	items?: MenuItem[];
	/** The drawer nav's `aria-label`, when `items` renders one. Default `'Main'`. */
	navLabel?: string;
	/** The path `current` is worked out against. Default: the page's own. */
	currentPath?: string;
	/** The edge it slides in from. Default `'end'`. */
	side?: MenuDrawerSide;
	/**
	 * A media query; while it matches, an open drawer closes — so widening
	 * the window past the point where the bar takes over doesn't leave a
	 * drawer over a desktop layout. e.g. `'(min-width: 768px)'`.
	 */
	closeAbove?: string;
	/** i18n strings. Merged onto `DEFAULT_STRINGS`. */
	strings?: MenuStrings;
	/** Extra classes on the `<dialog>`. */
	class?: string;
}

/** Props for `<MenuButton>`. */
export interface MenuButtonProps {
	/** The drawer's id. Default `'menu-drawer'`. */
	controls?: string;
	/** i18n strings. Merged onto `DEFAULT_STRINGS`. */
	strings?: MenuStrings;
	/** Extra classes on the `<button>`. */
	class?: string;
}

/** Props for `<MenuGroup>`. */
export interface MenuGroupProps {
	/** The group's heading — its `<summary>`. */
	label: string;
	/** Start open. `<MenuDrawer items>` opens the group holding the current page. */
	open?: boolean;
	/** Extra classes on the `<details>`. */
	class?: string;
}
