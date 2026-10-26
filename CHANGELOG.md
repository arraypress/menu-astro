# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] — Unreleased

### Initial Release

- `<MenuBar>` — the site's main navigation as a named `<nav>` landmark,
  drawn from an `items` array or from the default slot.
- `<MenuDropdown>` — the WAI-ARIA disclosure pattern: a `<button>` with
  `aria-expanded` and `aria-controls`, a panel of plain links, no
  `role="menu"`. Click, Enter or Space pins it open; a mouse opens it on
  hover; Escape, Tab-ing out, pressing outside and following a link close
  it; one is open at a time. A parent with an `href` keeps its label as a
  link with a separate toggle beside it. `size="wide"` makes a mega panel
  across the header, children with `items` becoming headed columns.
- `<MenuDrawer>` — the menu on small screens, on a native `<dialog>` with
  `showModal()`: focus trap, inert page, top layer and Escape from the
  browser; closing from the backdrop, its links and a `closeAbove` media
  query; a scroll lock that pads out the scrollbar; focus back to the
  button. Drawn from the same `items` as the bar, dropdowns as groups with
  the current one open.
- `<MenuButton>` — the hamburger, its `aria-expanded` following the drawer.
- `<MenuGroup>` — a collapsible group in the drawer, on `<details>`.
- Items can carry a `description` (shown in panels), an `icon` — classes
  for an icon-font glyph, drawn hidden from screen readers — and `attrs`
  passed through to the link.
- `menu.css` sits in the `menu-astro` cascade layer, so unlayered site CSS
  always wins; a layered site (Tailwind v4) names the layer first.
- `aria-current` worked out from the page URL: `"page"` for this page,
  `"true"` for a section above it, never for a link with a `#`.
- One runtime on the document, added once: menus rendered later or swapped
  in by a view transition work without re-binding, and nothing builds up per
  navigation. `menu:toggle` fires on every open and close.
- `menu.css` — structure and a plain look, all at zero specificity and
  themeable through `--menu-*` custom properties; reduced motion and forced
  colours handled.
- Every browser from 2024: Chrome / Edge 120, Safari 17, Firefox 121.
- Tests: markup and helpers through Astro's container, the runtime in
  jsdom, and the components in Chromium, Firefox and WebKit at desktop and
  phone size with axe-core in every state.
