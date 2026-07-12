import type { StationManifestEntry } from './types';

/** Ordered station and transition geometry ledger for the journey loop. */
export const manifest: StationManifestEntry[] = [
	{
		meta: {
			id: 'agent-loop',
			number: 1,
			title: 'The agent loop',
			loopNode: 'user',
			accent: 'user',
			lengthVh: 350,
		},
		exit: { id: 't12', direction: 'right', steps: 1, lengthVh: 100 },
	},
	{
		meta: {
			id: 'tokenization',
			number: 2,
			title: 'Tokenization',
			loopNode: 'context',
			accent: 'history',
			lengthVh: 400,
		},
		exit: { id: 't23', direction: 'right', steps: 1, lengthVh: 100 },
	},
	{
		meta: {
			id: 'context-window',
			number: 3,
			title: 'Context window',
			loopNode: 'context',
			accent: 'history',
			lengthVh: 350,
		},
		exit: { id: 't34', direction: 'down', steps: 1, lengthVh: 100 },
	},
	{
		meta: {
			id: 'inference',
			number: 4,
			title: 'Next-token prediction',
			loopNode: 'llm',
			accent: 'response',
			lengthVh: 450,
		},
		exit: { id: 't45', direction: 'down', steps: 1, lengthVh: 100 },
	},
	{
		meta: {
			id: 'tool-calling',
			number: 5,
			title: 'Tool calling',
			loopNode: 'tool',
			accent: 'tools',
			lengthVh: 450,
		},
		exit: { id: 't56', direction: 'left', steps: 1, lengthVh: 100 },
	},
	{
		meta: {
			id: 'context-engineering',
			number: 6,
			title: 'Context engineering',
			loopNode: 'context',
			accent: 'history',
			lengthVh: 150,
		},
		exit: { id: 't67', direction: 'left', steps: 1, lengthVh: 100 },
	},
	{
		meta: {
			id: 'harness-engineering',
			number: 7,
			title: 'Harness engineering',
			loopNode: 'harness',
			accent: 'system',
			lengthVh: 200,
		},
		exit: { id: 't71', direction: 'up', steps: 2, lengthVh: 200 },
	},
];
