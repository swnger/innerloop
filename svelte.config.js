import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * GitHub Pages base path.
 * - Project page (swnger.github.io/innerloop): set BASE_PATH=/innerloop
 * - Custom domain or root user/org site: leave empty.
 * The CI build sets BASE_PATH; local dev defaults to ''.
 */
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		paths: { base },
		prerender: { handleHttpError: 'warn' }
	}
};

export default config;
