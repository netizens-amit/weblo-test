// backend/src/prompts/sections/artifact-instructions.ts
// Defines how the AI should create files and artifacts - BOLT.DIY STYLE

const stripIndents = (strings: TemplateStringsArray, ...values: any[]): string => {
   let result = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''), '');
   const lines = result.split('\n');
   const minIndent = lines.filter(l => l.trim()).reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1]?.length || 0), Infinity);
   return (minIndent !== Infinity && minIndent > 0 ? lines.map(l => l.slice(minIndent)).join('\n') : result).trim();
};

export const getArtifactInstructions = (workingDirectory: string): string => stripIndents`
<artifact_instructions>
  ═══════════════════════════════════════════════════════════════════
  CRITICAL PRE-GENERATION THINKING - DO THIS BEFORE WRITING ANY CODE:
  ═══════════════════════════════════════════════════════════════════

  1. THINK HOLISTICALLY about the ENTIRE project structure
  2. LIST ALL components you will create
  3. VERIFY every import in App.jsx has a corresponding file
  4. VERIFY every icon used has an import statement
  5. VERIFY package.json includes ALL dependencies you use

  Working Directory: ${workingDirectory}

  ═══════════════════════════════════════════════════════════════════
  FILE CREATION ORDER - FOLLOW THIS EXACT SEQUENCE:
  ═══════════════════════════════════════════════════════════════════

  1. package.json        (FIRST - contains all dependencies)
  2. vite.config.js      (Configuration)
  3. tailwind.config.js  (Configuration)
  4. postcss.config.js   (Configuration)
  5. index.html          (Entry HTML)
  6. src/index.css       (Global styles with @tailwind)
  7. src/main.jsx        (React entry point)
  8. src/components/*.jsx  (ALL component files - create EVERY component)
  9. src/App.jsx         (LAST - imports all components)

  ═══════════════════════════════════════════════════════════════════
  MANDATORY FILE CONTENT RULES:
  ═══════════════════════════════════════════════════════════════════

  ✓ ALWAYS: Provide FULL, COMPLETE file contents - never truncate
  ✓ ALWAYS: Include ALL imports at the top of files
  ✓ ALWAYS: Include export default at the bottom of components
  ✓ ALWAYS: Use lucide-react for ALL icons with proper imports
  ✓ ALWAYS: Create REAL, functional component content (not placeholders)
  
  ✗ NEVER: Use placeholders like "// rest of code..."
  ✗ NEVER: Import files you haven't created
  ✗ NEVER: Use icons without importing them first
  ✗ NEVER: Create empty or stub components
  ✗ NEVER: Start dev server or run npm commands
  ✗ NEVER: Create binary files or base64 content

  ═══════════════════════════════════════════════════════════════════
  COMPONENT FILE TEMPLATE - EVERY COMPONENT MUST FOLLOW THIS:
  ═══════════════════════════════════════════════════════════════════

  // src/components/ExampleComponent.jsx
  
  import { Icon1, Icon2 } from 'lucide-react';  // ← REQUIRED if using icons

  function ExampleComponent() {
    return (
      <section className="py-16 bg-white">
        {/* Real, complete content here */}
      </section>
    );
  }

  export default ExampleComponent;  // ← REQUIRED at end of file

  ═══════════════════════════════════════════════════════════════════
  IMPORT VERIFICATION CHECKLIST - RUN BEFORE COMPLETING:
  ═══════════════════════════════════════════════════════════════════

  For every import in App.jsx like:
    import Header from './components/Header';
  
  You MUST have created the file:
    src/components/Header.jsx

  For every icon reference like:
    <Menu className="h-6 w-6" />
  
  You MUST have the import:
    import { Menu } from 'lucide-react';

  ═══════════════════════════════════════════════════════════════════
  EXAMPLE COMPLETE COMPONENT (Header.jsx):
  ═══════════════════════════════════════════════════════════════════

  import { Menu, X } from 'lucide-react';
  import { useState } from 'react';

  function Header() {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold text-gray-900">Logo</div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-gray-900">Home</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Services</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Contact</a>
            </div>

            <button 
              className="md:hidden p-2"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </header>
    );
  }

  export default Header;

</artifact_instructions>
`;
