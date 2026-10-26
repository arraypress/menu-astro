/**
 * @module @arraypress/menu-astro/runtime
 *
 * The behaviour behind every menu component: dropdowns and mega panels in
 * the bar, and the drawer on small screens.
 *
 * Every listener sits on the `document` and is added once, so it covers
 * menus rendered later and survives Astro view-transition navigations with
 * nothing to re-bind — the swapped-in header just works, and nothing piles
 * up per navigation. The components import this module; it installs itself.
 *
 * Dropdowns — the WAI-ARIA disclosure pattern, not `role="menu"`, which is
 * for application menus and has screen readers expect arrow keys:
 *   - A click or tap on the toggle opens the panel and pins it open; another
 *     closes it. Enter and Space work the same, being a `<button>`.
 *   - With a mouse, hovering opens it after a moment and leaving closes it
 *     after a moment, unless it was pinned. Touch and pen never open on
 *     hover. Moving from the toggle into the panel keeps it open — the panel
 *     sits inside the wrapper — which with Escape meets WCAG 1.4.13.
 *   - Escape closes it and, if focus was inside, returns focus to the
 *     toggle. Tabbing out of it, pressing outside it, or following one of
 *     its links closes it too. One is open at a time.
 *
 * The drawer is a native `<dialog>` opened with `showModal()`, so the
 * browser traps focus, makes the page behind inert, puts the drawer on top
 * and closes it on Escape. On top of that, this:
 *   - opens it from any `[data-menu-open="id"]` and keeps their
 *     `aria-expanded` in step;
 *   - closes it from `[data-menu-close]`, a click on the backdrop, following
 *     one of its links, or the `closeAbove` media query starting to match;
 *   - locks the page's scroll while it's open, padding out the scrollbar's
 *     width so the page doesn't shift;
 *   - puts focus back on the button that opened it.
 *
 * DOM contract (data attributes the components emit):
 *   - `[data-menu-dropdown]`          a dropdown's wrapper; `[data-hover]` on it
 *                                     allows opening on hover. Gets `data-open`.
 *   - `[data-menu-toggle]`            its `<button>`: `aria-controls` names the
 *                                     panel, `aria-expanded` is kept in step.
 *   - `[data-menu-panel]`             the panel. Gets `data-open`.
 *   - `dialog[data-menu-drawer]`      the drawer; `data-close-above` holds the
 *                                     media query.
 *   - `[data-menu-open="id"]`         anything that opens the drawer `id`.
 *   - `[data-menu-close]`             anything inside a drawer that closes it.
 *
 * Events: `menu:toggle` bubbles from a dropdown's wrapper or the drawer each
 * time one opens or closes, with `detail.open`.
 */

/** How long the mouse rests on a dropdown before it opens. */
const HOVER_OPEN_DELAY = 80;

/** How long after the mouse leaves before an unpinned dropdown closes. */
const HOVER_CLOSE_DELAY = 200;

const DROPDOWN = '[data-menu-dropdown]';
const TOGGLE = '[data-menu-toggle]';
const DRAWER = 'dialog[data-menu-drawer]';

/** Marks a document this module has already wired. */
const INSTALLED = Symbol.for('@arraypress/menu-astro');

/**
 * Wire every menu in a document. Called for the page's own document when
 * this module loads; tests call it on their own.
 *
 * @param doc The document to wire. Default: the page's.
 * @returns A function that takes every listener off again.
 */
export function install(doc: Document = document): () => void {
	const marked = doc as Document & { [INSTALLED]?: () => void };
	const existing = marked[INSTALLED];
	if (existing) return existing;

	const view = doc.defaultView;
	/** Dropdowns opened by a click or a key, which hover doesn't close. */
	const pinned = new WeakSet<Element>();
	/** Pending hover open/close per dropdown. */
	const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();
	/** The element that opened each drawer, to give focus back to. */
	const openers = new WeakMap<HTMLDialogElement, HTMLElement>();
	/** Each open drawer's `closeAbove` listener, to take off when it closes. */
	const queries = new WeakMap<HTMLDialogElement, () => void>();

	/* ── Dropdowns ─────────────────────────────────────────────── */

	const toggleOf = (dropdown: Element): HTMLElement | null =>
		dropdown.querySelector<HTMLElement>(TOGGLE);

	const panelOf = (dropdown: Element): HTMLElement | null => {
		const id = toggleOf(dropdown)?.getAttribute('aria-controls');
		return id ? doc.getElementById(id) : null;
	};

	const isOpen = (dropdown: Element): boolean => dropdown.hasAttribute('data-open');

	const clearTimer = (dropdown: Element): void => {
		const timer = timers.get(dropdown);
		if (timer !== undefined) clearTimeout(timer);
		timers.delete(dropdown);
	};

	const announce = (target: Element, open: boolean): void => {
		target.dispatchEvent(new (view?.CustomEvent ?? CustomEvent)('menu:toggle', { bubbles: true, detail: { open } }));
	};

	const close = (dropdown: Element, returnFocus = false): void => {
		clearTimer(dropdown);
		pinned.delete(dropdown);
		if (!isOpen(dropdown)) return;
		const toggle = toggleOf(dropdown);
		dropdown.removeAttribute('data-open');
		panelOf(dropdown)?.removeAttribute('data-open');
		toggle?.setAttribute('aria-expanded', 'false');
		if (returnFocus) toggle?.focus();
		announce(dropdown, false);
	};

	const openDropdowns = (): Element[] => Array.from(doc.querySelectorAll(`${DROPDOWN}[data-open]`));

	const closeAll = (except?: Element): void => {
		for (const dropdown of openDropdowns()) if (dropdown !== except) close(dropdown);
	};

	const open = (dropdown: Element, pin: boolean): void => {
		clearTimer(dropdown);
		closeAll(dropdown);
		if (pin) pinned.add(dropdown);
		if (isOpen(dropdown)) return;
		dropdown.setAttribute('data-open', '');
		panelOf(dropdown)?.setAttribute('data-open', '');
		toggleOf(dropdown)?.setAttribute('aria-expanded', 'true');
		announce(dropdown, true);
	};

	/** Hover only means something with a mouse on a device that can hover. */
	const isMouse = (event: Event): boolean =>
		(event as PointerEvent).pointerType === 'mouse' &&
		(typeof view?.matchMedia !== 'function' || view.matchMedia('(hover: hover)').matches);

	const onPointerOver = (event: Event): void => {
		if (!isMouse(event)) return;
		const dropdown = (event.target as Element).closest?.(`${DROPDOWN}[data-hover]`);
		if (!dropdown) return;
		clearTimer(dropdown);
		if (!isOpen(dropdown)) {
			timers.set(dropdown, setTimeout(() => open(dropdown, false), HOVER_OPEN_DELAY));
		}
	};

	const onPointerOut = (event: Event): void => {
		if (!isMouse(event)) return;
		const dropdown = (event.target as Element).closest?.(`${DROPDOWN}[data-hover]`);
		const next = (event as PointerEvent).relatedTarget as Node | null;
		if (!dropdown || (next && dropdown.contains(next))) return;
		clearTimer(dropdown);
		if (isOpen(dropdown) && !pinned.has(dropdown)) {
			timers.set(dropdown, setTimeout(() => close(dropdown), HOVER_CLOSE_DELAY));
		}
	};

	/* A press outside closes open dropdowns. `pointerdown`, not `click`: iOS
	 * Safari doesn't send clicks from parts of the page that aren't clickable,
	 * so a tap on plain text would leave the panel open. */
	const onPointerDown = (event: Event): void => {
		const target = event.target as Element;
		for (const dropdown of openDropdowns()) if (!dropdown.contains(target)) close(dropdown);
	};

	/* Focus leaving a dropdown for something else on the page closes it.
	 * `relatedTarget` is null when focus goes nowhere — the window losing
	 * focus, or a press on something that can't take it — and those are left
	 * alone: a press outside is handled above, and switching apps shouldn't
	 * close a menu. */
	const onFocusOut = (event: FocusEvent): void => {
		const dropdown = (event.target as Element).closest?.(DROPDOWN);
		const next = event.relatedTarget as Node | null;
		if (!dropdown || !next || dropdown.contains(next)) return;
		close(dropdown);
	};

	/* ── Drawer ─────────────────────────────────────────────────── */

	const openersOf = (dialog: HTMLDialogElement): HTMLElement[] =>
		Array.from(doc.querySelectorAll<HTMLElement>('[data-menu-open]')).filter(
			(el) => el.getAttribute('data-menu-open') === dialog.id
		);

	const openDrawer = (dialog: HTMLDialogElement, opener: HTMLElement): void => {
		if (dialog.open) return;
		closeAll();
		/* The scrollbar disappears when the page stops scrolling; padding out its
		 * width keeps the layout where it was. */
		const root = doc.documentElement;
		const scrollbar = (view?.innerWidth ?? 0) - root.clientWidth;
		root.style.setProperty('--menu-scrollbar', `${Math.max(0, scrollbar)}px`);
		dialog.showModal();
		openers.set(dialog, opener);
		for (const el of openersOf(dialog)) el.setAttribute('aria-expanded', 'true');

		const query = dialog.getAttribute('data-close-above');
		if (query && typeof view?.matchMedia === 'function') {
			const list = view.matchMedia(query);
			const onChange = (): void => {
				if (list.matches) dialog.close();
			};
			list.addEventListener('change', onChange);
			queries.set(dialog, () => list.removeEventListener('change', onChange));
		}
		announce(dialog, true);
	};

	/* `close` doesn't bubble, so it's caught on the way down instead. */
	const onClose = (event: Event): void => {
		const dialog = event.target as HTMLDialogElement;
		if (!(dialog instanceof (view?.HTMLDialogElement ?? HTMLDialogElement)) || !dialog.matches(DRAWER)) return;
		queries.get(dialog)?.();
		queries.delete(dialog);
		doc.documentElement.style.removeProperty('--menu-scrollbar');
		for (const el of openersOf(dialog)) el.setAttribute('aria-expanded', 'false');
		/* Browsers return focus on close themselves; this covers the ones that
		 * don't, and never scrolls — a drawer link to `#section` has just moved
		 * the page there. */
		const opener = openers.get(dialog);
		openers.delete(dialog);
		const active = doc.activeElement;
		if (opener?.isConnected && (!active || active === doc.body || dialog.contains(active))) {
			opener.focus({ preventScroll: true });
		}
		announce(dialog, false);
	};

	/* ── Clicks and keys ───────────────────────────────────────── */

	const onClick = (event: MouseEvent): void => {
		const target = event.target as Element;
		if (!target?.closest) return;

		const opener = target.closest<HTMLElement>('[data-menu-open]');
		if (opener) {
			const dialog = doc.getElementById(opener.getAttribute('data-menu-open') ?? '');
			if (dialog instanceof (view?.HTMLDialogElement ?? HTMLDialogElement)) openDrawer(dialog, opener);
			return;
		}

		const drawer = target.closest<HTMLDialogElement>(DRAWER);
		if (drawer) {
			/* The dialog itself is only ever the target on its backdrop: the panel
			 * inside covers the rest. */
			if (target === drawer || target.closest('[data-menu-close]') || target.closest('a[href]')) {
				drawer.close();
			}
			return;
		}

		const toggle = target.closest(TOGGLE);
		const dropdown = toggle?.closest(DROPDOWN);
		if (dropdown) {
			if (isOpen(dropdown) && pinned.has(dropdown)) close(dropdown);
			else open(dropdown, true);
			return;
		}

		/* Following a link in a panel — to `#pricing` on this page, say. */
		if (target.closest('a[href]') && target.closest(DROPDOWN)) closeAll();
	};

	const onKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape' && event.key !== 'Esc') return;
		const open = openDropdowns();
		if (!open.length) return;
		const active = doc.activeElement;
		for (const dropdown of open) close(dropdown, !!active && dropdown.contains(active));
	};

	doc.addEventListener('click', onClick);
	doc.addEventListener('keydown', onKeyDown);
	doc.addEventListener('pointerdown', onPointerDown);
	doc.addEventListener('pointerover', onPointerOver);
	doc.addEventListener('pointerout', onPointerOut);
	doc.addEventListener('focusout', onFocusOut);
	doc.addEventListener('close', onClose, true);

	const uninstall = (): void => {
		doc.removeEventListener('click', onClick);
		doc.removeEventListener('keydown', onKeyDown);
		doc.removeEventListener('pointerdown', onPointerDown);
		doc.removeEventListener('pointerover', onPointerOver);
		doc.removeEventListener('pointerout', onPointerOut);
		doc.removeEventListener('focusout', onFocusOut);
		doc.removeEventListener('close', onClose, true);
		delete marked[INSTALLED];
	};
	marked[INSTALLED] = uninstall;
	return uninstall;
}

if (typeof document !== 'undefined') install(document);
