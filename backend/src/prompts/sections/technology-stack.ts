// backend/src/prompts/sections/technology-stack.ts
// Defines the React + Vite + Tailwind project structure - BOLT.DIY STYLE

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

  ─────────────────────────────────────────────────────────────────
  MANDATORY PROJECT STRUCTURE - YOU MUST CREATE ALL THESE FILES:
  ─────────────────────────────────────────────────────────────────

  / (root)
  ├── package.json          # FIRST FILE - All dependencies listed
  ├── index.html            # HTML entry point
  ├── vite.config.js        # Vite configuration with React plugin
  ├── tailwind.config.js    # Tailwind content paths
  ├── postcss.config.js     # PostCSS with Tailwind/Autoprefixer
  └── src/
      ├── main.jsx          # React entry point (ReactDOM.createRoot)
      ├── App.jsx           # Root component - renders ALL components
      ├── index.css         # Global styles with @tailwind directives
      └── components/       # ALL component files go here

  ─────────────────────────────────────────────────────────────────
  CRITICAL RULES - FORBIDDEN ACTIONS:
  ─────────────────────────────────────────────────────────────────

  FORBIDDEN: Creating ./pages/ folder for single-page apps
  FORBIDDEN: Importing react-router-dom unless multi-page app is requested
  FORBIDDEN: Using <BrowserRouter> or <Routes> for simple websites
  FORBIDDEN: Importing ANY icon without the import statement
  FORBIDDEN: Importing ANY component file that you don't create
  FORBIDDEN: Using packages not listed in package.json dependencies
  FORBIDDEN: Creating placeholder components with "Coming soon" text
  FORBIDDEN: Leaving any component incomplete or stubbed

  ─────────────────────────────────────────────────────────────────
  MANDATORY COMPONENT STRUCTURE - EVERY COMPONENT MUST:
  ─────────────────────────────────────────────────────────────────

  1. Have import statement for lucide-react icons AT THE TOP:
     import { IconName1, IconName2 } from 'lucide-react';

  2. Be a complete, functional component with real content
  
  3. Use Tailwind CSS classes for ALL styling
  
  4. Export default at the bottom:
     export default ComponentName;

  COMMON ICONS (use these exact names):
    Menu, X, Home, User, Settings, ChevronDown, ChevronUp, ChevronLeft, 
    ChevronRight, Search, Bell, LogOut, Plus, Minus, Edit, Trash, Check,
    Clock, Calendar, Mail, Phone, MapPin, Star, Heart, Share, Download, 
    Upload, Eye, EyeOff, TrendingUp, TrendingDown, Users, DollarSign, 
    Activity, BarChart, PieChart, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    RefreshCw, Loader, AlertCircle, AlertTriangle, Info, HelpCircle,
    CheckCircle, XCircle, Filter, MoreHorizontal, MoreVertical, Bookmark,
    BadgeCheck, UserPlus, FileText, Award

  ─────────────────────────────────────────────────────────────────
  PACKAGE.JSON TEMPLATE - MUST INCLUDE ALL DEPENDENCIES UPFRONT:
  ─────────────────────────────────────────────────────────────────

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

  NOTE: For multi-page apps with routing, ADD "react-router-dom": "^6.22.0" to dependencies

  ─────────────────────────────────────────────────────────────────
  INDEX.HTML - EXACT TEMPLATE:
  ─────────────────────────────────────────────────────────────────

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

  ─────────────────────────────────────────────────────────────────
  INDEX.CSS - EXACT TEMPLATE:
  ─────────────────────────────────────────────────────────────────

  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { height: 100%; width: 100%; }

  ─────────────────────────────────────────────────────────────────
  SINGLE-PAGE APP STRUCTURE (DEFAULT - NO ROUTER):
  ─────────────────────────────────────────────────────────────────

  For simple websites (landing pages, portfolios, restaurants, etc.):

  App.jsx should directly render all components:

  import Header from './components/Header';
  import Hero from './components/Hero';
  import Features from './components/Features';
  import About from './components/About';
  import Contact from './components/Contact';
  import Footer from './components/Footer';

  function App() {
    return (
      <div className="min-h-screen w-full">
        <Header />
        <Hero />
        <Features />
        <About />
        <Contact />
        <Footer />
      </div>
    );
  }

  export default App;

  ─────────────────────────────────────────────────────────────────
  MULTI-PAGE APP STRUCTURE (ONLY WHEN EXPLICITLY ASKED):
  ─────────────────────────────────────────────────────────────────

  ONLY use routing when user explicitly asks for:
  - "multi-page app" or "multiple pages"
  - "separate pages for each section"
  - "navigation between pages"

  When routing is needed:
  1. ADD "react-router-dom": "^6.22.0" to package.json dependencies
  2. Create ./pages/ folder with page components
  3. Use BrowserRouter, Routes, Route in App.jsx

</technology_stack>
`;
