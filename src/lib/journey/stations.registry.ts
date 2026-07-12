import type { Component } from 'svelte';
import type { SceneProps } from './types';
import AgentLoopScene from '$lib/stations/s01-agent-loop/Scene.svelte';
import TokenizationScene from '$lib/stations/s02-tokenization/Scene.svelte';
import ContextWindowScene from '$lib/stations/s03-context-window/Scene.svelte';
import InferenceScene from '$lib/stations/s04-inference/Scene.svelte';
import ToolCallingScene from '$lib/stations/s05-tool-calling/Scene.svelte';
import ContextEngineeringScene from '$lib/stations/s06-context-engineering/Scene.svelte';
import HarnessEngineeringScene from '$lib/stations/s07-harness-engineering/Scene.svelte';

export const registry: Record<string, Component<SceneProps>> = {
	'agent-loop': AgentLoopScene,
	tokenization: TokenizationScene,
	'context-window': ContextWindowScene,
	inference: InferenceScene,
	'tool-calling': ToolCallingScene,
	'context-engineering': ContextEngineeringScene,
	'harness-engineering': HarnessEngineeringScene
};
