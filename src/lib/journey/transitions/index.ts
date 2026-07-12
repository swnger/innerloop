import type { StationTransition } from '../types';
import { t12 } from './t12-prompt-to-tokens';
import { t23 } from './t23-tokens-to-context';
import { t34 } from './t34-context-to-model';
import { t45 } from './t45-response-to-harness';
import { t56 } from './t56-band-returns';
import { t67 } from './t67-packed-call';
import { t71 } from './t71-loop-close';

export const transitions: Record<string, StationTransition> = {
	t12,
	t23,
	t34,
	t45,
	t56,
	t67,
	t71,
};
