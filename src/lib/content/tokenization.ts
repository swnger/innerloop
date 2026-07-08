import { tokenize } from '$lib/tokenizer';

export const TRANSITION_TEXT = 'fix the failing test';
export const TRANSITION_TOKENS = tokenize(TRANSITION_TEXT);

export const TOKENIZATION_LEDE_WORDS =
	'Before anything happens inside the model, your text is chopped into tokens — whole words, word-pieces, punctuation, even spaces — and each piece is swapped for a number. That chopping is the first thing that happens to every message you send.'.split(
		' '
	);

export const TOKENIZATION_PRESETS = [
	{ label: 'plain english', text: 'The quick brown fox jumps over the lazy dog.' },
	{ label: 'a rare name', text: 'Benedict Cumberbatch flew to Kyrgyzstan.' },
	{ label: 'code', text: 'const total = items.filter(x => x.price > 100);' },
	{ label: 'numbers', text: '365.2425 days = 31,556,952 seconds' },
	{ label: 'german', text: 'Donaudampfschifffahrtsgesellschaft' },
	{ label: 'the question', text: "How many r's are in strawberry?" }
];

export const TOKENIZATION_TICKER = [
	'cat',
	'Tuesday',
	'running',
	'iPhone 17',
	'Cumberbatch',
	'yeet',
	'Schifffahrt',
	'doomscrolling',
	'rizz',
	'Kyrgyzstan',
	'(╯°□°)╯',
	'…'
];

export const TOKENIZATION_RECOMBINE = ['unbreakable', 'rebuilding', 'tokenization'].map((word) =>
	tokenize(word)
);

export const TOKENIZATION_GIBBERISH = { word: 'xqzlrp', parts: tokenize('xqzlrp') };

export const TOKENIZATION_NUMBER_LINE_TOKENS = [' cat', ' the', ' straw', ' dog', 'ing', 'berry'];

export const TOKENIZATION_EMBEDDING_WORDS = [
	{ w: 'kittens', x: -0.62, y: -0.18, z: 0.34 },
	{ w: 'and', x: 0.66, y: 0.5, z: -0.45 },
	{ w: 'puppies', x: -0.48, y: -0.36, z: 0.14 },
	{ w: 'play', x: -0.05, y: -0.62, z: -0.42 },
	{ w: 'on', x: 0.5, y: 0.62, z: -0.2 },
	{ w: 'Tuesday', x: 0.6, y: -0.38, z: 0.55 }
];

export const TOKENIZATION_EMBEDDING_GHOSTS = [
	{ w: 'cat', x: -0.55, y: -0.04, z: 0.44 },
	{ w: 'dog', x: -0.38, y: -0.46, z: 0.3 },
	{ w: 'pets', x: -0.72, y: -0.3, z: 0.06 },
	{ w: 'frolic', x: 0.1, y: -0.72, z: -0.28 },
	{ w: 'Friday', x: 0.7, y: -0.52, z: 0.4 },
	{ w: 'weekend', x: 0.44, y: -0.24, z: 0.7 },
	{ w: 'the', x: 0.76, y: 0.4, z: -0.3 }
];

export const TOKENIZATION_EMBEDDING_AXES = [
	{ x: 0.95, y: 0, z: 0, label: 'dim 1' },
	{ x: 0, y: -0.82, z: 0, label: 'dim 2' },
	{ x: 0, y: 0, z: 0.95, label: 'dim 3' }
];

export const STRAWBERRY_TOKENS = tokenize('strawberry');
