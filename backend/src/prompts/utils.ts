
export function stripIndents(strings: TemplateStringsArray, ...values: any[]): string {
    let result = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] !== undefined ? values[i] : '');
    }, '');

    const lines = result.split('\n');

    const minIndent = lines
        .filter(line => line.trim().length > 0)
        .reduce((min, line) => {
            const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
            return Math.min(min, indent);
        }, Infinity);

    if (minIndent !== Infinity && minIndent > 0) {
        result = lines
            .map(line => line.slice(minIndent))
            .join('\n');
    }

    return result.trim();
}

export function formatTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }
    return result;
}

/**
 * Known npm packages and their latest versions
 */
const KNOWN_PACKAGES: Record<string, string> = {
    'react-router-dom': '^6.22.0',
    'framer-motion': '^11.0.0',
    'axios': '^1.6.7',
    'zustand': '^4.5.0',
    '@tanstack/react-query': '^5.17.0',
    'react-hook-form': '^7.49.0',
    'zod': '^3.22.0',
    'date-fns': '^3.3.0',
    'clsx': '^2.1.0',
    'tailwind-merge': '^2.2.0',
    'react-hot-toast': '^2.4.1',
    'sweetalert2': '^11.10.0',
    '@headlessui/react': '^1.7.18',
    '@heroicons/react': '^2.1.1',
    'recharts': '^2.12.0',
    'react-icons': '^5.0.1',
};

/**
 * Validate and fix generated React code
 * Detects missing dependencies and creates stub components for missing files
 */
export function validateAndFixGeneratedCode(
    files: Record<string, string>
): { files: Record<string, string>; fixes: string[] } {
    const fixes: string[] = [];
    const fixedFiles = { ...files };

    // Step 1: Parse package.json to get existing dependencies
    let packageJson: any = null;
    const packageJsonPath = Object.keys(files).find(f => f.endsWith('package.json'));

    if (packageJsonPath) {
        try {
            packageJson = JSON.parse(files[packageJsonPath]);
        } catch (e) {
            fixes.push('Warning: Could not parse package.json');
        }
    }

    if (!packageJson) {
        fixes.push('Error: No package.json found');
        return { files: fixedFiles, fixes };
    }

    const existingDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
    };

    // Step 2: Scan all JS/JSX/TSX files for imports
    const detectedImports = new Map<string, Set<string>>(); // package -> files that use it
    const componentImports = new Map<string, string[]>(); // file -> component imports

    const importPatterns = [
        // import X from 'package' or import { X } from 'package'
        /import\s+(?:[\w*\s{},]+)\s+from\s+['"]([^'"./][^'"]*)['"]/g,
        // require('package')
        /require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g,
    ];

    const componentImportPattern = /import\s+(?:\w+|\{[^}]+\})\s+from\s+['"](\.\/[^'"]+)['"]/g;

    for (const [filePath, content] of Object.entries(files)) {
        if (!filePath.match(/\.(js|jsx|ts|tsx)$/)) continue;

        // Find npm package imports
        for (const pattern of importPatterns) {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);
            while ((match = regex.exec(content)) !== null) {
                const pkg = match[1].split('/')[0]; // Handle scoped packages like @tanstack/react-query
                const fullPkg = match[1].startsWith('@')
                    ? match[1].split('/').slice(0, 2).join('/')
                    : pkg;

                if (!detectedImports.has(fullPkg)) {
                    detectedImports.set(fullPkg, new Set());
                }
                detectedImports.get(fullPkg)!.add(filePath);
            }
        }

        // Find local component imports
        let compMatch;
        const compRegex = new RegExp(componentImportPattern.source, componentImportPattern.flags);
        const localImports: string[] = [];
        while ((compMatch = compRegex.exec(content)) !== null) {
            localImports.push(compMatch[1]);
        }
        if (localImports.length > 0) {
            componentImports.set(filePath, localImports);
        }
    }

    // Step 3: Check for missing npm dependencies and add them
    const missingDeps: string[] = [];
    const builtInModules = new Set(['react', 'react-dom', 'path', 'fs', 'url', 'util']);

    for (const [pkg, usedIn] of detectedImports) {
        if (builtInModules.has(pkg)) continue;
        if (pkg.startsWith('.')) continue; // Local imports

        if (!existingDeps[pkg]) {
            const version = KNOWN_PACKAGES[pkg];
            if (version) {
                packageJson.dependencies = packageJson.dependencies || {};
                packageJson.dependencies[pkg] = version;
                fixes.push(`Added missing dependency: ${pkg}@${version} (used in ${[...usedIn].join(', ')})`);
                missingDeps.push(pkg);
            } else {
                fixes.push(`Warning: Unknown package "${pkg}" imported in ${[...usedIn].join(', ')}`);
            }
        }
    }

    // Update package.json if dependencies were added
    if (missingDeps.length > 0 && packageJsonPath) {
        fixedFiles[packageJsonPath] = JSON.stringify(packageJson, null, 2);
    }

    // Step 4: Check for missing component files and create stubs
    for (const [filePath, imports] of componentImports) {
        for (const importPath of imports) {
            // Normalize the import path
            const basePath = filePath.includes('/')
                ? filePath.substring(0, filePath.lastIndexOf('/'))
                : '';

            // Resolve relative path
            let resolvedPath = importPath;
            if (importPath.startsWith('./')) {
                resolvedPath = basePath
                    ? `${basePath}/${importPath.slice(2)}`
                    : importPath.slice(2);
            }

            // Add .jsx extension if missing
            const possiblePaths = [
                resolvedPath,
                `${resolvedPath}.jsx`,
                `${resolvedPath}.tsx`,
                `${resolvedPath}/index.jsx`,
                `${resolvedPath}/index.tsx`,
            ];

            const exists = possiblePaths.some(p =>
                files[p] || files[p.replace(/^\//, '')] || files[`src/${p.replace(/^\.\//, '')}`]
            );

            if (!exists) {
                // Create stub component
                const componentName = importPath.split('/').pop()?.replace(/\.\w+$/, '') || 'Component';
                const stubPath = resolvedPath.endsWith('.jsx') || resolvedPath.endsWith('.tsx')
                    ? resolvedPath
                    : `${resolvedPath}.jsx`;

                const normalizedStubPath = stubPath.startsWith('src/')
                    ? stubPath
                    : `src/${stubPath.replace(/^\.\//, '')}`;

                fixedFiles[normalizedStubPath] = createStubComponent(componentName);
                fixes.push(`Created missing component: ${normalizedStubPath}`);
            }
        }
    }

    return { files: fixedFiles, fixes };
}

/**
 * Create a stub component for missing files
 */
function createStubComponent(name: string): string {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    return `// Auto-generated stub component
import { AlertCircle } from 'lucide-react';

function ${capitalizedName}() {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">${capitalizedName}</h2>
        <p className="text-gray-600">
          This component is being developed. Content coming soon.
        </p>
      </div>
    </section>
  );
}

export default ${capitalizedName};
`;
}

/**
 * Quick check if react-router-dom is used but not in dependencies
 */
export function needsRouterDependency(content: string, packageJson: any): boolean {
    const usesRouter = content.includes('react-router-dom') ||
        content.includes('BrowserRouter') ||
        content.includes('Routes') ||
        content.includes('Route');

    const hasDep = packageJson?.dependencies?.['react-router-dom'] ||
        packageJson?.devDependencies?.['react-router-dom'];

    return usesRouter && !hasDep;
}