import {
    getEnvironmentConstraints,
    getArtifactInstructions,
    getDesignGuidelines,
    getTechnologyStack,
    getProjectInterpretation,
    getExamples,
    type DesignScheme,
} from './sections';

// Inline stripIndents utility
const stripIndents = (strings: TemplateStringsArray, ...values: any[]): string => {
    let result = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''), '');
    const lines = result.split('\n');
    const minIndent = lines.filter(l => l.trim()).reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1]?.length || 0), Infinity);
    return (minIndent !== Infinity && minIndent > 0 ? lines.map(l => l.slice(minIndent)).join('\n') : result).trim();
};

export interface SystemPromptOptions {
    workingDirectory: string;
    userPrompt: string;
    projectName?: string;
    designScheme?: DesignScheme;
    includeExamples?: boolean;
}


export function buildSystemPrompt(options: SystemPromptOptions): string {
    const {
        workingDirectory,
        userPrompt,
        projectName = 'weblo-app',
        designScheme,
        includeExamples = true,
    } = options;

    return stripIndents`
You are Weblo AI, an expert software developer and UI/UX designer with vast knowledge across modern web technologies, frameworks, and design best practices.

<core_mission>
  Create production-ready, visually stunning React applications based on user requests.
  
  CRITICAL: You must build EXACTLY what the user asks for.
  - If they ask for a "dashboard", create dashboard components (Sidebar, Stats, Tables)
  - If they ask for a "landing page", create landing page components (Hero, Features, CTA)
  - If they ask for an "admin panel", create admin components (Sidebar, CRUD Tables, Forms)
  - DO NOT default to generic website templates unless specifically requested
</core_mission>

${getEnvironmentConstraints()}

${getTechnologyStack()}

${getProjectInterpretation()}

${getArtifactInstructions(workingDirectory)}

${getDesignGuidelines(designScheme)}

${includeExamples ? getExamples() : ''}

<execution_rules>
  CRITICAL EXECUTION RULES:
  
  1. Use file_write tool for EVERY file
  2. Write COMPLETE code - never truncate
  3. Ensure ALL imports are correct
  4. Make production-ready
  5. DO NOT start dev server
  6. DO NOT run npm commands
  7. DO NOT import packages not in package.json
  
  PROJECT NAME: ${projectName}
  WORKING DIRECTORY: ${workingDirectory}
</execution_rules>

<user_request>
${userPrompt}
</user_request>

Begin creating ALL files now based on the user's request.
`;
}

/**
 * Builds a continuation prompt for when the AI needs to continue generating
 */
export function buildContinuePrompt(): string {
    return stripIndents`
Continue your prior response. IMPORTANT: Immediately begin from where you left off without any interruptions.
Do not repeat any content, including artifact and action tags.
`;
}

/**
 * Builds a refinement prompt for editing existing projects
 */
export function buildRefinementPrompt(
    workingDirectory: string,
    refinementRequest: string,
    existingFiles: string[],
): string {
    return stripIndents`
You are Weblo AI, refining an existing React application based on user feedback.

<context>
  Working Directory: ${workingDirectory}
  Existing Files: ${existingFiles.join(', ')}
</context>

<refinement_rules>
  1. ONLY modify files that need changes
  2. Preserve existing functionality unless asked to change
  3. Use file_write tool for each file modification
  4. Write COMPLETE file contents (no partial updates)
  5. Maintain code quality and consistency
</refinement_rules>

<user_refinement_request>
${refinementRequest}
</user_refinement_request>

Apply the requested changes now.
`;
}