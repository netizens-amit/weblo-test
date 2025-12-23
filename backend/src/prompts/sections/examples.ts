
const stripIndents = (strings: TemplateStringsArray, ...values: any[]): string => {
    let result = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''), '');
    const lines = result.split('\n');
    const minIndent = lines.filter(l => l.trim()).reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1]?.length || 0), Infinity);
    return (minIndent !== Infinity && minIndent > 0 ? lines.map(l => l.slice(minIndent)).join('\n') : result).trim();
};

export const getExamples = (): string => stripIndents`
<examples>
  <example>
    <user_query>Create a dashboard for LMS system called StemBotix with proper responsive</user_query>
    <planning>
      Application Type: Dashboard / LMS
      Layout: Sidebar + TopBar + Main Content
      Components needed:
        - Sidebar.jsx (navigation with menu items)
        - TopBar.jsx (search, notifications, user profile)
        - StatsCard.jsx (student count, courses, revenue)
        - CourseTable.jsx (list of courses with CRUD)
        - RecentActivity.jsx (latest enrollments, completions)
        - Chart.jsx (enrollment trends, completion rates)
      Theme: Professional, educational feel
    </planning>
  </example>

  <example>
    <user_query>Build a modern portfolio website for a photographer</user_query>
    <planning>
      Application Type: Portfolio
      Layout: Header + Sections + Footer
      Components needed:
        - Header.jsx (logo, navigation)
        - Hero.jsx (introduction, featured image)
        - Gallery.jsx (photo grid with lightbox)
        - About.jsx (photographer bio)
        - Contact.jsx (contact form)
        - Footer.jsx (social links)
      Theme: Creative, minimal, image-focused
    </planning>
  </example>

  <example>
    <user_query>Create an e-commerce store for selling handmade jewelry</user_query>
    <planning>
      Application Type: E-commerce
      Layout: Header + Main + Footer
      Components needed:
        - Header.jsx (logo, nav, cart icon)
        - Hero.jsx (featured collection)
        - ProductGrid.jsx (product listing)
        - ProductCard.jsx (image, name, price)
        - Categories.jsx (filter by category)
        - Cart.jsx (cart sidebar)
        - Footer.jsx (links, newsletter)
      Theme: Elegant, feminine, trust-inspiring
    </planning>
  </example>

  <example>
    <user_query>Build an admin panel for user management</user_query>
    <planning>
      Application Type: Admin Panel
      Layout: Sidebar + TopBar + Main Content
      Components needed:
        - Sidebar.jsx (admin navigation)
        - TopBar.jsx (search, admin profile)
        - UsersTable.jsx (user list with actions)
        - UserForm.jsx (create/edit user)
        - StatsCards.jsx (total users, active, new)
        - RoleSelector.jsx (role management)
      Theme: Professional, functional, dark theme
    </planning>
  </example>
</examples>
`;
