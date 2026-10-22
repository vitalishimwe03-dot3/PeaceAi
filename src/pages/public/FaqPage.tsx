import { Link } from 'react-router-dom'
import { PageHero } from '@/components/marketing/PageHero'
import { fallbackFaqs } from '@/lib/catalog'

export function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Frequently asked questions"
        title={<>Straight answers about PeaceAI.</>}
        description="How the platform works, what is included, what requires configuration, and where human review matters."
      />
      <section className="container-page py-16">
        <div className="mx-auto max-w-3xl divide-y divide-white/[0.07] rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6">
          {fallbackFaqs.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span className="text-lg font-light text-slate-500 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 pr-8 text-sm leading-7 text-slate-400">{faq.answer}</p>
            </details>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-slate-400">
            Still unsure?{' '}
            <Link to="/contact" className="font-medium text-accent hover:text-accent-light">
              Ask the PeaceAI team
            </Link>
            . We will not pretend an unavailable integration is active.
          </p>
        </div>
      </section>
    </>
  )
}
