import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, FileWarning } from 'lucide-react'
import { PageHero } from '@/components/marketing/PageHero'
import { env } from '@/lib/env'

interface LegalSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

interface LegalDocument {
  slug: string
  title: string
  summary: string
  sections: LegalSection[]
}

const documents: LegalDocument[] = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary:
      'How PeaceAI intends to collect, use, protect, retain, and delete personal information across the platform.',
    sections: [
      {
        heading: '1. Scope and status',
        paragraphs: [
          'This Privacy Policy describes the intended handling of personal data by PeaceAI across its website, AI assistant, storage, collaboration, service, and billing features. This is a draft prepared for product development and must be reviewed by a qualified legal professional and adapted to Rwanda’s Law No. 058/2021 relating to the protection of personal data and privacy, and any other applicable law, before launch.',
          'PeaceAI does not sell personal data. Where a feature depends on a third-party provider, that provider processes data under its own terms and the configuration chosen by the platform operator.',
        ],
      },
      {
        heading: '2. Information we collect',
        bullets: [
          'Account information: name, email address, authentication identifiers, role, account status, and preferences.',
          'Content you submit: conversations, prompts, files, project proposals, service requests, messages, and support communications.',
          'Usage information: AI usage counts, token estimates, requests per minute, storage use, and feature interactions required to enforce plan limits.',
          'Security and audit data: sign-in events, administrative actions, suspicious activity indicators, and structured audit logs.',
          'Payment metadata: provider references, amount, currency, plan, and status. PeaceAI does not store raw card numbers or card security codes.',
          'Technical information: necessary cookies or local storage, browser session data, IP-derived security signals, and error diagnostics.',
        ],
      },
      {
        heading: '3. How information is used',
        bullets: [
          'Provide authentication, account management, AI conversations, storage, collaboration, and service workflows.',
          'Enforce plan limits, storage quotas, rate limits, and authorization rules.',
          'Process subscriptions, reconcile payments, and prevent duplicate or fraudulent transactions.',
          'Protect the platform, investigate abuse, and maintain administrative audit trails.',
          'Send account, security, and service notifications where configured.',
          'Improve reliability and understand aggregate usage without using private content for advertising.',
        ],
      },
      {
        heading: '4. Legal bases and consent',
        paragraphs: [
          'Depending on the context, processing may rely on performance of a contract, compliance with a legal obligation, legitimate interests in securing and operating the service, or consent. Where consent is required, it must be specific, informed, and withdrawable. This draft does not itself establish a lawful basis; the operator must document applicable bases before launch.',
        ],
      },
      {
        heading: '5. AI processing and third-party providers',
        paragraphs: [
          'AI prompts, selected attachments, and relevant conversation history may be transmitted to a configured language-model provider to generate a response. The platform operator must disclose the provider, data location, retention behavior, and whether provider training is enabled. PeaceAI is designed to support provider-independent integrations and server-side key storage.',
          'Do not submit special-category data, another person’s confidential information, or regulated secrets unless the operator has explicitly enabled an appropriate workflow and you have authority to do so.',
        ],
      },
      {
        heading: '6. Storage, retention, and deletion',
        paragraphs: [
          'Content is stored in private cloud services configured by the operator. Retention periods should be defined for conversations, files, audit logs, payment records, and backups. Deleting an account should initiate deletion or de-identification of associated personal data, subject to legal retention obligations and backup rotation. Some security and financial records may need to be retained for a defined period.',
          'The current application includes account deletion initiation, but the operator must configure and test the server-side deletion workflow, backup policy, and any legally required retention.',
        ],
      },
      {
        heading: '7. Sharing and disclosure',
        bullets: [
          'With users you explicitly choose when you share a file or proposal.',
          'With infrastructure, AI, payment, and email providers necessary to operate the service.',
          'With administrators who need access to perform authorized support, security, or billing tasks.',
          'When required by law or necessary to protect rights, safety, and platform integrity.',
          'In a merger, acquisition, or reorganization, subject to appropriate notice and safeguards.',
        ],
      },
      {
        heading: '8. Security measures',
        paragraphs: [
          'The platform is designed with server-side authorization, row-level security, private storage, signed URLs, input validation, rate limiting, audit logging, and secret management. No system is completely secure. Security controls must be tested, monitored, and updated. Report suspected vulnerabilities under the Security Disclosure Policy.',
        ],
      },
      {
        heading: '9. Your rights and contact',
        paragraphs: [
          `Rights may include access, correction, deletion, restriction, objection, portability, and withdrawal of consent, subject to applicable law. Requests can be sent to ${env.supportEmail}. The operator must verify identity and establish a response process before launch.`,
          'International transfers and the appointment of a data protection officer may be required depending on the operator and processing activities. Obtain legal advice before production use.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    summary:
      'The proposed rules for using PeaceAI, including accounts, acceptable conduct, AI limitations, subscriptions, and liability.',
    sections: [
      {
        heading: '1. Draft terms',
        paragraphs: [
          'These Terms of Service are a development draft. They must be reviewed and adapted to applicable Rwandan law and the operator’s actual business practices before launch. By using the service after launch, a user would agree to the final published terms.',
        ],
      },
      {
        heading: '2. Accounts',
        bullets: [
          'You must provide accurate registration information and keep credentials confidential.',
          'You are responsible for activity under your account, subject to applicable law.',
          'Administrator roles are assigned only through protected administrative actions and are not available through public registration.',
          'Accounts may be suspended for abuse, security risk, non-payment, or violation of policy, with notice where appropriate.',
          'You may request account deletion through account settings or support.',
        ],
      },
      {
        heading: '3. AI features and limitations',
        paragraphs: [
          'AI outputs are probabilistic and may be incomplete, incorrect, biased, insecure, or unsuitable for your purpose. PeaceAI does not guarantee that generated code, plans, security guidance, or summaries are accurate, error-free, secure, or production-ready. You are responsible for human review, testing, legal compliance, and professional validation before relying on output.',
          'Paid plans have limits and do not provide unlimited AI usage. Provider availability and latency may vary. Fallback behavior may return a service-unavailable message.',
          'PeaceAI does not claim to have trained its own foundation model. Model providers and configured models must be disclosed.',
        ],
      },
      {
        heading: '4. Acceptable use',
        paragraphs: [
          'Use of the platform is subject to the Acceptable Use Policy. Prohibited conduct includes unauthorized access, malware, credential theft, attacks, harassment, illegal content, infringement, evasion of limits, and testing systems without authorization.',
        ],
      },
      {
        heading: '5. Your content',
        paragraphs: [
          'You retain ownership of content you submit, subject to rights held by others. You grant the operator a limited license to host, process, transmit, and display that content solely to provide and secure the service. You must have the rights and authorizations needed to upload and share content.',
          'The operator may access content only as needed for administration, security, legal compliance, or support, with audit logging where appropriate.',
        ],
      },
      {
        heading: '6. Subscriptions and payments',
        bullets: [
          'Prices, limits, and features are displayed at checkout and may change with notice.',
          'Subscriptions renew according to the selected billing period until cancelled.',
          'Payment success is confirmed through a verified provider webhook, not a browser redirect.',
          'Paid features may be restricted when payment fails, is reversed, or is pending.',
          'Refunds and cancellation are governed by the Subscription and Refund Policy.',
        ],
      },
      {
        heading: '7. Services marketplace',
        paragraphs: [
          'Service descriptions, price ranges, and timelines are indicative unless a written quotation has been approved. Submitting a request does not create a binding contract. The operator may decline work, request more information, or issue a quotation with assumptions, exclusions, and validity dates.',
          'Custom development and security work requires a separate written agreement for scope, ownership, confidentiality, acceptance, and liability.',
        ],
      },
      {
        heading: '8. Availability and changes',
        paragraphs: [
          'The service may be modified, suspended, or discontinued. Maintenance and provider outages may interrupt access. The operator should publish status, support, and notice channels before launch.',
        ],
      },
      {
        heading: '9. Disclaimers and liability',
        paragraphs: [
          'To the maximum extent permitted by applicable law, the service is provided without warranties beyond those that cannot be excluded. The operator must define limitations of liability, indemnities, and dispute resolution with legal counsel. Nothing in this draft should be treated as a final allocation of legal risk.',
        ],
      },
      {
        heading: '10. Contact',
        paragraphs: [`Questions about these draft terms: ${env.supportEmail}.`],
      },
    ],
  },
  {
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    summary:
      'What may and may not be done with PeaceAI, with particular attention to security testing and AI-generated code.',
    sections: [
      {
        heading: '1. Purpose',
        paragraphs: [
          'This policy is intended to protect users, third parties, and the platform. It is a draft for legal review. Violations may result in content removal, rate limits, suspension, or account termination.',
        ],
      },
      {
        heading: '2. Prohibited activity',
        bullets: [
          'Accessing accounts, systems, or data without explicit authorization.',
          'Phishing, credential theft, malware, ransomware, stealthy surveillance, or evasion of security controls.',
          'Denial-of-service attacks, destructive testing, or testing production systems outside an agreed scope.',
          'Attempting to bypass rate limits, storage quotas, subscription limits, or access controls.',
          'Uploading illegal content, non-consensual intimate imagery, or content that infringes intellectual property.',
          'Harassment, threats, hate, exploitation, or targeting of vulnerable people.',
          'Using AI to facilitate fraud, deception, unauthorized surveillance, or serious harm.',
          'Sharing another user’s private files, proposals, credentials, or personal data without permission.',
          'Probing or scanning PeaceAI itself without written permission under the Security Disclosure Policy.',
        ],
      },
      {
        heading: '3. Security work',
        paragraphs: [
          'PeaceAI offers lawful defensive security services for systems the customer owns or is explicitly authorized to assess. A written scope must identify domains, applications, accounts, time windows, exclusions, and data-handling rules. Automated scanner output is not the same as a verified professional assessment.',
          'Never use the platform to test a system merely because it is publicly reachable. Third-party authorization must be verifiable.',
        ],
      },
      {
        heading: '4. AI content',
        paragraphs: [
          'You are responsible for reviewing AI output before use. Do not present AI-generated work as human-reviewed when it is not. Do not use generated code in production without testing, dependency review, security review, and license checks.',
        ],
      },
      {
        heading: '5. Enforcement and reporting',
        paragraphs: [
          `Report abuse or security concerns to ${env.supportEmail}. Enforcement should be proportionate, documented, and subject to appeal where appropriate. Emergency action may be taken to prevent serious harm or ongoing unauthorized access.`,
        ],
      },
    ],
  },
  {
    slug: 'refunds',
    title: 'Subscription and Refund Policy',
    summary:
      'Proposed rules for plan changes, cancellation, refunds, failed payments, and service quotations. Requires review before launch.',
    sections: [
      {
        heading: '1. Draft and consumer rights',
        paragraphs: [
          'This policy is a draft and must be reviewed under applicable Rwandan consumer-protection and electronic-transaction rules. Nothing here is intended to exclude rights that cannot lawfully be excluded.',
        ],
      },
      {
        heading: '2. Free plan',
        paragraphs: [
          'The Free plan has no subscription charge. Usage limits and feature access may change with notice. No payment method is required.',
        ],
      },
      {
        heading: '3. Paid subscriptions',
        bullets: [
          'Paid plans renew automatically for the selected monthly or annual period until cancelled.',
          'The checkout screen should display the amount, currency, billing period, renewal behavior, and included limits before payment.',
          'Upgrades may take effect immediately or at the next billing cycle as clearly stated. Downgrades normally take effect at the end of the current paid period.',
          'Cancellation stops future renewal but does not automatically refund the current period.',
          'AI usage limits are not a guarantee of availability or a fixed number of successful responses.',
        ],
      },
      {
        heading: '4. Refund eligibility',
        paragraphs: [
          'Refund requests are reviewed case by case. A refund may be considered for duplicate charges, a verified technical failure that prevented access, an unauthorized transaction, or where required by law. Refunds are not normally available for usage already consumed, change of mind after substantial use, or failure to cancel before renewal.',
          'The operator must define statutory withdrawal periods, if applicable, and any exceptions with legal advice.',
        ],
      },
      {
        heading: '5. Failed and disputed payments',
        paragraphs: [
          'If a payment fails or is reversed, paid access may be limited after notice. A user should contact support before initiating a chargeback so the issue can be investigated. Fraudulent or abusive chargebacks may result in account restriction.',
        ],
      },
      {
        heading: '6. Service engagements',
        paragraphs: [
          'Custom development and cybersecurity engagements are governed by the accepted written quotation and any separate agreement. Deposits, milestone payments, cancellation, and refund terms must be stated in that document. Indicative prices on the website are not binding quotations.',
        ],
      },
      {
        heading: '7. How to request help',
        paragraphs: [
          `Contact ${env.supportEmail} with the account email, payment reference, date, amount, and a description of the issue. Never send full card numbers or credentials by email.`,
        ],
      },
    ],
  },
  {
    slug: 'security',
    title: 'Security Disclosure Policy',
    summary:
      'How to report a vulnerability in PeaceAI safely, what is in scope, and what you can expect from the team.',
    sections: [
      {
        heading: '1. Good-faith research',
        paragraphs: [
          'PeaceAI welcomes private reports of security vulnerabilities. Research must be conducted in good faith, within a clearly authorized scope, and without accessing, modifying, exfiltrating, or disrupting data or services beyond what is necessary to demonstrate the issue.',
        ],
      },
      {
        heading: '2. Out of scope without written permission',
        bullets: [
          'Testing accounts or data you do not own.',
          'Denial-of-service, load testing, or destructive actions.',
          'Social engineering, phishing, or physical intrusion.',
          'Malware deployment, persistence, or stealthy monitoring.',
          'Automated scanning that ignores robots or rate limits.',
          'Third-party infrastructure not operated by PeaceAI.',
        ],
      },
      {
        heading: '3. What to report',
        paragraphs: [
          'Include a clear description, affected URL or component, reproduction steps, observed impact, and a safe proof of concept. Do not include unnecessary personal data, secrets, or production credentials. Use synthetic test accounts where possible.',
        ],
      },
      {
        heading: '4. Contact and encryption',
        paragraphs: [
          `Send reports privately to ${env.supportEmail} with the subject “Security disclosure”. If sensitive information must be shared, request a secure channel first. Do not open a public issue containing exploit details.`,
        ],
      },
      {
        heading: '5. Our commitment',
        bullets: [
          'Acknowledge receipt within a reasonable period when the mailbox is monitored.',
          'Investigate and keep the reporter informed of material progress where feasible.',
          'Avoid taking legal action against good-faith researchers who comply with this policy.',
          'Credit a reporter only with explicit consent.',
          'Clearly communicate whether a fix has been deployed and whether a retest is appropriate.',
        ],
      },
      {
        heading: '6. No bounty guarantee',
        paragraphs: [
          'PeaceAI does not currently promise a bug-bounty payment. Any reward is discretionary and must be agreed in writing. This policy does not authorize testing beyond the scope the operator has approved.',
        ],
      },
    ],
  },
]

export function LegalPage() {
  const { slug = '' } = useParams()
  const document = documents.find((item) => item.slug === slug)

  if (!document) {
    return (
      <div className="container-page py-24 text-center">
        <FileWarning className="mx-auto h-8 w-8 text-amber-300" />
        <h1 className="mt-4 text-3xl font-semibold">Legal document not found</h1>
        <p className="mt-2 text-slate-400">Choose a policy from the list below.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {documents.map((item) => (
            <Link key={item.slug} to={`/legal/${item.slug}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white">
              {item.title}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHero eyebrow="Legal" title={document.title} description={document.summary} />
      <section className="container-page py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-100">Draft — legal review required</p>
              <p className="mt-1 text-xs leading-5 text-amber-100/70">
                This document is a product draft, not final legal advice. It must be reviewed and
                adapted to the laws of Rwanda and any other applicable jurisdiction, and to the
                operator’s actual practices, before launch. Last product draft: {new Date().getFullYear()}.
              </p>
            </div>
          </div>

          <Link to="/legal" className="mb-8 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> All legal documents
          </Link>

          <div className="space-y-8">
            {document.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold text-white">{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-sm leading-7 text-slate-400">
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2.5 text-sm leading-6 text-slate-400">
                        <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <div className="mt-12 border-t border-white/[0.08] pt-8">
            <h2 className="text-sm font-semibold">Other policies</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {documents
                .filter((item) => item.slug !== document.slug)
                .map((item) => (
                  <Link
                    key={item.slug}
                    to={`/legal/${item.slug}`}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-slate-300 hover:border-white/20 hover:text-white"
                  >
                    {item.title}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
