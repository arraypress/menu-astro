# @arraypress/menu-astro

> Accessible site navigation for Astro. A nav bar with dropdowns and mega
> panels, and a mobile drawer on native `<dialog>` — one `items` array
> drives both. WAI-ARIA disclosure pattern, WCAG 2.2 AA, every browser
> from 2024.

One runtime for every menu on the page: its listeners sit on the document
and are added once, so menus rendered later — or swapped in by an Astro
view transition — work with nothing to re-bind, and nothing piles up per
navigation.

## Install

```bash
npm install @arraypress/menu-astro
```

## Use

Describe the navigation once:

```ts
// src/config/nav.ts
import type { MenuItem } from '@arraypress/menu-astro';

export const nav: MenuItem[] = [
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
			{ label: 'Plugins', items: [{ label: 'Forms', href: '/plugins/forms' }] },
		],
	},
	{ label: 'GitHub', href: 'https://github.com/arraypress', external: true },
];
```

Then draw it twice — the bar for wide screens, the drawer for narrow ones:

```astro
---
import { MenuBar, MenuButton, MenuDrawer } from '@arraypress/menu-astro';
import { nav } from '../config/nav';
---

<header class="site-header">
	<a href="/">Logo</a>
	<MenuBar items={nav} />
	<MenuButton controls="site-menu" />
	<MenuDrawer id="site-menu" items={nav} closeAbove="(min-width: 768px)">
		<a slot="footer" href="mailto:hello@example.com">hello@example.com</a>
	</MenuDrawer>
</header>

<style>
	.site-header { position: sticky; top: 0; }
	.site-header :global(.menu-button) { display: none; }
	@media (max-width: 767px) {
		.site-header :global(.menu-bar) { display: none; }
		.site-header :global(.menu-button) { display: inline-grid; }
	}
</style>
```

The header is positioned (`sticky` here), so the wide "Products" panel spans
the header rather than its own trigger.

### Item shapes

| Shape | Bar | Drawer |
|---|---|---|
| `{ label, href }` | a link | a link |
| `{ label, items }` | a dropdown; the label is its button | a group |
| `{ label, href, items }` | a dropdown; the label stays a link, a toggle beside it opens the panel | a group, with "All {label}" first |
| `{ label, size: 'wide', items: [{ label, items }] }` | a mega panel: each child a headed column | a group, each column a labelled list |
| `{ …, external: true }` | opens in a new tab, says so to screen readers | the same |
| `{ …, description }` | a line under the label in a panel | — |
| `{ …, icon: 'ti ti-forms' }` | an icon-font glyph before the label, hidden from screen readers | the same |
| `{ …, attrs: { 'data-astro-prefetch': '' } }` | extra attributes on the link | the same |
| `{ label, items, aside: 'latest' }` | `<MenuBar>`'s `latest` slot sits beside the panel's links | ignored — links only |

A parent's own page heads its drawer group as "All {label}" — unless one
of its children already links to the same place, so no page shows twice.

Content that isn't a link — a featured release, a product card — goes in
a named slot beside a dropdown's generated links:

```astro
<MenuBar items={[{ label: 'Products', href: '/products', items: products, aside: 'latest' }]}>
	<a slot="latest" class="featured" href={latest.url}>
		<img src={latest.cover} alt="" /> {latest.title}
	</a>
</MenuBar>
```

On a `<MenuDropdown items>` of your own, the slot is just `aside`.

Two levels at most. Fly-out submenus inside a dropdown are hard to use by
pointer or keyboard; a wide panel shows the same links better.

`aria-current` is worked out from the page URL: `"page"` on a link to this
page, `"true"` on a section above it (the "Blog" link while you read a
post). Links with a `#` are never current. Set `current` on an item to
decide for yourself.

### Your own markup

Every component has a default slot, so the bar and panels can hold anything:

```astro
<MenuBar>
	<li><a class="menu-bar__link" href="/">Home</a></li>
	<li>
		<MenuDropdown label="Resources" size="wide">
			<YourMegaPanel />
		</MenuDropdown>
	</li>
</MenuBar>

<MenuDrawer id="site-menu">
	<nav aria-label="Main">
		<ul class="menu-drawer__list">
			<li><a class="menu-drawer__link" href="/">Home</a></li>
			<li>
				<MenuGroup label="Resources">
					<li><a class="menu-drawer__link" href="/docs">Docs</a></li>
				</MenuGroup>
			</li>
		</ul>
	</nav>
</MenuDrawer>
```

## Accessibility

Built to WCAG 2.2 AA and the WAI-ARIA Authoring Practices, and tested in
Chromium, Firefox and WebKit with axe-core in every state.

**Dropdowns** follow the
[disclosure navigation pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/):
a `<button>` with `aria-expanded` and `aria-controls`, and a panel of
ordinary links that Tab moves through. Not `role="menu"` — that's for
application menus, and it has screen readers expect arrow keys a site's nav
doesn't use.

- Enter, Space or a click opens a panel and pins it open; Escape closes it
  and returns focus to its button. Tabbing out, pressing outside or
  following one of its links closes it too.
- A parent with its own page keeps its label as a link and gets a separate
  toggle beside it, named "Plugins pages" (`strings.submenu`). A link that
  also opens a panel can't do both on touch or by keyboard.
- Opening on hover only happens with a mouse, on a device that can hover.
  The panel stays open while the pointer moves onto it, never closes on a
  timer while hovered, and Escape dismisses it — WCAG 1.4.13.
- A closed panel is `visibility: hidden`: out of sight, the tab order and
  the accessibility tree at once.

**The drawer** is a `<dialog>` opened with `showModal()`, so the browser
moves focus in and keeps it there, makes the page behind inert to every
input and to screen readers, and closes it on Escape. The runtime closes it
from the backdrop and its links, locks the page's scroll without a layout
shift, and returns focus to the button that opened it. It's named by its
heading, and its close button by `strings.close`.

**Everywhere:** a visible focus ring (2.4.7); targets of at least 24px
(2.5.8) — the hamburger and close button are 44px; carets and icons hidden
from screen readers; external links announce that they open a new tab;
motion off under `prefers-reduced-motion`; real borders in forced-colours
mode.

What tests can't do is listen. Before relying on it, spend ten minutes
with VoiceOver (macOS, iOS) and NVDA (Windows): open each dropdown, walk a
mega panel, open and close the drawer, and check each is announced as you'd
expect.

## Browser support

Every browser from January 2024: Chrome and Edge 120+, Safari 17+ (macOS
and iOS), Firefox 121+, Samsung Internet 25+.

| Feature | Needed for | Support |
|---|---|---|
| `<dialog>`, `showModal()` | the drawer | 2022 |
| `inert` (via `showModal`) | the page behind the drawer | 2023 |
| `:has()` | the scroll lock | Firefox 121, December 2023 |
| `dvh` | the drawer's height on mobile | 2023 |
| `@starting-style`, `allow-discrete` | the drawer sliding in | Safari 17.5, Firefox 129 — earlier, it opens without sliding |

Dropdowns are positioned with plain CSS, not the Popover API or anchor
positioning, so they need no fallback anywhere in that range.

That floor comes from when each feature shipped, above. The test suite runs
in current Chromium, Firefox and WebKit; the oldest versions in the range
haven't been run, since their builds no longer start on a current macOS.
Check those on a device lab — BrowserStack, or an iOS 17 simulator — before
leaning on them.

## DOM contract

The runtime reads these attributes, which the components emit. Use them on
your own markup to get the same behaviour.

| Attribute | On | Does |
|---|---|---|
| `data-menu-dropdown` | a dropdown's wrapper | Groups a toggle and its panel. Gets `data-open`. |
| `data-hover` | the same wrapper | Lets a mouse open it by hovering. |
| `data-menu-toggle` | its `<button>` | Opens and closes it; needs `aria-controls` and `aria-expanded`. |
| `data-menu-panel` | its panel | Gets `data-open`. |
| `data-menu-drawer` | a `<dialog>` | Makes it a drawer. `data-close-above` holds a media query that closes it. |
| `data-menu-open="id"` | anything | Opens the drawer `id`; its `aria-expanded` follows. |
| `data-menu-close` | anything in a drawer | Closes it. |

## Events

```js
document.addEventListener('menu:toggle', (e) => {
	console.log(e.target, e.detail.open);
});
```

`menu:toggle` bubbles from a dropdown's wrapper or a drawer's `<dialog>`
every time one opens or closes.

## Props

### `<MenuBar>`

| Prop | Default | Description |
|---|---|---|
| `items` | — | What to draw. Without it, the default slot fills the `<ul>`. |
| `label` | `'Main'` | The `<nav>` landmark's `aria-label`. |
| `currentPath` | the page's path | What `aria-current` is worked out against. |
| `hover` | `true` | Open dropdowns on mouse hover. |
| `align` | `'start'` | Where every panel lines up: `'start'`, `'center'` or `'end'`. |
| `strings` | — | i18n strings, merged onto `DEFAULT_STRINGS`. |
| `class` | — | Extra classes on the `<nav>`. |

### `<MenuDropdown>`

| Prop | Default | Description |
|---|---|---|
| `label` | **required** | The trigger's text. |
| `href` | — | Makes the label a link, with a separate toggle beside it. |
| `items` | — | What the panel lists. Without it, the default slot fills the panel. |
| `size` | `'default'` | `'wide'` spans the nearest positioned ancestor: a mega panel. |
| `align` | `'start'` | `'start'`, `'center'` or `'end'` under the trigger. |
| `hover` | `true` | Open on mouse hover. |
| `id` | from the label | The panel's id. |
| `current` | from the URL | Marks the label link as the current page. |
| `attrs` | — | Extra attributes for the label link. |
| `currentPath` | the page's path | What `aria-current` is worked out against. |
| `strings` | — | i18n strings. |
| `class` | — | Extra classes on the wrapper. |

### `<MenuDrawer>`

| Prop | Default | Description |
|---|---|---|
| `id` | `'menu-drawer'` | The `<dialog>`'s id; `<MenuButton controls>` points at it. |
| `items` | — | Drawn as a nav, dropdowns as groups. The default slot follows it. |
| `navLabel` | `'Main'` | That nav's `aria-label`. |
| `side` | `'end'` | The edge it slides in from: `'start'` or `'end'` (flips in RTL). |
| `closeAbove` | — | A media query that closes it, e.g. `'(min-width: 768px)'`. |
| `currentPath` | the page's path | What `aria-current` and the open group are worked out against. |
| `strings` | — | i18n strings. |
| `class` | — | Extra classes on the `<dialog>`. |

Slots: default (after the nav), `footer` (pinned to the bottom; left out
when it renders nothing).

### `<MenuButton>`

| Prop | Default | Description |
|---|---|---|
| `controls` | `'menu-drawer'` | The drawer's id. |
| `strings` | — | `strings.open` names it. |
| `class` | — | Extra classes on the `<button>`. |

The default slot replaces the icon. Keep any visible text inside the
accessible name ("Menu" in "Open menu"), for WCAG 2.5.3.

### `<MenuGroup>`

| Prop | Default | Description |
|---|---|---|
| `label` | **required** | The `<summary>`. |
| `open` | `false` | Start open. |
| `class` | — | Extra classes on the `<details>`. |

### Strings

| Key | Default | Where |
|---|---|---|
| `open` | `'Open menu'` | the hamburger |
| `close` | `'Close menu'` | the drawer's close button |
| `title` | `'Menu'` | the drawer's heading and name |
| `submenu` | `'{label} pages'` | the toggle beside a parent that's a link |
| `external` | `'(opens in a new tab)'` | read after an external link |
| `overview` | `'All {label}'` | a parent page's link at the top of its drawer group |

## Styling

The components ship a plain look you can keep or replace. It all sits in
the `menu-astro` cascade layer with every selector wrapped in `:where()`,
so it weighs nothing — any rule you write for these classes wins.

Unlayered CSS beats any layer, so on a plain-CSS site there's nothing to
do. If your own CSS is layered, place `menu-astro` yourself: above your
resets — Tailwind's preflight, left above it, turns `<summary>` back into a
list item and every `<svg>` into a block — and below everything you style
with. For Tailwind v4, first thing in your main stylesheet:

```css
@layer theme, base, menu-astro, components, utilities;
@import 'tailwindcss';
```

The quickest change is the custom properties:

```css
:root {
	--menu-surface: Canvas;          /* panel and drawer background */
	--menu-text: CanvasText;
	--menu-muted: color-mix(in srgb, CanvasText 65%, transparent);
	--menu-border: color-mix(in srgb, CanvasText 14%, transparent);
	--menu-hover: color-mix(in srgb, CanvasText 6%, transparent);
	--menu-current: currentColor;     /* the current page's link */
	--menu-backdrop: rgb(0 0 0 / 0.5);
	--menu-radius: 0.75rem;
	--menu-shadow: 0 18px 40px -12px rgb(0 0 0 / 0.35);
	--menu-gap: 0.5rem;               /* trigger to panel */
	--menu-z: 50;
	--menu-panel-width: 15rem;
	--menu-drawer-width: min(22rem, 88vw);
	--menu-duration: 200ms;
	--menu-ease: cubic-bezier(0.32, 0.72, 0, 1);
	--menu-focus: 2px solid currentColor;
}
```

Class hooks:

```
.menu-bar  .menu-bar__list  .menu-bar__item  .menu-bar__link
.menu-dropdown[data-open]  [data-size="wide"]  [data-align]
.menu-dropdown__trigger  .menu-dropdown__link  .menu-dropdown__toggle
.menu-dropdown__panel[data-open]  .menu-dropdown__list  .menu-dropdown__item
.menu-dropdown__label  .menu-dropdown__desc
.menu-dropdown__body  .menu-dropdown__main  .menu-dropdown__aside
.menu-dropdown__columns  .menu-dropdown__column  .menu-dropdown__heading
.menu-button  .menu-button__icon
.menu-drawer[open]  [data-side]  .menu-drawer__panel  .menu-drawer__head
.menu-drawer__title  .menu-drawer__close  .menu-drawer__body
.menu-drawer__nav  .menu-drawer__list  .menu-drawer__link  .menu-drawer__foot
.menu-group[open]  .menu-group__summary  .menu-group__items  .menu-group__heading
.menu-caret  .menu-icon  .menu-sr
```

Keep a visible focus style if you replace the ring — removing it fails
WCAG 2.4.7.

## Testing

```bash
npm test           # markup and runtime, in Node and jsdom
npm run test:e2e   # Chromium, Firefox and WebKit, desktop and phone, with axe
```

The browser tests build `test/e2e/fixture` — every component on a page with
view transitions — and need the engines once: `npx playwright install`.

## License

MIT
