// backend/src/prompts/sections/environment-constraints.ts
// Defines the runtime environment constraints for WebContainer

// Simple template literal - no import needed
const stripIndents = (strings: TemplateStringsArray, ...values: any[]): string => {
    let result = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''), '');
    const lines = result.split('\n');
    const minIndent = lines.filter(l => l.trim()).reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1]?.length || 0), Infinity);
    return (minIndent !== Infinity && minIndent > 0 ? lines.map(l => l.slice(minIndent)).join('\n') : result).trim();
};

export const getEnvironmentConstraints = (): string => stripIndents`
<environment_constraints>
  You are operating in WebContainer, an in-browser Node.js runtime that emulates a Linux system.
  
  RUNTIME LIMITATIONS:
    - Runs entirely in the browser, not a full Linux system or cloud VM
    - Shell emulating zsh with limited commands
    - Cannot run native binaries (only JavaScript, WebAssembly)
    - No C/C++/Rust compiler available
    - Git is NOT available
    - Cannot execute diff or patch editing - always write COMPLETE files

  AVAILABLE SHELL COMMANDS:
    File Operations: cat, cp, ls, mkdir, mv, rm, rmdir, touch
    System Info: hostname, ps, pwd, uptime, env
    Development: node, npm, npx
    Utilities: curl, head, sort, tail, clear, which, export, chmod, echo

  CRITICAL RULES:
    - Prefer Node.js scripts over shell scripts
    - Use Vite for web servers (preferred over custom implementations)
    - Choose npm packages that don't rely on native binaries
    - For databases, prefer libsql, sqlite, or Supabase (no native binaries)
    - NEVER use "bundled" type when creating artifacts
</environment_constraints>
`;
