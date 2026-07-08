export type StationId =
	| "agent-loop"
	| "context"
	| "tokenization"
	| "inference"
	| "context-revisit"
	| "tools"
	| "recap";

export type InterstitialId = "repeat-pass";
export type WorldStopId = StationId | InterstitialId;
export type LoopNodeId = "agent" | "window" | "tokens" | "model" | "tools";
export type LoopGlyph = LoopNodeId | "loop";
export type LoopHue = "blue" | "violet" | "red";
export type LoopDirection = "right" | "left" | "down";

export type Station = {
	id: StationId;
	label: string;
	node: LoopNodeId;
};

export type LoopStop =
	| {
			kind: "station";
			id: StationId;
			label: string;
			node: LoopNodeId;
			column: 0 | 1 | 2 | 3;
			row: 0 | 1;
			chapterNumber?: "01" | "02" | "03" | "04" | "05";
			dwellMs?: number;
			mapLabel?: string;
	  }
	| {
			kind: "interstitial";
			id: InterstitialId;
			label: string;
			column: 0 | 1 | 2 | 3;
			row: 0 | 1;
			dwellMs?: number;
	  };

export type FallbackTransition = {
	from: LoopGlyph;
	to: LoopGlyph;
	fromLabel: string;
	toLabel: string;
	direction: LoopDirection;
	hue: LoopHue;
	chip: string;
	kicker: string;
	caption: string;
};

export type HandoffContract = {
	id: "context-tools-band-to-tool-schema";
	sourceStop: "context-revisit";
	sourcePanelSelector: "[data-handoff=\"revisit-panel\"]";
	sourceSelector: "[data-handoff=\"tool-definitions-band\"]";
	targetStop: "tools";
	targetSelector: "[data-handoff-target=\"tool-schema-body\"]";
};

export type LoopLeg = {
	id: `${WorldStopId}->${WorldStopId}`;
	from: WorldStopId;
	to: WorldStopId;
	hue: LoopHue;
	carrier: string;
	kicker: string;
	enhancedText: string;
	fallback: FallbackTransition | null;
	handoff?: HandoffContract;
	carrierScale?: number;
	captionOut?: number;
};

export type MinimapNode = {
	id: StationId;
	node: LoopNodeId;
	cx: number;
	cy: number;
	r: number;
	name: string;
};

export type MinimapEdge = {
	from: WorldStopId;
	to: WorldStopId;
	d: string;
	hue: LoopHue;
};

export const LOOP_STOPS = [
	{ kind: "station", id: "agent-loop", label: "the agent", node: "agent", column: 0, row: 0, chapterNumber: "01" },
	{ kind: "station", id: "context", label: "context window", node: "window", column: 1, row: 0, chapterNumber: "02", dwellMs: 2600 },
	{ kind: "station", id: "tokenization", label: "tokenization", node: "tokens", column: 2, row: 0, chapterNumber: "03" },
	{ kind: "station", id: "inference", label: "inference", node: "model", column: 3, row: 0, chapterNumber: "04" },
	{ kind: "station", id: "context-revisit", label: "context again", mapLabel: "context window · again", node: "window", column: 3, row: 1 },
	{ kind: "station", id: "tools", label: "tool calling", node: "tools", column: 2, row: 1, chapterNumber: "05" },
	{ kind: "interstitial", id: "repeat-pass", label: "model called again", column: 1, row: 1, dwellMs: 560 },
	{ kind: "station", id: "recap", label: "the whole loop", node: "agent", column: 0, row: 1 }
] as const satisfies readonly LoopStop[];

export const HANDOFFS = {
	contextToolsBandToToolSchema: {
		id: "context-tools-band-to-tool-schema",
		sourceStop: "context-revisit",
		sourcePanelSelector: "[data-handoff=\"revisit-panel\"]",
		sourceSelector: "[data-handoff=\"tool-definitions-band\"]",
		targetStop: "tools",
		targetSelector: "[data-handoff-target=\"tool-schema-body\"]"
	}
} as const satisfies Record<string, HandoffContract>;

export const LOOP_LEGS = [
	{
		id: "agent-loop->context",
		from: "agent-loop",
		to: "context",
		hue: "blue",
		carrier: "your message",
		kicker: "first stop",
		enhancedText: "The agent appends your message. The next box is the pile it sends to the model.",
		fallback: {
			from: "agent",
			to: "window",
			fromLabel: "the agent",
			toLabel: "the context window",
			direction: "right",
			hue: "blue",
			chip: "your message",
			kicker: "first stop",
			caption:
				"The agent just appended your message to its context. Time to open that box: the pile is called the context window, and it is the model’s entire world."
		}
	},
	{
		id: "context->tokenization",
		from: "context",
		to: "tokenization",
		hue: "blue",
		carrier: "whole window",
		kicker: "toward the model",
		enhancedText: "The whole window travels together — but the model does not read words yet.",
		fallback: {
			from: "window",
			to: "tokens",
			fromLabel: "the context window",
			toLabel: "tokenization",
			direction: "right",
			hue: "blue",
			chip: "the whole window",
			kicker: "toward the model",
			caption:
				"The whole window is on its way to the model. One catch — the model can’t read words. First, everything becomes tokens."
		}
	},
	{
		id: "tokenization->inference",
		from: "tokenization",
		to: "inference",
		hue: "blue",
		carrier: "token ids",
		kicker: "into the machine",
		enhancedText: "Token IDs enter the model. Now it reads, weighs, and predicts one piece.",
		fallback: {
			from: "tokens",
			to: "model",
			fromLabel: "tokenization",
			toLabel: "the model",
			direction: "down",
			hue: "blue",
			chip: "token ids",
			kicker: "into the machine",
			caption:
				"The tokens are inside. Now the model does the only thing it ever does: read them all, weigh them, and guess what comes next."
		},
		carrierScale: 1.14
	},
	{
		id: "inference->context-revisit",
		from: "inference",
		to: "context-revisit",
		hue: "violet",
		carrier: "response",
		kicker: "the reply returns",
		enhancedText: "A predicted reply is not memory. The agent writes it back into the window.",
		fallback: {
			from: "model",
			to: "window",
			fromLabel: "the model",
			toLabel: "the window, again",
			direction: "left",
			hue: "violet",
			chip: "response",
			kicker: "the reply returns",
			caption:
				"Those predicted tokens stream back to the agent — and land in the context window, stacked on top of everything you already know is there."
		}
	},
	{
		id: "context-revisit->tools",
		from: "context-revisit",
		to: "tools",
		hue: "violet",
		carrier: "tool call",
		kicker: "text meets the world",
		enhancedText: "The model can only request a tool. The harness is what actually runs it.",
		fallback: {
			from: "window",
			to: "tools",
			fromLabel: "the window, again",
			toLabel: "tool calling",
			direction: "left",
			hue: "violet",
			chip: "tool call",
			kicker: "text meets the world",
			caption:
				"That reply names a tool. But the model can only ever write text — so who actually runs the command?"
		},
		handoff: HANDOFFS.contextToolsBandToToolSchema
	},
	{
		id: "tools->repeat-pass",
		from: "tools",
		to: "repeat-pass",
		hue: "red",
		carrier: "tool output",
		kicker: "one more pass",
		enhancedText: "Tool output is appended, then the model is called again with the updated window.",
		fallback: null
	},
	{
		id: "repeat-pass->recap",
		from: "repeat-pass",
		to: "recap",
		hue: "red",
		carrier: "final answer",
		kicker: "zoom out",
		enhancedText: "The second pass returns the answer. The camera pulls back so the loop reads as one system.",
		fallback: {
			from: "tools",
			to: "loop",
			fromLabel: "tool calling",
			toLabel: "the whole loop",
			direction: "right",
			hue: "red",
			chip: "tool output",
			kicker: "closing the lap",
			caption:
				"The tool’s output is appended and the model is called again — the second pass returns your answer. That’s the full lap. Watch it run whole."
		},
		captionOut: 0.92
	}
] as const satisfies readonly LoopLeg[];

export const LEG_PHASES = {
	carrierIn: 0.16,
	carrierTravel: 0.68,
	carrierOut: 0.82,
	captionIn: 0.18,
	captionOut: 0.8
} as const;

export const STOP_DWELL_MS = 420;

export const STATIONS = (LOOP_STOPS as readonly LoopStop[]).filter((stop): stop is Extract<LoopStop, { kind: "station" }> => stop.kind === "station")
	.map((stop) => ({ id: stop.id, label: stop.mapLabel ?? stop.label, node: stop.node })) satisfies readonly Station[];

export const stationIds = new Set<StationId>(STATIONS.map((station) => station.id));
export const stopIds = new Set<WorldStopId>(LOOP_STOPS.map((stop) => stop.id));
export const legAfter = (id: WorldStopId) => LOOP_LEGS.find((leg) => leg.from === id);

export const stationById = Object.fromEntries(
	STATIONS.map((station) => [station.id, LOOP_STOPS.find((stop) => stop.kind === "station" && stop.id === station.id)])
) as Record<StationId, Extract<LoopStop, { kind: "station" }>>;

export function chapterNumberFor(id: StationId): NonNullable<Extract<LoopStop, { kind: "station" }>["chapterNumber"]> {
	const chapterNumber = stationById[id].chapterNumber;
	if (!chapterNumber) throw new Error(`loopPath: missing chapter number for ${id}`);
	return chapterNumber;
}

export const MINIMAP_VIEWBOX = "0 0 156 66";
export const MINIMAP_WIDTH = 160;
export const MINIMAP_HEIGHT = 68;
export const MINIMAP_ARIA_LABEL = "Loop map: agent, context window, tokenization, inference, context revisit, tool calling, recap";

export const MINIMAP_EDGES = [
	{ from: "agent-loop", to: "context", d: "M 22 16 H 52", hue: "blue" },
	{ from: "context", to: "tokenization", d: "M 68 16 H 88", hue: "blue" },
	{ from: "tokenization", to: "inference", d: "M 104 16 H 134", hue: "blue" },
	{ from: "inference", to: "context-revisit", d: "M 142 24 V 42", hue: "violet" },
	{ from: "context-revisit", to: "tools", d: "M 134 50 H 104", hue: "violet" },
	{ from: "tools", to: "repeat-pass", d: "M 88 50 H 68", hue: "red" },
	{ from: "repeat-pass", to: "recap", d: "M 52 50 H 22", hue: "red" }
] as const satisfies readonly MinimapEdge[];

export const MINIMAP_NODES = [
	{ id: "agent-loop", node: "agent", cx: 14, cy: 16, r: 4.5, name: "The agent — start of the loop" },
	{ id: "context", node: "window", cx: 60, cy: 16, r: 4.5, name: "The context window" },
	{ id: "tokenization", node: "tokens", cx: 96, cy: 16, r: 3.5, name: "Tokenization" },
	{ id: "inference", node: "model", cx: 142, cy: 16, r: 4.5, name: "Inference — the model" },
	{ id: "context-revisit", node: "window", cx: 142, cy: 50, r: 4.5, name: "The context window revisited" },
	{ id: "tools", node: "tools", cx: 96, cy: 50, r: 4.5, name: "Tool calling" },
	{ id: "recap", node: "agent", cx: 14, cy: 50, r: 4.5, name: "The whole loop recap" }
] as const satisfies readonly MinimapNode[];

export function assertLoopPath(): void {
	const seen = new Set<WorldStopId>();
	for (const stop of LOOP_STOPS) {
		if (seen.has(stop.id)) throw new Error(`loopPath: duplicate stop id ${stop.id}`);
		seen.add(stop.id);
	}

	const stationStops = LOOP_STOPS.filter((stop) => stop.kind === "station");
	for (const stop of stationStops) {
		if (STATIONS.filter((station) => station.id === stop.id).length !== 1) {
			throw new Error(`loopPath: duplicate stop id ${stop.id} in STATIONS`);
		}
	}
	if (STATIONS.length !== stationStops.length) {
		throw new Error(`loopPath: duplicate stop id count mismatch in STATIONS`);
	}

	for (const leg of LOOP_LEGS) {
		if (!seen.has(leg.from)) throw new Error(`loopPath: invalid leg endpoint ${leg.from}`);
		if (!seen.has(leg.to)) throw new Error(`loopPath: invalid leg endpoint ${leg.to}`);
	}

	if (LOOP_LEGS.length !== LOOP_STOPS.length - 1) {
		throw new Error(`loopPath: leg order mismatch (${LOOP_LEGS.length} legs for ${LOOP_STOPS.length} stops)`);
	}
	for (let index = 0; index < LOOP_LEGS.length; index++) {
		const leg = LOOP_LEGS[index];
		if (leg.from !== LOOP_STOPS[index].id || leg.to !== LOOP_STOPS[index + 1].id) {
			throw new Error(`loopPath: leg order mismatch at ${index} (${leg.id})`);
		}
	}

	const glyphs: Record<string, true> = { agent: true, window: true, tokens: true, model: true, tools: true, loop: true };
	for (const leg of LOOP_LEGS) {
		if (!leg.fallback) continue;
		if (!glyphs[leg.fallback.from]) throw new Error(`loopPath: invalid fallback glyph ${leg.fallback.from}`);
		if (!glyphs[leg.fallback.to]) throw new Error(`loopPath: invalid fallback glyph ${leg.fallback.to}`);
	}

	for (const handoff of Object.values(HANDOFFS)) {
		if (!seen.has(handoff.sourceStop)) throw new Error(`loopPath: invalid handoff stop ${handoff.sourceStop}`);
		if (!seen.has(handoff.targetStop)) throw new Error(`loopPath: invalid handoff stop ${handoff.targetStop}`);
	}

	const finitePositive = (value: number) => Number.isFinite(value) && value > 0;
	for (const leg of LOOP_LEGS as readonly LoopLeg[]) {
		if (leg.carrierScale !== undefined && !finitePositive(leg.carrierScale)) {
			throw new Error(`loopPath: invalid leg choreography carrierScale on ${leg.id}`);
		}
		if (leg.captionOut !== undefined && (!finitePositive(leg.captionOut) || leg.captionOut >= 1)) {
			throw new Error(`loopPath: invalid leg choreography captionOut on ${leg.id}`);
		}
	}
	for (const stop of LOOP_STOPS as readonly LoopStop[]) {
		if (stop.dwellMs !== undefined && !finitePositive(stop.dwellMs)) {
			throw new Error(`loopPath: invalid leg choreography dwellMs on ${stop.id}`);
		}
	}

	if (MINIMAP_NODES.length !== stationStops.length) {
		throw new Error(`loopPath: minimap node mismatch (${MINIMAP_NODES.length} nodes for ${stationStops.length} station stops)`);
	}
	for (const stop of stationStops) {
		if (MINIMAP_NODES.filter((node) => node.id === stop.id).length !== 1) {
			throw new Error(`loopPath: minimap node mismatch for ${stop.id}`);
		}
	}
	for (const node of MINIMAP_NODES) {
		if (!stationIds.has(node.id)) throw new Error(`loopPath: minimap node mismatch ${node.id}`);
	}

	for (const edge of MINIMAP_EDGES) {
		if (!seen.has(edge.from)) throw new Error(`loopPath: minimap edge mismatch ${edge.from}`);
		if (!seen.has(edge.to)) throw new Error(`loopPath: minimap edge mismatch ${edge.to}`);
	}
	if (MINIMAP_EDGES.length !== LOOP_LEGS.length) {
		throw new Error(`loopPath: minimap edge mismatch (${MINIMAP_EDGES.length} edges for ${LOOP_LEGS.length} legs)`);
	}
	for (let index = 0; index < MINIMAP_EDGES.length; index++) {
		const edge = MINIMAP_EDGES[index];
		const leg = LOOP_LEGS[index];
		if (edge.from !== leg.from || edge.to !== leg.to || edge.hue !== leg.hue) {
			throw new Error(`loopPath: minimap edge mismatch at ${index} (${leg.id})`);
		}
	}
}

assertLoopPath();
