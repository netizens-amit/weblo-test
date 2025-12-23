// backend/src/prompts/sections/artifact-instructions.ts
// Defines how the AI should create files and artifacts

// Simple template literal - no import needed
const stripIndents = (strings: TemplateStringsArray, ...values: any[]): string => {
    let result = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''), '');
    const lines = result.split('\n');
    const minIndent = lines.filter(l => l.trim()).reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1]?.length || 0), Infinity);
    return (minIndent !== Infinity && minIndent > 0 ? lines.map(l => l.slice(minIndent)).join('\n') : result).trim();
};

export const getArtifactInstructions = (workingDirectory: string): string => stripIndents`
<artifact_instructions>
  The AI creates a SINGLE, comprehensive artifact for each project containing:
    - All files to create and their contents
    - Shell commands for dependencies (npm install)
    - Folder structure as needed

  CRITICAL RULES:

  1. THINK HOLISTICALLY before creating:
     - Consider ALL relevant files in the project
     - Review previous file changes and modifications
     - Analyze entire project context and dependencies
     - Anticipate impacts on other parts of the system

  2. Current working directory: ${workingDirectory}

  3. Use file_write tool for EVERY file creation

  4. ALWAYS provide FULL, COMPLETE file contents:
     - Include ALL code, even unchanged parts
     - NEVER use placeholders like "// rest of code..."
     - NEVER truncate or summarize code
     - Show complete, up-to-date file contents

  5. ACTION ORDER MATTERS:
     - Create package.json FIRST (for dependency installation)
     - Create files BEFORE commands that use them
     - Configuration files before initialization
     - DO NOT start dev server (user's environment handles this)

  6. CODE QUALITY:
     - Split functionality into smaller modules
     - Keep files as small as possible
     - Use proper naming conventions
     - Maintain clean, readable code
     - Extract reusable functionality into separate modules

  7. FILE RESTRICTIONS:
     - NEVER create binary files or base64-encoded assets
     - All files must be plain text
     - Reference external URLs for images/fonts
</artifact_instructions>
`;
