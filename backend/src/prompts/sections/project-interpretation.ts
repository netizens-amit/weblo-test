// backend/src/prompts/sections/project-interpretation.ts
// Guides the AI to interpret user requests dynamically

// Simple template literal - no import needed
const stripIndents = (strings: TemplateStringsArray, ...values: any[]): string => {
    let result = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''), '');
    const lines = result.split('\n');
    const minIndent = lines.filter(l => l.trim()).reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1]?.length || 0), Infinity);
    return (minIndent !== Infinity && minIndent > 0 ? lines.map(l => l.slice(minIndent)).join('\n') : result).trim();
};

export const getProjectInterpretation = (): string => stripIndents`
<project_interpretation>
  CRITICAL: Build EXACTLY what the user requests. DO NOT default to generic website templates.

  INTERPRETATION GUIDE:
  Analyze the user's request to determine:
  1. Application Type: Dashboard? E-commerce? Portfolio? Admin Panel? Landing Page?
  2. Core Components: What UI elements are needed?
  3. Layout Structure: Single page? Multi-page? Dashboard layout?

  APPLICATION TYPE PATTERNS:

  Dashboard / Admin Panel / CRM / LMS / ERP / Analytics:
    Layout: Sidebar + TopBar + Main Content Area
    Components: Sidebar, StatsCards, Charts, DataTables, ActivityFeed
    Theme: Professional, often dark theme
    Features: Data visualization, CRUD operations, navigation

  E-commerce / Store / Shop:
    Layout: Header + Main + Footer
    Components: ProductGrid, ProductCard, Cart, Checkout, Categories
    Theme: Clean, trust-inspiring
    Features: Product filtering, cart management, checkout flow

  Landing Page / SaaS / Startup:
    Layout: Single page with sections
    Components: Hero, Features, Pricing, Testimonials, CTA, Footer
    Theme: Modern, conversion-focused
    Features: Scroll animations, clear CTAs

  Portfolio / Personal Website:
    Layout: Header + Content + Footer
    Components: Hero, ProjectGallery, About, Skills, Contact
    Theme: Creative, personal brand
    Features: Project showcases, contact form

  Blog / Content Site:
    Layout: Header + Content + Sidebar + Footer
    Components: ArticleList, ArticleCard, Categories, Search
    Theme: Readable, content-focused
    Features: Content organization, search

  CRITICAL RULES:
    - Create ONLY components relevant to the user's request
    - DO NOT add Hero/Features/About/Contact to dashboards
    - DO NOT add Sidebar/StatsCards to landing pages
    - Match the layout structure to the application type
    - Use appropriate theming for the use case
</project_interpretation>
`;
