/** The navigation both test pages render — every shape a `MenuItem` takes. */
import type { MenuItem } from '../../../../src/types';

export const nav: MenuItem[] = [
	{ label: 'Home', href: '/' },
	{
		label: 'Plugins',
		href: '/plugins/',
		items: [
			{ label: 'Forms', href: '/plugins/forms/', description: 'Build any form' },
			{ label: 'Shop', href: '/plugins/shop/' },
		],
	},
	{
		label: 'Resources',
		items: [
			{ label: 'Docs', href: '/docs/' },
			{ label: 'Pricing', href: '/#pricing' },
		],
	},
	{
		label: 'Products',
		size: 'wide',
		items: [
			{ label: 'Themes', items: [{ label: 'Halftone', href: '/themes/halftone/' }, { label: 'WaveGrid', href: '/themes/wavegrid/' }] },
			{ label: 'Plugins', items: [{ label: 'Forms', href: '/plugins/forms/' }] },
			{ label: 'Sale', href: '/sale/' },
		],
	},
	{ label: 'GitHub', href: 'https://github.com/arraypress', external: true },
];
