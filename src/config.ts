export const SITE = {
	title: 'Lightning Privacy Research',
	description: 'Learn about potential improvements to Lightning to improve privacy',
	defaultLanguage: 'en_US',
};

export const OPEN_GRAPH = {
	image: {
		src: 'https://lightningprivacy.com/social-banner.png',
		alt: 'Lightning with PTLCs'
	},
};

// This is the type of the frontmatter you put in the docs markdown files.
export type Frontmatter = {
	title: string;
	description: string;
	layout: string;
	image?: { src: string; alt: string };
	dir?: 'ltr' | 'rtl';
	ogLocale?: string;
	lang?: string;
};

export const KNOWN_LANGUAGES = {
	English: 'en',
} as const;

export const KNOWN_LANGUAGE_CODES = Object.values(KNOWN_LANGUAGES);

export const GITHUB_EDIT_URL = `https://github.com/BitcoinDevShop/lightning-privacy-research/tree/master`;

export const COMMUNITY_INVITE_URL = `https://github.com/BitcoinDevShop/lightning-privacy-research`;

export type Sidebar = Record<
	typeof KNOWN_LANGUAGE_CODES[number],
	Record<string, { text: string; link: string }[]>
>;

export const SIDEBAR: Sidebar = {
	en: {
		'The Book': [
			{ text: 'Introduction', link: 'en/introduction' },
			{ text: 'Routing Analysis', link: 'en/routing-analysis' },
			{ text: 'Channel Coinjoins', link: 'en/channel-coinjoins' },
			{ text: 'Blinded Paths + Trampoline Routing', link: 'en/blinded-trampoline' },
		],
	},
};
