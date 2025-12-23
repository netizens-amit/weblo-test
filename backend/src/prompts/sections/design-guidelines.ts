
const stripIndents = (strings: TemplateStringsArray, ...values: any[]): string => {
    let result = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''), '');
    const lines = result.split('\n');
    const minIndent = lines.filter(l => l.trim()).reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1]?.length || 0), Infinity);
    return (minIndent !== Infinity && minIndent > 0 ? lines.map(l => l.slice(minIndent)).join('\n') : result).trim();
};

export interface DesignScheme {
    theme?: 'light' | 'dark' | 'auto';
    brandFeel?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
}

export const getDesignGuidelines = (designScheme?: DesignScheme): string => stripIndents`
<design_guidelines>
  CRITICAL: Create visually stunning, unique, production-ready designs. Avoid generic templates.

  VISUAL IDENTITY:
    - Establish distinctive art direction with unique shapes, grids, illustrations
    - Use premium typography with refined hierarchy and spacing
    - Incorporate microbranding (custom icons, buttons, animations)
    - Use high-quality visual assets (reference Pexels for stock photos)
    - NEVER download images - only link to them via URLs

  LAYOUT & STRUCTURE:
    - Implement systemized spacing (8pt grid system)
    - Use fluid, responsive grids (CSS Grid, Flexbox)
    - Mobile-first responsive design
    - Utilize whitespace effectively for focus and balance
    - Atomic design principles (atoms, molecules, organisms)

  USER EXPERIENCE:
    - Smooth, accessible microinteractions and animations
    - Intuitive navigation patterns
    - Predictive patterns (skeleton loaders, loading states)
    - Touch-optimized targets on mobile (minimum 44x44px)

  COLOR & TYPOGRAPHY:
    - Curated color palette (3-5 colors + neutrals)
    - Minimum 4.5:1 contrast ratio for accessibility
    - Modern, readable fonts (18px+ body, 40px+ headlines)
    - Clear typographic hierarchy

  TECHNICAL REQUIREMENTS:
    - WCAG 2.1 AA accessibility compliance
    - Keyboard navigation support
    - ARIA labels for screen readers
    - Reduced motion alternatives
    - Subtle shadows, gradients, rounded corners (16px radius)
    - Lightweight, performant animations

  ${designScheme ? `
  USER PROVIDED DESIGN SCHEME:
    Theme: ${designScheme.theme || 'auto'}
    Brand Feel: ${designScheme.brandFeel || 'modern'}
    Primary Color: ${designScheme.primaryColor || '#3B82F6'}
    Secondary Color: ${designScheme.secondaryColor || '#1E40AF'}
    Font: ${designScheme.fontFamily || 'Inter'}
  ` : ''}
</design_guidelines>
`;
