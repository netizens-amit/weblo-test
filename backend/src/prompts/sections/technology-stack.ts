// backend/src/prompts/sections/technology-stack.ts
// Defines the React + Vite + Tailwind project structure

// Simple template literal - no import needed
const stripIndents = (strings: TemplateStringsArray, ...values: any[]): string => {
  let result = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''), '');
  const lines = result.split('\n');
  const minIndent = lines.filter(l => l.trim()).reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1]?.length || 0), Infinity);
  return (minIndent !== Infinity && minIndent > 0 ? lines.map(l => l.slice(minIndent)).join('\n') : result).trim();
};

export const getTechnologyStack = (): string => stripIndents`
<technology_stack>
  TECH STACK: React 18 + Vite + Tailwind CSS

  REQUIRED PROJECT STRUCTURE:
  ├── package.json          # Dependencies and scripts
  ├── index.html            # Entry HTML file
  ├── vite.config.js        # Vite configuration
  ├── tailwind.config.js    # Tailwind configuration
  ├── postcss.config.js     # PostCSS configuration
  └── src/
      ├── main.jsx          # React entry point
      ├── App.jsx           # Root component
      ├── index.css         # Global styles with Tailwind directives
      ├── ErrorBoundary.jsx # REQUIRED: Error boundary component
      └── components/       # Component files (as needed)

  PACKAGE.JSON TEMPLATE:
  {
    "name": "weblo-app",
    "private": true,
    "version": "0.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "lucide-react": "^0.263.1"
    },
    "devDependencies": {
      "@vitejs/plugin-react": "^4.2.1",
      "vite": "^5.2.0",
      "tailwindcss": "^3.4.1",
      "autoprefixer": "^10.4.17",
      "postcss": "^8.4.35"
    }
  }

  INDEX.HTML TEMPLATE:
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weblo App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
  </html>

  INDEX.CSS TEMPLATE:
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { height: 100%; width: 100%; }

  REQUIRED ERROR BOUNDARY (src/ErrorBoundary.jsx):
  import React from 'react';
  
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
    componentDidCatch(error, info) {
      console.error('App Error:', error, info);
    }
    render() {
      if (this.state.hasError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-red-50 p-8">
            <div className="max-w-md bg-white rounded-xl shadow-lg p-8">
              <div className="text-4xl mb-4">⚠️</div>
              <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h1>
              <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
              <button onClick={() => window.location.reload()} 
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                Reload
              </button>
            </div>
          </div>
        );
      }
      return this.props.children;
    }
  }
  export default ErrorBoundary;

  REQUIRED MAIN.JSX WITH ERROR BOUNDARY:
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import App from './App';
  import ErrorBoundary from './ErrorBoundary';
  import './index.css';

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  CRITICAL RULES:
    - Use React 18 functional components with hooks
    - Use Tailwind CSS for ALL styling
    - Use lucide-react for icons
    - Make fully responsive (mobile-first)
    - Root div MUST have: className="min-h-screen w-full"
    - ALWAYS include ErrorBoundary.jsx and wrap App in main.jsx
</technology_stack>
`;
