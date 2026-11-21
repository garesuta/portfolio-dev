// Main's content as plain data. Copy is word for word from the content inventory
// (.scratch/portfolio-spec/content-inventory.md), except the bio (rewritten at Teen's request).

const si = (slug: string) => `https://cdn.simpleicons.org/${slug}`;

export const contact = {
  email: 'noppadolchin.work@gmail.com',
  github: 'https://github.com/garesuta',
  linkedin: 'https://www.linkedin.com/in/noppadol-chinonn-3b47181a2/',
};

export const bio = {
  focus: 'Mid-Level Full-Stack Software Engineer',
  rest: 'experienced in designing, developing, and maintaining production-grade web applications using TypeScript, JavaScript, Python, and Go. Capable of owning features end-to-end, from understanding business requirements and designing technical solutions to implementation, testing, and deployment.',
};

export interface Tool { name: string; icon?: string }

export const stack: { category: string; tools: Tool[] }[] = [
  { category: 'frontend', tools: [
    { name: 'TypeScript', icon: si('typescript') },
    { name: 'React', icon: si('react') },
    { name: 'Next.js', icon: si('nextdotjs/white') },
    { name: 'Vue', icon: si('vuedotjs') },
    { name: 'Nuxt', icon: si('nuxt') },
    { name: 'Astro', icon: si('astro') },
    { name: 'Tailwind CSS', icon: si('tailwindcss') },
    { name: 'Shadcn', icon: si('shadcnui/white') },
    { name: 'MUI', icon: si('mui') },
  ] },
  { category: 'backend & data', tools: [
    { name: 'NestJS', icon: si('nestjs') },
    { name: 'Node.js', icon: si('nodedotjs') },
    { name: 'Go', icon: si('go') },
    { name: 'PostgreSQL', icon: si('postgresql') },
    { name: 'MongoDB', icon: si('mongodb') },
    { name: 'REST' },
    { name: 'WebSocket' },
    { name: 'SSE' },
  ] },
  { category: 'ai', tools: [
    { name: 'Claude Code', icon: si('claude') },
    { name: 'Codex', icon: '/assets/openai.svg' },
  ] },
  { category: 'infra & integrations', tools: [
    { name: 'Docker', icon: si('docker') },
    { name: 'Git', icon: si('git') },
    { name: 'GitHub', icon: si('github/white') },
    { name: 'CI/CD', icon: si('githubactions') },
    { name: 'AWS S3' },
    { name: 'n8n', icon: si('n8n') },
    { name: 'Firebase', icon: si('firebase') },
    { name: 'Google Maps', icon: si('googlemaps') },
    { name: 'Google Cloud', icon: si('googlecloud') },
    { name: 'Vercel', icon: si('vercel/white') },
  ] },
];

export const jobs = [
  { period: 'Aug 2025 – present', role: 'Mid-Level Software Engineer (Full-Stack Development)', org: 'Moonholidays Group',
    what: 'Developed and maintained a hotel inventory and booking management system using NestJS and PostgreSQL, supporting approximately 5 million inventory records and complex booking, pricing, and contract workflows.' },
  { period: 'Aug 2024 – Jul 2025', role: 'Data Analyst', org: 'Metro Machinery Group',
    what: 'Developed data models and KPI dashboards to improve reporting, data quality and business decision-making across operations and sales.' },
  { period: 'Apr 2022 – Jul 2024', role: 'Senior Data Analyst', org: 'NAYOO Corporation Co., Ltd.',
    what: 'Led data-driven marketing initiatives, analysing user behaviour, SEO and campaign performance to optimise traffic, conversions and business KPIs.' },
  { period: 'Aug 2019 – Mar 2022', role: 'Boardman', org: 'TPI Polene Power Public Company Limited',
    what: 'Monitored power plant operations and optimised fuel and waste resources to maintain operational efficiency and achieve production KPIs.' },
];

export const schools = [
  { period: '2026 – current', degree: 'MBA', org: 'Thammasat University (Tha Prachan), Bangkok', logo: '/assets/thammasat.svg' },
  { period: '2015 – 2019', degree: 'BSc Physics', org: 'Khon Kaen University, Khon Kaen', logo: '/assets/kku.svg' },
];
