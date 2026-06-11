/* ============================================================
   Illustrative BPE-style tokenizer — NOT a production tokenizer.
   A hand-curated vocabulary stands in for one learned from data,
   but the behaviors it shows are real: leading spaces travel
   inside tokens, common words are single tokens, rare words
   shatter into sub-word pieces, and digits chunk in groups.
============================================================ */

export type Token = { text: string; id: number };

/* GPT-2-style pre-tokenization: contractions, optional leading
   space glued to words / numbers / punctuation, whitespace runs. */
const PRE =
	/'(?:s|t|re|ve|m|ll|d)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

const MAX_SUB = 12;

/* Whole words common enough to have earned their own token. */
const WORDS = new Set(
	(
		'the of and a to in is you that it he was for on are as with his they i at be this ' +
		'have from or one had by word but not what all were we when your can said there use ' +
		'an each which she do how their if will up other about out many then them these so ' +
		'some her would make like him into time has look two more write go see number no way ' +
		'could people my than first water been call who oil its now find long down day did get ' +
		'come made may part over new sound take only little work know place year live me back ' +
		'give most very after thing our just name good sentence man think say great where help ' +
		'through much before line right too mean old any same tell boy follow came want show ' +
		'also around form three small set put end does another well large must big even such ' +
		'because turn here why ask went men read need land different home us move try kind hand ' +
		'picture again change off play spell air away animal house point page letter mother ' +
		'answer found study still learn should world high every near add food between own below ' +
		'country plant last school father keep tree never start city earth eye light thought ' +
		'head under story saw left dont few while along might close something seem next hard ' +
		'open example begin life always those both paper together got group often run fix test ' +
		'fox quick brown lazy dog cat jump day days week month year hello yes none ' +
		'model agent token tokens context window tool tools loop code file files error ' +
		'second seconds minute hour price total item items user input output data list ' +
		'const let var function return import export class def print if else for while true ' +
		'false null async await new this type case break filter map'
	).split(/\s+/)
);

/* Sub-word pieces, matched greedily longest-first. Curated so the
   demo words split the way real tokenizers tend to split them. */
const SUBWORDS = new Set([
	// suffixes
	'ing', 'ed', 'er', 'ers', 'est', 'ly', 's', 'es', 'tion', 'ation', 'ization',
	'ment', 'ness', 'able', 'ible', 'ous', 'ful', 'less', 'ish', 'ize', 'ise',
	'ity', 'ive', 'al', 'ic', 'ical', 'ist', 'ism', 'ant', 'ent', 'ence', 'ance',
	'ship', 'hood', 'ward', 'wise', 'ology', 'ography',
	// prefixes
	'un', 'pre', 'dis', 'mis', 'non', 'sub', 'inter', 'anti', 'auto', 'micro',
	'multi', 'super', 'trans', 'semi', 'mid', 'over', 'under', 'out', 'extra',
	// roots & common chunks
	'token', 'break', 'build', 'count', 'fail', 'fix', 'light', 'work', 'play',
	'read', 'writ', 'walk', 'talk', 'think', 'jump', 'look', 'call', 'turn',
	'hous', 'berry', 'raw', 'st', 'bene', 'dict', 'cumber', 'batch', 'stan',
	'donau', 'dampf', 'schiff', 'fahrts', 'fahrt', 'gesell', 'schaft', 'land',
	'graph', 'phone', 'photo', 'scope', 'meter', 'ground', 'water', 'fire',
	'agent', 'sera', 'second', 'item', 'engine', 'eer', 'soft', 'ware', 'hard',
	'web', 'site', 'page', 'base', 'line', 'point', 'mark', 'down', 'load',
	'up', 'set', 'get', 'put', 'post', 'hash', 'tag', 'name', 'space', 'time',
	'stamp', 'pass', 'sword', 'log', 'sign', 'launch', 'flew', 'fly',
	// common bigrams/trigrams so anything segments (worst case: letters)
	'th', 'he', 'in', 'en', 'nt', 're', 'er', 'an', 'ti', 'es', 'on', 'at',
	'se', 'nd', 'or', 'ar', 'al', 'te', 'co', 'de', 'to', 'ra', 'et', 'ng',
	'lo', 'le', 'is', 'ou', 'of', 'it', 'ne', 'ta', 'la', 'me', 'ro', 'no',
	'io', 'ic', 'ck', 'sh', 'ch', 'gh', 'ph', 'qu', 'wh', 'tr', 'pl', 'gr',
	'br', 'fr', 'bl', 'cl', 'fl', 'sl', 'sp', 'sc', 'sk', 'sm', 'sn', 'sw',
	'ow', 'oo', 'ee', 'ea', 'ai', 'ay', 'oy', 'ur', 'ir', 'aw', 'ew', 'um',
	'us', 'ut', 'ot', 'ent', 'and', 'ion', 'for', 'her', 'ter', 'hat', 'tha',
	'ere', 'ate', 'his', 'con', 'res', 'ver', 'all', 'ons', 'ria', 'ome'
]);

/* Deterministic fake ID — a lookup index, not a meaning. FNV-1a. */
export function idFor(piece: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < piece.length; i++) {
		h ^= piece.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (Math.abs(h) % 49000) + 256;
}

function chunkDigits(body: string, space: string): string[] {
	const parts: string[] = [];
	for (let i = 0; i < body.length; i += 3) parts.push(body.slice(i, i + 3));
	parts[0] = space + parts[0];
	return parts;
}

function segmentWord(body: string, space: string): string[] {
	const lower = body.toLowerCase();
	if (WORDS.has(lower)) return [space + body];
	const parts: string[] = [];
	let i = 0;
	while (i < lower.length) {
		let n = Math.min(MAX_SUB, lower.length - i);
		while (n > 1 && !SUBWORDS.has(lower.slice(i, i + n))) n--;
		parts.push(body.slice(i, i + n));
		i += n;
	}
	parts[0] = space + parts[0];
	return parts;
}

function splitPiece(piece: string): string[] {
	const space = piece.startsWith(' ') && piece.length > 1 ? ' ' : '';
	const body = space ? piece.slice(1) : piece;
	if (/^\s+$/.test(piece)) return [piece];
	if (/^\p{N}+$/u.test(body)) return chunkDigits(body, space);
	if (/^\p{L}+$/u.test(body)) return segmentWord(body, space);
	return [piece]; // punctuation runs, contractions
}

export function tokenize(text: string): Token[] {
	const out: Token[] = [];
	for (const piece of text.match(PRE) ?? []) {
		for (const part of splitPiece(piece)) out.push({ text: part, id: idFor(part) });
	}
	return out;
}

/* Render whitespace visibly: leading space as a mid-dot, newlines/tabs as glyphs. */
export function display(text: string): string {
	if (/^\s+$/.test(text)) {
		return text.replace(/ /g, '·').replace(/\n/g, '⏎').replace(/\t/g, '⇥');
	}
	return text.replace(/^ /, '·').replace(/\n/g, '⏎').replace(/\t/g, '⇥');
}
