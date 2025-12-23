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

  7. ⚠️⚠️⚠️ IMPORT COMPLETENESS - STRICT ENFORCEMENT (CRITICAL) ⚠️⚠️⚠️
     
     RULE: EVERY JSX FILE MUST IMPORT EVERY COMPONENT IT USES
     
     This applies to ALL files, not just App.jsx:
     - App.jsx, pages/*.jsx, components/*.jsx - ALL OF THEM
     - If a file uses <Header />, it MUST have: import Header from "..."
     - If a file uses <Hero />, it MUST have: import Hero from "..."
     - NO EXCEPTIONS. Every <ComponentName /> needs an import statement.
     
     EXAMPLES OF VIOLATIONS (will crash):
     
     ❌ BAD - Home.jsx uses components without importing:
        const Home = () => {
          return (
            <div>
              <Hero />        // ❌ WHERE IS THE IMPORT?
              <Services />    // ❌ WHERE IS THE IMPORT?
            </div>
          );
        };
     
     ✅ CORRECT - Home.jsx imports everything it uses:
        import Hero from "../components/Hero";
        import Services from "../components/Services";
        
        const Home = () => {
          return (
            <div>
              <Hero />        // ✅ Imported above
              <Services />    // ✅ Imported above
            </div>
          );
        };
     
     VERIFICATION CHECKLIST (Do this for EVERY JSX file):
     □ Look at every <ComponentName /> in the JSX
     □ For each one, ensure there's a matching import statement
     □ If import is missing, ADD IT at the top of the file
     
  8. FILE CREATION RULES:
     - EVERY import statement MUST have a corresponding file
     - If App.jsx imports "./components/Chart", you MUST create src/components/Chart.jsx
     - If any file imports "./components/X", the file src/components/X.jsx MUST exist
     - NEVER finish generation with unresolved imports
     - CREATE component files BEFORE the files that import them

  9. GENERATION ORDER:
     a) Config files: package.json, vite.config.js, tailwind.config.js, postcss.config.js
     b) Entry files: index.html, src/main.jsx, src/index.css
     c) Components: ALL component files (Chart.jsx, Sidebar.jsx, etc.)
     d) Pages: ALL page files (Home.jsx, About.jsx, etc.) - with proper imports
     e) Main App: src/App.jsx (imports all components/pages - create LAST)

  10. FILE RESTRICTIONS:
      - NEVER create binary files or base64-encoded assets
      - All files must be plain text
      - Reference external URLs for images/fonts
</artifact_instructions>
`;

