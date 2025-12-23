// backend/src/prompts/index.ts
// Main export for the prompts module

export { buildSystemPrompt, buildContinuePrompt, buildRefinementPrompt, type SystemPromptOptions } from './system-prompt';
export { stripIndents, formatTemplate } from './utils';
export { type DesignScheme } from './sections';