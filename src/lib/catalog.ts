import { GIB } from './env'
import type { AiModel, Plan, Service, ServiceCategory } from '@/types/domain'

export const fallbackPlans: Plan[] = [
  {
    id: 'plan-free',
    slug: 'free',
    name: 'Free',
    description: 'Explore PeaceAI and build your first ideas with a generous starting allowance.',
    price_rwf: 0,
    annual_price_rwf: 0,
    billing_period: 'month',
    ai_messages_per_day: 25,
    ai_requests_per_minute: 5,
    premium_models: false,
    storage_bytes: 6 * GIB,
    proposal_limit_per_month: 2,
    features: [
      '25 AI messages per day',
      'Basic code assistance',
      'Selected AI tools',
      'Basic collaboration',
      '6 GiB private cloud storage',
      'Standard response priority',
    ],
    active: true,
    sort_order: 1,
  },
  {
    id: 'plan-pro',
    slug: 'pro',
    name: 'Pro',
    description: 'For developers, students, and professionals who use AI every day.',
    price_rwf: 5000,
    annual_price_rwf: 50000,
    billing_period: 'month',
    ai_messages_per_day: 250,
    ai_requests_per_minute: 20,
    premium_models: true,
    storage_bytes: 6 * GIB,
    proposal_limit_per_month: 25,
    features: [
      '250 AI messages per day',
      'Advanced coding assistance',
      'Expanded project planning',
      'File sharing and collaboration',
      '6 GiB included storage',
      'Premium model access where configured',
      'Higher processing priority',
    ],
    active: true,
    sort_order: 2,
  },
  {
    id: 'plan-business',
    slug: 'business',
    name: 'Business',
    description: 'Higher limits and team-oriented workflows for organizations.',
    price_rwf: 15000,
    annual_price_rwf: 150000,
    billing_period: 'month',
    ai_messages_per_day: 1200,
    ai_requests_per_minute: 60,
    premium_models: true,
    storage_bytes: 6 * GIB,
    proposal_limit_per_month: 100,
    features: [
      '1,200 AI messages per day',
      'Enhanced collaboration',
      'Team-oriented features',
      'Advanced project workflows',
      '6 GiB included per eligible user',
      'Optional additional storage',
      'Priority support',
    ],
    active: true,
    sort_order: 3,
  },
]

export const fallbackModels: AiModel[] = [
  {
    id: 'model-standard',
    provider: 'openai',
    model_id: 'gpt-4o-mini',
    display_name: 'PeaceAI Standard',
    description: 'Fast, efficient assistance for everyday tasks.',
    enabled: true,
    is_premium: false,
    sort_order: 1,
  },
  {
    id: 'model-advanced',
    provider: 'openai',
    model_id: 'gpt-4o',
    display_name: 'PeaceAI Advanced',
    description: 'Stronger reasoning and code generation. Pro and Business plans.',
    enabled: true,
    is_premium: true,
    sort_order: 2,
  },
]

export const serviceCategories: ServiceCategory[] = [
  { id: 'cat-dev', slug: 'development', name: 'Software Development', description: 'Web, mobile, and custom business applications.' },
  { id: 'cat-ai', slug: 'ai-automation', name: 'AI & Automation', description: 'Assistants, integrations, and intelligent workflows.' },
  { id: 'cat-security', slug: 'cybersecurity', name: 'Cybersecurity', description: 'Defensive assessments and secure implementation.' },
  { id: 'cat-data', slug: 'data-cloud', name: 'Data & Cloud', description: 'Databases, APIs, and cloud architecture.' },
  { id: 'cat-consulting', slug: 'consulting', name: 'Consulting', description: 'Technical planning, reviews, and advisory support.' },
]

const serviceDefaults = {
  active: true,
  price_from_rwf: null as number | null,
  price_to_rwf: null as number | null,
  customer_responsibilities: [
    'Provide accurate requirements and timely feedback.',
    'Confirm authorization for any system we assess or integrate with.',
    'Supply test accounts and access through a secure channel.',
    'Review deliverables and identify issues within the agreed review window.',
  ],
  terms:
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
  revision_policy:
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
}

export const fallbackServices: Service[] = [
  {
    ...serviceDefaults,
    id: 'svc-ai-website',
    slug: 'ai-assisted-website-development',
    name: 'AI-Assisted Website Development',
    category_id: 'cat-dev',
    short_description: 'A responsive, secure website designed with AI-accelerated workflows and human review.',
    description:
      'We plan, design, and build a professional website around your organization, customers, and goals. AI accelerates research, copy drafting, and implementation, while a developer reviews architecture, accessibility, security, and deployment.',
    requirements:
      'Business goals, audience, required pages, brand assets, preferred domain, and examples of sites you like. A content owner must be available for review.',
    deliverables: [
      'Discovery notes and sitemap',
      'Responsive interface implementation',
      'Contact or lead form integration',
      'Basic SEO and accessibility review',
      'Deployment configuration and handover guide',
    ],
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Supabase or compatible hosting'],
    estimated_timeline: '2–4 weeks',
    price_from_rwf: 250000,
    price_to_rwf: 900000,
    quote_factors: ['Number of pages', 'Custom integrations', 'Content readiness', 'Branding and design depth', 'Deadline'],
    sort_order: 1,
  },
  {
    ...serviceDefaults,
    id: 'svc-web-app',
    slug: 'custom-web-applications',
    name: 'Custom Web Applications',
    category_id: 'cat-dev',
    short_description: 'Secure dashboards, portals, and business tools built around your workflow.',
    description:
      'We build custom web applications with authenticated user roles, database design, and the workflows your team actually needs. The engagement includes requirements discovery, interface design, implementation, testing, and deployment planning.',
    requirements:
      'A clear description of users, workflows, data, integrations, and compliance requirements. Access to decision-makers during discovery.',
    deliverables: [
      'Requirements and data model',
      'Role-based application interface',
      'API and database implementation',
      'Automated tests for critical flows',
      'Deployment and operations documentation',
    ],
    technologies: ['React', 'TypeScript', 'Supabase PostgreSQL', 'Edge Functions', 'Tailwind CSS'],
    estimated_timeline: '4–12 weeks',
    price_from_rwf: 900000,
    price_to_rwf: 6000000,
    quote_factors: ['Workflow complexity', 'User roles', 'Integrations', 'Data migration', 'Testing and compliance needs'],
    sort_order: 2,
  },
  {
    ...serviceDefaults,
    id: 'svc-mobile',
    slug: 'mobile-application-development',
    name: 'Mobile Application Development',
    category_id: 'cat-dev',
    short_description: 'Cross-platform mobile experiences with a secure cloud backend.',
    description:
      'We design and build mobile applications for Android and iOS using cross-platform tooling, with a cloud backend, authentication, notifications, and release guidance.',
    requirements:
      'Target platforms, core user journeys, offline requirements, branding, and store-account ownership.',
    deliverables: [
      'User journey and screen map',
      'Cross-platform application',
      'Backend and authentication setup',
      'Store submission guidance',
      'Handover and maintenance notes',
    ],
    technologies: ['React Native or Flutter', 'TypeScript', 'Supabase', 'Push notifications'],
    estimated_timeline: '6–14 weeks',
    price_from_rwf: 1500000,
    price_to_rwf: 9000000,
    quote_factors: ['Number of screens', 'Device integrations', 'Offline support', 'Store requirements', 'Backend complexity'],
    sort_order: 3,
  },
  {
    ...serviceDefaults,
    id: 'svc-chatbot',
    slug: 'ai-chatbot-integration',
    name: 'AI Chatbot Integration',
    category_id: 'cat-ai',
    short_description: 'A grounded assistant for your website or internal knowledge base.',
    description:
      'We integrate a provider-independent AI assistant into your product or website. The assistant can answer from approved knowledge sources with retrieval, source attribution, usage controls, and fallback behavior.',
    requirements:
      'Approved source documents, brand and tone guidance, escalation rules, and an AI provider account or budget approval.',
    deliverables: [
      'Conversation design and guardrails',
      'Secure server-side AI integration',
      'Knowledge indexing workflow',
      'Rate limiting and usage dashboard',
      'Evaluation notes and fallback handling',
    ],
    technologies: ['TypeScript', 'Supabase Edge Functions', 'pgvector', 'OpenAI-compatible APIs'],
    estimated_timeline: '2–5 weeks',
    price_from_rwf: 500000,
    price_to_rwf: 3500000,
    quote_factors: ['Knowledge volume', 'Integrations', 'Escalation flows', 'Provider costs', 'Security requirements'],
    sort_order: 4,
  },
  {
    ...serviceDefaults,
    id: 'svc-automation',
    slug: 'ai-workflow-automation',
    name: 'AI Workflow Automation',
    category_id: 'cat-ai',
    short_description: 'Reduce repetitive work with carefully bounded AI automation.',
    description:
      'We map repetitive processes and automate suitable steps with AI and standard integrations. Every workflow includes human approval points, error handling, logging, and clear boundaries.',
    requirements:
      'A documented process, sample inputs, desired outputs, exception rules, and access to the systems involved.',
    deliverables: [
      'Process map and automation design',
      'Implemented workflow',
      'Human review and failure handling',
      'Usage and audit logging',
      'Operations runbook',
    ],
    technologies: ['TypeScript', 'Server-side APIs', 'AI providers', 'Queues and scheduled jobs'],
    estimated_timeline: '2–6 weeks',
    price_from_rwf: 400000,
    price_to_rwf: 3000000,
    quote_factors: ['Number of systems', 'Data sensitivity', 'Exception complexity', 'Volume', 'Monitoring requirements'],
    sort_order: 5,
  },
  {
    ...serviceDefaults,
    id: 'svc-database',
    slug: 'database-design-integration',
    name: 'Database Design and Integration',
    category_id: 'cat-data',
    short_description: 'A reliable relational data model with secure access policies.',
    description:
      'We design and implement relational database schemas, migrations, indexes, and access policies. The work includes integration guidance for your application and backup planning.',
    requirements:
      'Entities, relationships, access rules, expected volume, and existing data samples with sensitive fields removed.',
    deliverables: [
      'Entity relationship model',
      'Versioned migrations',
      'Row-level access policies',
      'Index and query review',
      'Backup and recovery guidance',
    ],
    technologies: ['PostgreSQL', 'Supabase', 'SQL', 'pgvector where needed'],
    estimated_timeline: '1–4 weeks',
    price_from_rwf: 250000,
    price_to_rwf: 1800000,
    quote_factors: ['Schema complexity', 'Migration volume', 'Compliance requirements', 'Performance targets'],
    sort_order: 6,
  },
  {
    ...serviceDefaults,
    id: 'svc-api',
    slug: 'api-development',
    name: 'API Development',
    category_id: 'cat-data',
    short_description: 'Documented, authenticated APIs for products and integrations.',
    description:
      'We build secure HTTP APIs with validation, authentication, authorization, rate limiting, error handling, and documentation. APIs are tested against expected failure cases.',
    requirements:
      'Consumer needs, endpoint expectations, authentication model, data sensitivity, and expected traffic.',
    deliverables: [
      'API specification',
      'Implemented endpoints',
      'Authentication and authorization',
      'Automated tests and documentation',
      'Deployment configuration',
    ],
    technologies: ['TypeScript', 'Supabase Edge Functions', 'PostgreSQL', 'OpenAPI'],
    estimated_timeline: '2–6 weeks',
    price_from_rwf: 350000,
    price_to_rwf: 2500000,
    quote_factors: ['Endpoint count', 'Integrations', 'Authentication model', 'Traffic and rate-limit design'],
    sort_order: 7,
  },
  {
    ...serviceDefaults,
    id: 'svc-security-assessment',
    slug: 'website-security-assessment',
    name: 'Website Security Assessment',
    category_id: 'cat-security',
    short_description: 'A lawful, scoped review of an authorized website with prioritized findings.',
    description:
      'A defensive review of a website or web application you own or are explicitly authorized to assess. We combine configuration review, authenticated manual checks, dependency review, and limited automated scanning. Findings are rated by severity with practical remediation guidance.',
    requirements:
      'Written authorization for the exact domains and accounts in scope, a technical contact, maintenance windows, and confirmation that testing will not disrupt production.',
    deliverables: [
      'Scope and rules-of-engagement document',
      'Prioritized findings with evidence',
      'Remediation recommendations',
      'Executive summary',
      'Optional retest quotation',
    ],
    technologies: ['OWASP guidance', 'Configuration review', 'Dependency analysis', 'Manual verification'],
    estimated_timeline: '3–10 business days',
    price_from_rwf: 300000,
    price_to_rwf: 2000000,
    quote_factors: ['Application size', 'Authentication complexity', 'Number of environments', 'Testing window', 'Reporting depth'],
    sort_order: 8,
    terms:
      'Assessments are performed only with documented authorization. Automated scanner output alone is not a verified professional assessment. PeaceAI does not perform denial-of-service, social engineering, credential theft, or testing outside the agreed scope. Findings reflect the systems and time tested and cannot guarantee the absence of all vulnerabilities.',
  },
  {
    ...serviceDefaults,
    id: 'svc-auth',
    slug: 'authentication-access-control',
    name: 'Authentication and Access Control',
    category_id: 'cat-security',
    short_description: 'Secure sign-in, role management, and server-enforced permissions.',
    description:
      'We implement authentication and authorization for new or existing applications, including email verification, password reset, role-based access, database policies, and session hardening.',
    requirements:
      'User roles, access rules, identity-provider preferences, and required compliance constraints.',
    deliverables: [
      'Authentication flow implementation',
      'Role and permission model',
      'Database access policies',
      'Security review and tests',
      'Operational documentation',
    ],
    technologies: ['Supabase Auth', 'PostgreSQL RLS', 'TypeScript', 'Optional MFA providers'],
    estimated_timeline: '1–4 weeks',
    price_from_rwf: 250000,
    price_to_rwf: 1500000,
    quote_factors: ['Role complexity', 'Identity providers', 'Migration of existing users', 'MFA requirements'],
    sort_order: 9,
  },
  {
    ...serviceDefaults,
    id: 'svc-maintenance',
    slug: 'website-maintenance-optimization',
    name: 'Website Maintenance and Optimization',
    category_id: 'cat-dev',
    short_description: 'Ongoing updates, performance work, and security hygiene.',
    description:
      'A monthly or project-based maintenance engagement covering dependency updates, performance checks, backup verification, functional testing, and small improvements.',
    requirements:
      'Repository or deployment access, a current system inventory, and a named approval contact.',
    deliverables: [
      'Maintenance schedule and report',
      'Dependency and security updates',
      'Performance recommendations',
      'Tested releases',
      'Escalation process',
    ],
    technologies: ['React', 'Node.js', 'Cloud hosting', 'Monitoring tools'],
    estimated_timeline: 'Monthly retainer',
    price_from_rwf: 100000,
    price_to_rwf: 600000,
    quote_factors: ['System size', 'Release frequency', 'Monitoring scope', 'Response-time requirements'],
    sort_order: 10,
  },
  {
    ...serviceDefaults,
    id: 'svc-consulting',
    slug: 'technical-consulting',
    name: 'Technical Consulting',
    category_id: 'cat-consulting',
    short_description: 'Focused advice on architecture, delivery risk, and technology choices.',
    description:
      'A structured consulting engagement for teams that need an independent technical perspective. We review context and evidence, then provide written recommendations with trade-offs and next steps.',
    requirements:
      'A clear question, relevant architecture or code access, and the people who can explain constraints.',
    deliverables: [
      'Discovery session',
      'Written assessment',
      'Options and trade-offs',
      'Prioritized recommendations',
      'Follow-up review session',
    ],
    technologies: ['Architecture review', 'Code review', 'Delivery planning', 'Security and cost analysis'],
    estimated_timeline: '3–10 business days',
    price_from_rwf: 150000,
    price_to_rwf: 1200000,
    quote_factors: ['Scope of review', 'Number of systems', 'Stakeholders', 'Urgency', 'Report depth'],
    sort_order: 11,
  },
].map((service) => service as Service)

export const fallbackFaqs = [
  {
    question: 'What is PeaceAI?',
    answer:
      'PeaceAI is a technology platform that combines an AI assistant, AI-assisted software development, defensive cybersecurity services, private cloud storage, and user collaboration.',
  },
  {
    question: 'Does PeaceAI have its own AI model?',
    answer:
      'No. PeaceAI uses configurable third-party language-model providers through a protected server-side integration. We do not claim to have trained our own foundation model.',
  },
  {
    question: 'How much cloud storage do I get?',
    answer:
      'Eligible accounts receive 6 GiB of private storage. Administrators can configure storage quotas by plan. The unit is explicitly shown in the interface as GiB (binary gigabytes).',
  },
  {
    question: 'Can PeaceAI guarantee that generated code is secure?',
    answer:
      'No. AI-generated code and plans can contain mistakes. PeaceAI marks outputs as drafts and recommends human review, testing, and a professional security assessment before production use.',
  },
  {
    question: 'Which payment methods are supported?',
    answer:
      'The payment layer is designed for Flutterwave, which can support card and mobile-money payments in Rwanda when configured with the owner’s approved merchant account. No payment method is shown as active until credentials have been configured and tested in sandbox mode.',
  },
  {
    question: 'How do subscriptions work?',
    answer:
      'Free, Pro, and Business plans are configurable by an administrator. Paid plans have daily AI limits and do not mean unlimited usage. Plan changes take effect according to the billing period and are confirmed server-side.',
  },
  {
    question: 'Can PeaceAI assess my website?',
    answer:
      'Only with documented authorization for the exact systems in scope. We provide lawful defensive assessments and clearly distinguish automated checks from a verified professional review.',
  },
  {
    question: 'How do I contact support?',
    answer:
      'Use the Contact page or email the support address. The proposed phone number and administrator email must be confirmed by the owner before being used for production support.',
  },
]
