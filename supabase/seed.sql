-- Idempotent starter data. Review prices, service wording, and contact details
-- with the platform owner before production launch.

insert into public.plans (
  slug, name, description, price_rwf, annual_price_rwf, billing_period,
  ai_messages_per_day, ai_requests_per_minute, premium_models,
  storage_bytes, proposal_limit_per_month, features, active, sort_order
)
values
  (
    'free',
    'Free',
    'Explore PeaceAI and build your first ideas with a generous starting allowance.',
    0, 0, 'month', 25, 5, false, 6442450944, 2,
    '["25 AI messages per day","Basic code assistance","Selected AI tools","Basic collaboration","6 GiB private cloud storage","Standard response priority"]'::jsonb,
    true, 1
  ),
  (
    'pro',
    'Pro',
    'For developers, students, and professionals who use AI every day.',
    5000, 50000, 'month', 250, 20, true, 6442450944, 25,
    '["250 AI messages per day","Advanced coding assistance","Expanded project planning","File sharing and collaboration","6 GiB included storage","Premium model access where configured","Higher processing priority"]'::jsonb,
    true, 2
  ),
  (
    'business',
    'Business',
    'Higher limits and team-oriented workflows for organizations.',
    15000, 150000, 'month', 1200, 60, true, 6442450944, 100,
    '["1,200 AI messages per day","Enhanced collaboration","Team-oriented features","Advanced project workflows","6 GiB included per eligible user","Optional additional storage","Priority support"]'::jsonb,
    true, 3
  )
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      price_rwf = excluded.price_rwf,
      annual_price_rwf = excluded.annual_price_rwf,
      billing_period = excluded.billing_period,
      ai_messages_per_day = excluded.ai_messages_per_day,
      ai_requests_per_minute = excluded.ai_requests_per_minute,
      premium_models = excluded.premium_models,
      storage_bytes = excluded.storage_bytes,
      proposal_limit_per_month = excluded.proposal_limit_per_month,
      features = excluded.features,
      active = excluded.active,
      sort_order = excluded.sort_order;

insert into public.ai_models (provider, model_id, display_name, description, enabled, is_premium, sort_order)
values
  ('openai', 'gpt-4o-mini', 'PeaceAI Standard', 'Fast, efficient assistance for everyday tasks.', true, false, 1),
  ('openai', 'gpt-4o', 'PeaceAI Advanced', 'Stronger reasoning and code generation. Pro and Business plans.', true, true, 2)
on conflict (model_id) do update
  set provider = excluded.provider,
      display_name = excluded.display_name,
      description = excluded.description,
      enabled = excluded.enabled,
      is_premium = excluded.is_premium,
      sort_order = excluded.sort_order;

insert into public.service_categories (slug, name, description)
values
  ('development', 'Software Development', 'Web, mobile, and custom business applications.'),
  ('ai-automation', 'AI & Automation', 'Assistants, integrations, and intelligent workflows.'),
  ('cybersecurity', 'Cybersecurity', 'Defensive assessments and secure implementation.'),
  ('data-cloud', 'Data & Cloud', 'Databases, APIs, and cloud architecture.'),
  ('consulting', 'Consulting', 'Technical planning, reviews, and advisory support.')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description;

insert into public.services (
  slug, name, category_id, short_description, description, requirements,
  deliverables, technologies, estimated_timeline, price_from_rwf, price_to_rwf,
  quote_factors, customer_responsibilities, terms, revision_policy, active, sort_order
)
select
  v.slug,
  v.name,
  c.id,
  v.short_description,
  v.description,
  v.requirements,
  v.deliverables,
  v.technologies,
  v.estimated_timeline,
  v.price_from_rwf,
  v.price_to_rwf,
  v.quote_factors,
  v.customer_responsibilities,
  v.terms,
  v.revision_policy,
  true,
  v.sort_order
from jsonb_to_recordset($seed$
[
  {
    "slug": "ai-assisted-website-development",
    "name": "AI-Assisted Website Development",
    "category_slug": "development",
    "short_description": "A responsive, secure website designed with AI-accelerated workflows and human review.",
    "description": "We plan, design, and build a professional website around your organization, customers, and goals. AI accelerates research, copy drafting, and implementation, while a developer reviews architecture, accessibility, security, and deployment.",
    "requirements": "Business goals, audience, required pages, brand assets, preferred domain, and examples of sites you like. A content owner must be available for review.",
    "deliverables": ["Discovery notes and sitemap", "Responsive interface implementation", "Contact or lead form integration", "Basic SEO and accessibility review", "Deployment configuration and handover guide"],
    "technologies": ["React", "TypeScript", "Tailwind CSS", "Supabase or compatible hosting"],
    "estimated_timeline": "2–4 weeks",
    "price_from_rwf": 250000,
    "price_to_rwf": 900000,
    "quote_factors": ["Number of pages", "Custom integrations", "Content readiness", "Branding and design depth", "Deadline"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 1
  },
  {
    "slug": "custom-web-applications",
    "name": "Custom Web Applications",
    "category_slug": "development",
    "short_description": "Secure dashboards, portals, and business tools built around your workflow.",
    "description": "We build custom web applications with authenticated user roles, database design, and the workflows your team actually needs. The engagement includes requirements discovery, interface design, implementation, testing, and deployment planning.",
    "requirements": "A clear description of users, workflows, data, integrations, and compliance requirements. Access to decision-makers during discovery.",
    "deliverables": ["Requirements and data model", "Role-based application interface", "API and database implementation", "Automated tests for critical flows", "Deployment and operations documentation"],
    "technologies": ["React", "TypeScript", "Supabase PostgreSQL", "Edge Functions", "Tailwind CSS"],
    "estimated_timeline": "4–12 weeks",
    "price_from_rwf": 900000,
    "price_to_rwf": 6000000,
    "quote_factors": ["Workflow complexity", "User roles", "Integrations", "Data migration", "Testing and compliance needs"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 2
  },
  {
    "slug": "mobile-application-development",
    "name": "Mobile Application Development",
    "category_slug": "development",
    "short_description": "Cross-platform mobile experiences with a secure cloud backend.",
    "description": "We design and build mobile applications for Android and iOS using cross-platform tooling, with a cloud backend, authentication, notifications, and release guidance.",
    "requirements": "Target platforms, core user journeys, offline requirements, branding, and store-account ownership.",
    "deliverables": ["User journey and screen map", "Cross-platform application", "Backend and authentication setup", "Store submission guidance", "Handover and maintenance notes"],
    "technologies": ["React Native or Flutter", "TypeScript", "Supabase", "Push notifications"],
    "estimated_timeline": "6–14 weeks",
    "price_from_rwf": 1500000,
    "price_to_rwf": 9000000,
    "quote_factors": ["Number of screens", "Device integrations", "Offline support", "Store requirements", "Backend complexity"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 3
  },
  {
    "slug": "ai-chatbot-integration",
    "name": "AI Chatbot Integration",
    "category_slug": "ai-automation",
    "short_description": "A grounded assistant for your website or internal knowledge base.",
    "description": "We integrate a provider-independent AI assistant into your product or website. The assistant can answer from approved knowledge sources with retrieval, source attribution, usage controls, and fallback behavior.",
    "requirements": "Approved source documents, brand and tone guidance, escalation rules, and an AI provider account or budget approval.",
    "deliverables": ["Conversation design and guardrails", "Secure server-side AI integration", "Knowledge indexing workflow", "Rate limiting and usage dashboard", "Evaluation notes and fallback handling"],
    "technologies": ["TypeScript", "Supabase Edge Functions", "PostgreSQL full-text search", "OpenAI-compatible APIs"],
    "estimated_timeline": "2–5 weeks",
    "price_from_rwf": 500000,
    "price_to_rwf": 3500000,
    "quote_factors": ["Knowledge volume", "Integrations", "Escalation flows", "Provider costs", "Security requirements"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 4
  },
  {
    "slug": "ai-workflow-automation",
    "name": "AI Workflow Automation",
    "category_slug": "ai-automation",
    "short_description": "Reduce repetitive work with carefully bounded AI automation.",
    "description": "We map repetitive processes and automate suitable steps with AI and standard integrations. Every workflow includes human approval points, error handling, logging, and clear boundaries.",
    "requirements": "A documented process, sample inputs, desired outputs, exception rules, and access to the systems involved.",
    "deliverables": ["Process map and automation design", "Implemented workflow", "Human review and failure handling", "Usage and audit logging", "Operations runbook"],
    "technologies": ["TypeScript", "Server-side APIs", "AI providers", "Queues and scheduled jobs"],
    "estimated_timeline": "2–6 weeks",
    "price_from_rwf": 400000,
    "price_to_rwf": 3000000,
    "quote_factors": ["Number of systems", "Data sensitivity", "Exception complexity", "Volume", "Monitoring requirements"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 5
  },
  {
    "slug": "database-design-integration",
    "name": "Database Design and Integration",
    "category_slug": "data-cloud",
    "short_description": "A reliable relational data model with secure access policies.",
    "description": "We design and implement relational database schemas, migrations, indexes, and access policies. The work includes integration guidance for your application and backup planning.",
    "requirements": "Entities, relationships, access rules, expected volume, and existing data samples with sensitive fields removed.",
    "deliverables": ["Entity relationship model", "Versioned migrations", "Row-level access policies", "Index and query review", "Backup and recovery guidance"],
    "technologies": ["PostgreSQL", "Supabase", "SQL", "Full-text search where needed"],
    "estimated_timeline": "1–4 weeks",
    "price_from_rwf": 250000,
    "price_to_rwf": 1800000,
    "quote_factors": ["Schema complexity", "Migration volume", "Compliance requirements", "Performance targets"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 6
  },
  {
    "slug": "api-development",
    "name": "API Development",
    "category_slug": "data-cloud",
    "short_description": "Documented, authenticated APIs for products and integrations.",
    "description": "We build secure HTTP APIs with validation, authentication, authorization, rate limiting, error handling, and documentation. APIs are tested against expected failure cases.",
    "requirements": "Consumer needs, endpoint expectations, authentication model, data sensitivity, and expected traffic.",
    "deliverables": ["API specification", "Implemented endpoints", "Authentication and authorization", "Automated tests and documentation", "Deployment configuration"],
    "technologies": ["TypeScript", "Supabase Edge Functions", "PostgreSQL", "OpenAPI"],
    "estimated_timeline": "2–6 weeks",
    "price_from_rwf": 350000,
    "price_to_rwf": 2500000,
    "quote_factors": ["Endpoint count", "Integrations", "Authentication model", "Traffic and rate-limit design"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 7
  },
  {
    "slug": "website-security-assessment",
    "name": "Website Security Assessment",
    "category_slug": "cybersecurity",
    "short_description": "A lawful, scoped review of an authorized website with prioritized findings.",
    "description": "A defensive review of a website or web application you own or are explicitly authorized to assess. We combine configuration review, authenticated manual checks, dependency review, and limited automated scanning. Findings are rated by severity with practical remediation guidance.",
    "requirements": "Written authorization for the exact domains and accounts in scope, a technical contact, maintenance windows, and confirmation that testing will not disrupt production.",
    "deliverables": ["Scope and rules-of-engagement document", "Prioritized findings with evidence", "Remediation recommendations", "Executive summary", "Optional retest quotation"],
    "technologies": ["OWASP guidance", "Configuration review", "Dependency analysis", "Manual verification"],
    "estimated_timeline": "3–10 business days",
    "price_from_rwf": 300000,
    "price_to_rwf": 2000000,
    "quote_factors": ["Application size", "Authentication complexity", "Number of environments", "Testing window", "Reporting depth"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "Assessments are performed only with documented authorization. Automated scanner output alone is not a verified professional assessment. PeaceAI does not perform denial-of-service, social engineering, credential theft, or testing outside the agreed scope. Findings reflect the systems and time tested and cannot guarantee the absence of all vulnerabilities.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 8
  },
  {
    "slug": "authentication-access-control",
    "name": "Authentication and Access Control",
    "category_slug": "cybersecurity",
    "short_description": "Secure sign-in, role management, and server-enforced permissions.",
    "description": "We implement authentication and authorization for new or existing applications, including email verification, password reset, role-based access, database policies, and session hardening.",
    "requirements": "User roles, access rules, identity-provider preferences, and required compliance constraints.",
    "deliverables": ["Authentication flow implementation", "Role and permission model", "Database access policies", "Security review and tests", "Operational documentation"],
    "technologies": ["Supabase Auth", "PostgreSQL RLS", "TypeScript", "Optional MFA providers"],
    "estimated_timeline": "1–4 weeks",
    "price_from_rwf": 250000,
    "price_to_rwf": 1500000,
    "quote_factors": ["Role complexity", "Identity providers", "Migration of existing users", "MFA requirements"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 9
  },
  {
    "slug": "website-maintenance-optimization",
    "name": "Website Maintenance and Optimization",
    "category_slug": "development",
    "short_description": "Ongoing updates, performance work, and security hygiene.",
    "description": "A monthly or project-based maintenance engagement covering dependency updates, performance checks, backup verification, functional testing, and small improvements.",
    "requirements": "Repository or deployment access, a current system inventory, and a named approval contact.",
    "deliverables": ["Maintenance schedule and report", "Dependency and security updates", "Performance recommendations", "Tested releases", "Escalation process"],
    "technologies": ["React", "Node.js", "Cloud hosting", "Monitoring tools"],
    "estimated_timeline": "Monthly retainer",
    "price_from_rwf": 100000,
    "price_to_rwf": 600000,
    "quote_factors": ["System size", "Release frequency", "Monitoring scope", "Response-time requirements"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 10
  },
  {
    "slug": "technical-consulting",
    "name": "Technical Consulting",
    "category_slug": "consulting",
    "short_description": "Focused advice on architecture, delivery risk, and technology choices.",
    "description": "A structured consulting engagement for teams that need an independent technical perspective. We review context and evidence, then provide written recommendations with trade-offs and next steps.",
    "requirements": "A clear question, relevant architecture or code access, and the people who can explain constraints.",
    "deliverables": ["Discovery session", "Written assessment", "Options and trade-offs", "Prioritized recommendations", "Follow-up review session"],
    "technologies": ["Architecture review", "Code review", "Delivery planning", "Security and cost analysis"],
    "estimated_timeline": "3–10 business days",
    "price_from_rwf": 150000,
    "price_to_rwf": 1200000,
    "quote_factors": ["Scope of review", "Number of systems", "Stakeholders", "Urgency", "Report depth"],
    "customer_responsibilities": ["Provide accurate requirements and timely feedback.", "Confirm authorization for any system we assess or integrate with.", "Supply test accounts and access through a secure channel.", "Review deliverables and identify issues within the agreed review window."],
    "terms": "All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.",
    "revision_policy": "Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.",
    "sort_order": 11
  }
]
$seed$::jsonb) as v(
  slug text,
  name text,
  category_slug text,
  short_description text,
  description text,
  requirements text,
  deliverables jsonb,
  technologies jsonb,
  estimated_timeline text,
  price_from_rwf bigint,
  price_to_rwf bigint,
  quote_factors jsonb,
  customer_responsibilities jsonb,
  terms text,
  revision_policy text,
  sort_order integer
)
join public.service_categories c on c.slug = v.category_slug
on conflict (slug) do update
  set name = excluded.name,
      category_id = excluded.category_id,
      short_description = excluded.short_description,
      description = excluded.description,
      requirements = excluded.requirements,
      deliverables = excluded.deliverables,
      technologies = excluded.technologies,
      estimated_timeline = excluded.estimated_timeline,
      price_from_rwf = excluded.price_from_rwf,
      price_to_rwf = excluded.price_to_rwf,
      quote_factors = excluded.quote_factors,
      customer_responsibilities = excluded.customer_responsibilities,
      terms = excluded.terms,
      revision_policy = excluded.revision_policy,
      active = excluded.active,
      sort_order = excluded.sort_order;

insert into public.system_settings (key, value)
values
  ('support_email', '"vitalishimwe03@gmail.com"'::jsonb),
  ('support_phone', '"0792448989"'::jsonb),
  ('signups_enabled', 'true'::jsonb),
  ('ai_fallback_message', '"AI service is temporarily unavailable. Please try again later."'::jsonb)
on conflict (key) do nothing;

-- Promote the first administrator manually after signing up:
--   update public.profiles set role = 'admin' where lower(email) = lower('you@example.com');
