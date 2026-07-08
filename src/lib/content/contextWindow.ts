export type ContextBandKind = 'fixed' | 'history' | 'user' | 'tool' | 'response';
export type ContextBand = {
	key: string;
	label: string;
	tok: number;
	kind: ContextBandKind;
	fill: string;
	accent: string;
};

// One distinct hue per category so adjacent layers read apart by color.
export const SYSTEM = { accent: 'var(--cat-system)', fill: 'var(--cat-system-fill)' };
export const TOOLS = { accent: 'var(--cat-tools)', fill: 'var(--cat-tools-fill)' };
export const HISTORY = { accent: 'var(--cat-history)', fill: 'var(--cat-history-fill)' };
export const USER = { accent: 'var(--cat-user)', fill: 'var(--cat-user-fill)' };
export const TOOLOUT = { accent: 'var(--cat-tool)', fill: 'var(--cat-tool-fill)' };
export const RESPONSE = { accent: 'var(--warm)', fill: 'var(--cat-response-fill)' };

export const CONTEXT_BANDS = {
	system: { key: 'system', label: 'system prompt', tok: 450, kind: 'fixed', ...SYSTEM },
	tools: { key: 'tools', label: 'tool definitions', tok: 1900, kind: 'fixed', ...TOOLS },
	history: { key: 'history', label: 'conversation history', tok: 650, kind: 'history', ...HISTORY },
	user: { key: 'user', label: 'user input', tok: 450, kind: 'user', ...USER },
	toolout1: { key: 'toolout1', label: 'tool output', tok: 1050, kind: 'tool', ...TOOLOUT },
	response1: { key: 'response1', label: 'model response', tok: 320, kind: 'response', ...RESPONSE },
	toolout2: { key: 'toolout2', label: 'tool output', tok: 1250, kind: 'tool', ...TOOLOUT },
	response2: { key: 'response2', label: 'model response', tok: 360, kind: 'response', ...RESPONSE },
	toolout3: { key: 'toolout3', label: 'tool output', tok: 1200, kind: 'tool', ...TOOLOUT },
	response3: { key: 'response3', label: 'model response', tok: 760, kind: 'response', ...RESPONSE }
} as const satisfies Record<string, ContextBand>;

export type ContextBandKey = keyof typeof CONTEXT_BANDS;

export type ContextStep = {
	title: string;
	body: string;
	bands: readonly ContextBandKey[]; // bottom → top
	highlight: 'all' | readonly ContextBandKey[];
	entered: readonly ContextBandKey[];
	note: string;
	overflow?: boolean;
};

export const CONTEXT_STEPS = [
	{
		title: 'A window, mid-task',
		body: 'Pause the agent halfway through a turn and look at what the model is actually handed. It is this stack — and nothing else. No database, no memory of past chats. Just these layers.',
		bands: ['system', 'tools', 'history', 'user', 'toolout1', 'response1'],
		highlight: 'all',
		entered: [],
		note: 'everything the model can “see” right now'
	},
	{
		title: 'Some of it never changes',
		body: 'The system prompt and the tool definitions sit at the bottom of every window. They are re-sent on every single call — a fixed cost you pay before any of your actual content fits.',
		bands: ['system', 'tools', 'history', 'user', 'toolout1', 'response1'],
		highlight: ['system', 'tools'],
		entered: [],
		note: 'fixed base · re-sent every call'
	},
	{
		title: 'The loop keeps adding',
		body: 'Each turn of the inner loop writes more in: the result of the tool it just ran, then the model’s reply, appended on top. The window is how one step remembers the last.',
		bands: ['system', 'tools', 'history', 'user', 'toolout1', 'response1'],
		highlight: ['toolout1', 'response1'],
		entered: ['response1'],
		note: 'tool result observed → reply appended'
	},
	{
		title: 'It fills up',
		body: 'Do that a few times and the stack climbs toward the line. Every tool result and every reply adds tokens, leaving less room for what comes next.',
		bands: ['system', 'tools', 'history', 'user', 'toolout1', 'response1', 'toolout2', 'response2', 'toolout3'],
		highlight: 'all',
		entered: ['toolout2', 'response2', 'toolout3'],
		note: 'every turn costs more tokens'
	},
	{
		title: 'Past the limit, things fall out',
		body: 'The window is finite. Push past the budget and the oldest content is dropped to make room — the model simply stops being able to see it. That is why a long agent run can “forget” what it did early on.',
		bands: ['system', 'tools', 'user', 'toolout1', 'response1', 'toolout2', 'response2', 'toolout3', 'response3'],
		highlight: 'all',
		entered: ['response3'],
		note: 'attempted 8.4k / 8k → oldest history evicted · 7.7k remains',
		overflow: true
	}
] as const satisfies readonly ContextStep[];

export const CONTEXT_TOKEN_BUDGET = 8000;

export const CONTEXT_LEGEND_KEYS = ['system', 'tools', 'history', 'user', 'toolout1', 'response1'] as const satisfies readonly ContextBandKey[];
