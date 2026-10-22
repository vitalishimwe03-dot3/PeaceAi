-- Default catalog. Prices and limits are editable by administrators.
-- Values must stay consistent with the product copy and the public pricing page.

insert into public.plans (
  slug, name, description, price_rwf, annual_price_rwf, billing_period,
  ai_messages_per_day, ai_requests_per_minute, premium_models, storage_bytes,
  proposal_limit_per_month, features, active, sort_order
)
values
  (
    'free', 'Free',
    'Explore PeaceAI and build your first ideas with a generous starting allowance.',
    0, 0, 'month', 25, 5, false, 6442450944, 2,
    $$["25 AI messages per day","Basic code assistance","Selected AI tools","Basic collaboration","6 GiB private cloud storage","Standard response priority"]$$::jsonb,
    true, 1
  ),
  (
    'pro', 'Pro',
    'For developers, students, and professionals who use AI every day.',
    5000, 50000, 'month', 250, 20, true, 6442450944, 25,
    $$["250 AI messages per day","Advanced coding assistance","Expanded project planning","File sharing and collaboration","6 GiB included storage","Premium model access where configured","Higher processing priority"]$$::jsonb,
    true, 2
  ),
  (
    'business', 'Business',
    'Higher limits and team-oriented workflows for organizations.',
    15000, 150000, 'month', 1200, 60, true, 6442450944, 100,
    $$["1,200 AI messages per day","Enhanced collaboration","Team-oriented features","Advanced project workflows","6 GiB included per eligible user","Optional additional storage","Priority support"]$$::jsonb,
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
  ('openrouter', 'openai/gpt-4o-mini', 'PeaceAI Standard', 'Fast, efficient assistance for everyday tasks.', true, false, 1),
  ('openrouter', 'openai/gpt-4o', 'PeaceAI Advanced', 'Stronger reasoning and code generation. Pro and Business plans.', true, true, 2)
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
set name = excluded.name, description = excluded.description;

insert into public.services (
  slug, name, category_id, short_description, description, requirements,
  deliverables, technologies, estimated_timeline, price_from_rwf, price_to_rwf,
  quote_factors, customer_responsibilities, terms, revision_policy, active, sort_order
)
values
  (
    'ai-assisted-website-development', 'AI-Assisted Website Development',
    (select id from public.service_categories where slug = 'development'),
    'A responsive, secure website designed with AI-accelerated workflows and human review.',
    $$We plan, design, and build a professional website around your organization, customers, and goals. AI accelerates research, copy drafting, and implementation, while a developer reviews architecture, accessibility, security, and deployment.$$,
    'Business goals, audience, required pages, brand assets, preferred domain, and examples of sites you like. A content owner must be available for review.',
    $$["Discovery notes and sitemap","Responsive interface implementation","Contact or lead form integration","Basic SEO and accessibility review","Deployment configuration and handover guide"]$$::jsonb,
    $$["React","TypeScript","Tailwind CSS","Supabase or compatible hosting"]$$::jsonb,
    '2–4 weeks', 250000, 900000,
    $$["Number of pages","Custom integrations","Content readiness","Branding and design depth","Deadline"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 1
  ),
  (
    'custom-web-applications', 'Custom Web Applications',
    (select id from public.service_categories where slug = 'development'),
    'Secure dashboards, portals, and business tools built around your workflow.',
    'We build custom web applications with authenticated user roles, database design, and the workflows your team actually needs. The engagement includes requirements discovery, interface design, implementation, testing, and deployment planning.',
    'A clear description of users, workflows, data, integrations, and compliance requirements. Access to decision-makers during discovery.',
    $$["Requirements and data model","Role-based application interface","API and database implementation","Automated tests for critical flows","Deployment and operations documentation"]$$::jsonb,
    $$["React","TypeScript","Supabase PostgreSQL","Edge Functions","Tailwind CSS"]$$::jsonb,
    '4–12 weeks', 900000, 6000000,
    $$["Workflow complexity","User roles","Integrations","Data migration","Testing and compliance needs"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 2
  ),
  (
    'mobile-application-development', 'Mobile Application Development',
    (select id from public.service_categories where slug = 'development'),
    'Cross-platform mobile experiences with a secure cloud backend.',
    'We design and build mobile applications for Android and iOS using cross-platform tooling, with a cloud backend, authentication, notifications, and release guidance.',
    'Target platforms, core user journeys, offline requirements, branding, and store-account ownership.',
    $$["User journey and screen map","Cross-platform application","Backend and authentication setup","Store submission guidance","Handover and maintenance notes"]$$::jsonb,
    $$["React Native or Flutter","TypeScript","Supabase","Push notifications"]$$::jsonb,
    '6–14 weeks', 1500000, 9000000,
    $$["Number of screens","Device integrations","Offline support","Store requirements","Backend complexity"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 3
  ),
  (
    'ai-chatbot-integration', 'AI Chatbot Integration',
    (select id from public.service_categories where slug = 'ai-automation'),
    'A grounded assistant for your website or internal knowledge base.',
    'We integrate a provider-independent AI assistant into your product or website. The assistant can answer from approved knowledge sources with retrieval, source attribution, usage controls, and fallback behavior.',
    'Approved source documents, brand and tone guidance, escalation rules, and an AI provider account or budget approval.',
    $$["Conversation design and guardrails","Secure server-side AI integration","Knowledge indexing workflow","Rate limiting and usage dashboard","Evaluation notes and fallback handling"]$$::jsonb,
    $$["TypeScript","Supabase Edge Functions","pgvector","OpenAI-compatible APIs"]$$::jsonb,
    '2–5 weeks', 500000, 3500000,
    $$["Knowledge volume","Integrations","Escalation flows","Provider costs","Security requirements"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 4
  ),
  (
    'ai-workflow-automation', 'AI Workflow Automation',
    (select id from public.service_categories where slug = 'ai-automation'),
    'Reduce repetitive work with carefully bounded AI automation.',
    'We map repetitive processes and automate suitable steps with AI and standard integrations. Every workflow includes human approval points, error handling, logging, and clear boundaries.',
    'A documented process, sample inputs, desired outputs, exception rules, and access to the systems involved.',
    $$["Process map and automation design","Implemented workflow","Human review and failure handling","Usage and audit logging","Operations runbook"]$$::jsonb,
    $$["TypeScript","Server-side APIs","AI providers","Queues and scheduled jobs"]$$::jsonb,
    '2–6 weeks', 400000, 3000000,
    $$["Number of systems","Data sensitivity","Exception complexity","Volume","Monitoring requirements"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 5
  ),
  (
    'database-design-integration', 'Database Design and Integration',
    (select id from public.service_categories where slug = 'data-cloud'),
    'A reliable relational data model with secure access policies.',
    'We design and implement relational database schemas, migrations, indexes, and access policies. The work includes integration guidance for your application and backup planning.',
    'Entities, relationships, access rules, expected volume, and existing data samples with sensitive fields removed.',
    $$["Entity relationship model","Versioned migrations","Row-level access policies","Index and query review","Backup and recovery guidance"]$$::jsonb,
    $$["PostgreSQL","Supabase","SQL","pgvector where needed"]$$::jsonb,
    '1–4 weeks', 250000, 1800000,
    $$["Schema complexity","Migration volume","Compliance requirements","Performance targets"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 6
  ),
  (
    'api-development', 'API Development',
    (select id from public.service_categories where slug = 'data-cloud'),
    'Documented, authenticated APIs for products and integrations.',
    'We build secure HTTP APIs with validation, authentication, authorization, rate limiting, error handling, and documentation. APIs are tested against expected failure cases.',
    'Consumer needs, endpoint expectations, authentication model, data sensitivity, and expected traffic.',
    $$["API specification","Implemented endpoints","Authentication and authorization","Automated tests and documentation","Deployment configuration"]$$::jsonb,
    $$["TypeScript","Supabase Edge Functions","PostgreSQL","OpenAPI"]$$::jsonb,
    '2–6 weeks', 350000, 2500000,
    $$["Endpoint count","Integrations","Authentication model","Traffic and rate-limit design"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 7
  ),
  (
    'website-security-assessment', 'Website Security Assessment',
    (select id from public.service_categories where slug = 'cybersecurity'),
    'A lawful, scoped review of an authorized website with prioritized findings.',
    'A defensive review of a website or web application you own or are explicitly authorized to assess. We combine configuration review, authenticated manual checks, dependency review, and limited automated scanning. Findings are rated by severity with practical remediation guidance.',
    'Written authorization for the exact domains and accounts in scope, a technical contact, maintenance windows, and confirmation that testing will not disrupt production.',
    $$["Scope and rules-of-engagement document","Prioritized findings with evidence","Remediation recommendations","Executive summary","Optional retest quotation"]$$::jsonb,
    $$["OWASP guidance","Configuration review","Dependency analysis","Manual verification"]$$::jsonb,
    '3–10 business days', 300000, 2000000,
    $$["Application size","Authentication complexity","Number of environments","Testing window","Reporting depth"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'Assessments are performed only with documented authorization. Automated scanner output alone is not a verified professional assessment. PeaceAI does not perform denial-of-service, social engineering, credential theft, or testing outside the agreed scope. Findings reflect the systems and time tested and cannot guarantee the absence of all vulnerabilities.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 8
  ),
  (
    'authentication-access-control', 'Authentication and Access Control',
    (select id from public.service_categories where slug = 'cybersecurity'),
    'Secure sign-in, role management, and server-enforced permissions.',
    'We implement authentication and authorization for new or existing applications, including email verification, password reset, role-based access, database policies, and session hardening.',
    'User roles, access rules, identity-provider preferences, and required compliance constraints.',
    $$["Authentication flow implementation","Role and permission model","Database access policies","Security review and tests","Operational documentation"]$$::jsonb,
    $$["Supabase Auth","PostgreSQL RLS","TypeScript","Optional MFA providers"]$$::jsonb,
    '1–4 weeks', 250000, 1500000,
    $$["Role complexity","Identity providers","Migration of existing users","MFA requirements"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 9
  ),
  (
    'website-maintenance-optimization', 'Website Maintenance and Optimization',
    (select id from public.service_categories where slug = 'development'),
    'Ongoing updates, performance work, and security hygiene.',
    'A monthly or project-based maintenance engagement covering dependency updates, performance checks, backup verification, functional testing, and small improvements.',
    'Repository or deployment access, a current system inventory, and a named approval contact.',
    $$["Maintenance schedule and report","Dependency and security updates","Performance recommendations","Tested releases","Escalation process"]$$::jsonb,
    $$["React","Node.js","Cloud hosting","Monitoring tools"]$$::jsonb,
    'Monthly retainer', 100000, 600000,
    $$["System size","Release frequency","Monitoring scope","Response-time requirements"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 10
  ),
  (
    'technical-consulting', 'Technical Consulting',
    (select id from public.service_categories where slug = 'consulting'),
    'Focused advice on architecture, delivery risk, and technology choices.',
    'A structured consulting engagement for teams that need an independent technical perspective. We review context and evidence, then provide written recommendations with trade-offs and next steps.',
    'A clear question, relevant architecture or code access, and the people who can explain constraints.',
    $$["Discovery session","Written assessment","Options and trade-offs","Prioritized recommendations","Follow-up review session"]$$::jsonb,
    $$["Architecture review","Code review","Delivery planning","Security and cost analysis"]$$::jsonb,
    '3–10 business days', 150000, 1200000,
    $$["Scope of review","Number of systems","Stakeholders","Urgency","Report depth"]$$::jsonb,
    $$["Provide accurate requirements and timely feedback.","Confirm authorization for any system we assess or integrate with.","Supply test accounts and access through a secure channel.","Review deliverables and identify issues within the agreed review window."]$$::jsonb,
    'All projects begin with a written scope and quotation. Estimates are not binding until the quotation is approved by PeaceAI. Deliverables are provided as-is unless a separate maintenance agreement is signed. AI-assisted work is reviewed by a human, but no software can be guaranteed error-free or suitable for every purpose.',
    'Two rounds of revisions are included for a defined milestone unless the quotation states otherwise. New scope is quoted separately.',
    true, 11
  )
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
  ('support_email', to_jsonb('vitalishimwe03@gmail.com'::text)),
  ('support_phone', to_jsonb('0792448989'::text)),
  ('signups_enabled', 'true'::jsonb),
  ('ai_fallback_message', to_jsonb('AI service is temporarily unavailable. Please try again later.'::text))
on conflict (key) do nothing;
