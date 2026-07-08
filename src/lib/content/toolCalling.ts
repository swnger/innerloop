export const RUN_SHELL_SCHEMA = [
	"{",
	'  "name": "run_shell",',
	'  "description": "Run a shell command",',
	'  "input_schema": {',
	'    "type": "object",',
	'    "properties": {',
	'      "command": {',
	'        "type": "string"',
	"      }",
	"    },",
	'    "required": ["command"]',
	"  }",
	"}"
];

export const RUN_SHELL_CALL = [
	"{",
	'  "name": "run_shell",',
	'  "input": { "command": "pytest -q" }',
	"}"
];

export type Lit = "agent" | "llm" | "machine" | "both";
export type Accent = "cool" | "warm" | "brand" | "tools";
export type Stage = {
	k: string;
	title: string;
	body: string;
	dir: "in" | "out" | "down" | null;
	lit: Lit;
	cardLabel: string;
	accent: Accent;
	card: string[];
	note: string;
	valid?: boolean;
	boundary?: boolean;
};

export const TOOL_STAGES: Stage[] = [
	{
		k: "the menu",
		title: "First, the model is handed a menu",
		body: "Before the turn, every tool is described to the model as a JSON schema — a name, what it does, and the contract its arguments must satisfy. This menu rides along in the context window, sent on every call.",
		dir: "in",
		lit: "llm",
		cardLabel: "TOOL DEFINITION · part of the context",
		accent: "tools",
		card: RUN_SHELL_SCHEMA,
		note: "the model never saw your machine — only this description of it"
	},
	{
		k: "it writes a tool call",
		title: "The model writes a tool call — as text",
		body: "It does the only thing it can do: predict tokens. Here those tokens spell a small, structured block naming a tool and its arguments. Nothing has run. The text matches the schema contract.",
		dir: "out",
		lit: "llm",
		cardLabel: "MODEL OUTPUT · just predicted tokens",
		accent: "warm",
		card: RUN_SHELL_CALL,
		note: 'a "tool call" is not an action — it is a request, written in text'
	},
	{
		k: "the agent reads it",
		title: "The agent reads and checks it",
		body: "The harness — your code, not the model — recognises the block, parses the JSON, and validates it against the schema. The model has stopped; the loop has the wheel now.",
		dir: null,
		lit: "agent",
		cardLabel: "AGENT · parse + validate against schema",
		accent: "brand",
		card: [
			"{",
			'  "name": "run_shell",',
			'  "input": { "command": "pytest -q" }',
			"}",
			"",
			"✓ valid · matches run_shell schema"
		],
		note: "the agent is the interpreter — it decides what the text means",
		valid: true
	},
	{
		k: "the agent runs it",
		title: "The agent runs it — on your machine",
		body: "Now the agent actually executes the command: it opens a shell, runs it, reads the output. This is the step the model can never do. The model only emitted text; everything that touches your machine is the harness.",
		dir: "down",
		lit: "machine",
		cardLabel: "YOUR MACHINE · the agent executes",
		accent: "cool",
		card: ["$ pytest -q", "....                       [100%]", "1 passed in 0.42s"],
		note: "the model never crosses this line — it has no shell, no files, no network",
		boundary: true
	},
	{
		k: "the result goes back",
		title: "The result is fed back — as text",
		body: "The agent wraps the output as a tool result and appends it to the context, then calls the model again. To the model it is just more tokens to read, paired to the call it made.",
		dir: "in",
		lit: "llm",
		cardLabel: "TOOL RESULT · appended to the context",
		accent: "cool",
		card: ["{", '  "type": "tool_result",', '  "output": "1 passed in 0.42s"', "}"],
		note: "observe → the loop feeds the world back to the model, in the only format it reads"
	},
	{
		k: "this time, an answer",
		title: "This time it answers — no tool call",
		body: "With the result in context, the model predicts plain text instead of another tool block. The agent sees no tool call, stops looping, and returns the answer to you. Think → act → observe, closed.",
		dir: "out",
		lit: "agent",
		cardLabel: "MODEL OUTPUT · plain text → returned to you",
		accent: "warm",
		card: ['"The test passes now — the bug', ' was a missing null check."'],
		note: "no tool call → the loop ends and the turn returns (Chapter 1)"
	}
];

export const TOOL_ROUTINE_CODE = [
	{ t: "turn(user_message):", head: true },
	{ t: "  context.append(user_message)" },
	{ t: "  while True:", head: true },
	{ t: "    response = LLM(context)" },
	{ t: "    context.append(response)" },
	{ t: "    if not response.has_tool_call:" },
	{ t: "      return response" },
	{ t: "    out = run_tool(response.tool_call)" },
	{ t: "    context.append(out)" }
];

export const TOOL_STAGE_CODE = [
	{ line: 3, zoom: false },
	{ line: 3, zoom: false },
	{ line: 5, zoom: true },
	{ line: 7, zoom: true },
	{ line: 8, zoom: true },
	{ line: 6, zoom: false }
];

export type McpStep = {
	title: string;
	body: string;
	servers: number;
	note: string;
};

export const MCP_STEPS: McpStep[] = [
	{
		title: "Without MCP, tools are wired in by hand",
		body: "Every tool you want the agent to have, you define yourself — name, description, schema — and register it in code. Useful, but it does not scale past a handful.",
		servers: 0,
		note: "a small, hand-picked menu"
	},
	{
		title: "MCP is a standard plug for tools",
		body: "An MCP server advertises a list of tools — each with a name, description, and JSON schema. The agent connects, asks for the list, and registers them all automatically. No bespoke wiring per tool.",
		servers: 2,
		note: "tools/list → schemas register themselves into the context"
	},
	{
		title: "Every tool rides in the window",
		body: "Those schemas land in the tool-definitions layer — which is fixed and re-sent to the model on every single call (Chapter 4). Connect more servers and the layer keeps growing.",
		servers: 4,
		note: "fixed cost · paid on every call, before any of your work"
	},
	{
		title: "So be careful what you plug in",
		body: "A dozen MCP servers can spend thousands of tokens before you have said a word — crowding the budget and pushing toward the limit. And a longer menu makes the model likelier to reach for the wrong tool. Connect deliberately; prune what you do not use.",
		servers: 6,
		note: "attempted 8.3k / 8k → the menu alone is breaching the budget"
	}
];

export const MCP_SERVERS = [
	{ name: "filesystem", tools: 6 },
	{ name: "github", tools: 11 },
	{ name: "postgres", tools: 4 },
	{ name: "slack", tools: 8 },
	{ name: "gmail", tools: 7 },
	{ name: "sentry", tools: 5 }
];

export const MCP_BASE_TOKENS = { system: 450, history: 600, user: 450 };
export const MCP_TOOLDEF_TOKENS = [600, 1700, 3400, 6800];
export const MCP_TOKEN_BUDGET = 8000;
