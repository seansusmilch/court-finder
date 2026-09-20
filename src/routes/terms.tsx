import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import SiteFooter from '@/components/site-footer';

const LAST_UPDATED = 'September 20, 2026';

export const Route = createFileRoute('/terms')({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className='min-h-full bg-background'>
      <div className='mx-auto max-w-6xl px-5 py-10 sm:px-8 md:py-16 lg:px-12'>
        <Link
          to='/'
          className='inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background'
        >
          <ArrowLeft className='size-4' />
          Back to Court Finder
        </Link>

        <div className='mt-12 grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-20'>
          <header className='lg:sticky lg:top-8 lg:self-start'>
            <h1 className='max-w-[10ch] font-display text-5xl font-bold leading-[0.98] tracking-[-0.04em] md:text-6xl'>
              Terms of service
            </h1>
            <p className='mt-6 max-w-[34ch] text-base leading-7 text-muted-foreground'>
              The rules for using Court Finder, a free tool for finding possible sports facilities
              in satellite imagery.
            </p>
            <p className='mt-6 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground'>
              Effective {LAST_UPDATED}
            </p>

            <div className='mt-10 border-y border-border py-5 text-sm leading-6'>
              <p className='font-semibold'>The short version</p>
              <p className='mt-2 text-muted-foreground'>
                A pin is a lead, not a promise. Verify the place, its current condition, and
                whether you have permission to use it before you go.
              </p>
            </div>
          </header>

          <article className='max-w-3xl text-[0.98rem] leading-7 text-foreground'>
            <p className='text-lg leading-8'>
              These Terms of Service ("Terms") govern your access to and use of Court Finder (the
              "Service"). In these Terms, "we," "us," and "our" mean Court Finder. By accessing
              or using the Service, you agree to these Terms. If you do not agree, do not use the
              Service.
            </p>

            <section className='mt-12 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>1. What Court Finder does</h2>
              <p className='mt-4'>
                Court Finder helps you explore possible basketball courts, tennis courts, soccer
                or football fields, baseball facilities, and track-and-field facilities. We use
                map and satellite data, computer-vision detections, and community feedback to put
                possible facilities on a map.
              </p>
              <p className='mt-4'>
                The Service is currently offered free of charge. We do not promise that a
                particular feature will always be available or that we will keep offering the
                Service.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>2. Eligibility and accounts</h2>
              <p className='mt-4'>
                You must be able to enter a binding agreement under the laws where you live. If
                you are under the age of majority in your location, use the Service only with a
                parent or legal guardian's permission.
              </p>
              <p className='mt-4'>
                You can browse some parts of Court Finder without an account. An account may be
                required for features such as saving favorites, submitting feedback, or using
                permission-gated tools. Keep your account information accurate and keep your login
                credentials secure. You are responsible for activity that happens through your
                account unless the activity happened because of our failure to secure the Service.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>3. Detections are information, not permission</h2>
              <p className='mt-4'>
                Court Finder's detections are generated from satellite imagery and other data. A
                detection may be wrong, incomplete, outdated, or based on imagery that does not
                show current conditions. A confidence score is a model signal, not a guarantee of
                accuracy.
              </p>
              <p className='mt-4'>
                A map pin does not mean that a location is public, open, safe, accessible, in good
                condition, or available to play. It does not give you permission to enter or use a
                property. Before visiting, verify the location, hours, conditions, rules, and
                access with the property owner or another reliable source. Do not use Court Finder
                as the only source for an emergency, safety-critical decision, or navigation
                decision.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>4. Acceptable use</h2>
              <p className='mt-4'>
                Use the Service lawfully and respect other people, property owners, and the data
                providers whose services appear in Court Finder. You may not:
              </p>
              <ul className='mt-4 list-disc space-y-2 pl-6 marker:text-primary'>
                <li>trespass, encourage trespass, or use a detection as proof that entry is allowed;</li>
                <li>submit feedback that you know is false, misleading, abusive, or unrelated to a detection;</li>
                <li>scrape, crawl, harvest, or bulk-export the Service or its data without written permission;</li>
                <li>use bots or other automated methods that place unreasonable load on the Service;</li>
                <li>probe, scan, reverse engineer, circumvent access controls, or interfere with the Service;</li>
                <li>use another person's account or pretend to be someone else; or</li>
                <li>use the Service to violate a law, regulation, court order, or third-party right.</li>
              </ul>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>5. Your feedback</h2>
              <p className='mt-4'>
                If you confirm, reject, or mark a detection as unclear, you give us permission to
                use that feedback to operate, maintain, improve, and evaluate the Service. This
                permission is worldwide, non-exclusive, royalty-free, and continues after you stop
                using the Service. We may combine feedback with other data and use it in aggregate
                or de-identified form.
              </p>
              <p className='mt-4'>
                Only submit feedback and other material that you have the right to share. Do not
                include sensitive personal information in a feedback submission. You remain
                responsible for what you submit.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>6. Ownership</h2>
              <p className='mt-4'>
                Court Finder, including its software, design, text, logo, and original content, is
                owned by Court Finder or its licensors. We grant you a limited,
                personal, non-exclusive, non-transferable, and revocable right to use the Service
                for its intended purpose. Except for that limited right, these Terms do not give you
                any ownership interest in the Service.
              </p>
              <p className='mt-4'>
                Map data, satellite imagery, geocoding, authentication, computer-vision tools, and
                other third-party materials remain owned by their respective providers. You must
                follow the terms and attribution requirements that apply to those materials.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>7. Third-party services</h2>
              <p className='mt-4'>
                Court Finder relies on third-party services, which may include Mapbox for maps,
                satellite imagery, and location search, Clerk for authentication, and Roboflow for
                computer-vision workflows. Those services may have their own terms, licenses,
                privacy policies, usage limits, and availability requirements. We do not control
                those services and are not responsible for their acts, omissions, content, or
                outages.
              </p>
              <p className='mt-4'>
                Court Finder may link to third-party websites. A link does not mean we endorse or
                control the linked site. Review its terms and privacy policy before using it.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>8. Availability and changes</h2>
              <p className='mt-4'>
                We may change, pause, restrict, or discontinue all or part of the Service at any
                time. The Service may be unavailable because of maintenance, third-party outages,
                network problems, or circumstances outside our control. We may also update or
                remove detections, feedback, features, or other content.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>9. Disclaimer of warranties</h2>
              <p className='mt-4 font-medium'>
                To the maximum extent permitted by law, the Service is provided "as is" and "as
                available" without warranties of any kind, whether express, implied, or statutory.
                We disclaim warranties of accuracy, availability, merchantability, fitness for a
                particular purpose, non-infringement, and any warranty that the Service will be
                uninterrupted, secure, or error-free.
              </p>
              <p className='mt-4'>
                Nothing in these Terms removes a warranty, right, or remedy that applicable law
                does not allow us to exclude.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>10. Limitation of liability</h2>
              <p className='mt-4'>
                To the maximum extent permitted by law, Court Finder and its
                contributors, licensors, and service providers will not be liable for indirect,
                incidental, special, consequential, exemplary, or punitive damages, or for lost
                profits, revenue, data, goodwill, or use, arising from or related to the Service or
                these Terms.
              </p>
              <p className='mt-4'>
                To the maximum extent permitted by law, our total liability for all claims related
                to the Service or these Terms will not exceed the greater of $100 or the amount you
                paid us for the Service during the 12 months before the event giving rise to the
                claim. This limit does not apply where applicable law does not allow it.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>11. Indemnification</h2>
              <p className='mt-4'>
                To the extent permitted by law, you agree to defend, indemnify, and hold harmless
                Court Finder, its contributors, licensors, and service providers from
                claims, losses, liabilities, and expenses, including reasonable legal fees, that
                arise from your breach of these Terms, misuse of the Service, unlawful conduct, or
                feedback you submit.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>12. Suspension and termination</h2>
              <p className='mt-4'>
                You may stop using the Service at any time. We may suspend or terminate access to
                the Service, including an account, if we reasonably believe that you violated these
                Terms, created risk for other people or the Service, or used the Service unlawfully.
                We may also end the Service or a feature for operational reasons.
              </p>
              <p className='mt-4'>
                Sections that by their nature should continue after termination will continue,
                including sections about feedback, ownership, disclaimers, liability,
                indemnification, and disputes.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>13. Changes to these Terms</h2>
              <p className='mt-4'>
                We may update these Terms as the Service changes. We will update the effective date
                above and, where required, provide additional notice for material changes. If you
                keep using the Service after updated Terms take effect, you accept the updated
                Terms. If you do not agree, stop using the Service.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>14. Governing law and disputes</h2>
              <p className='mt-4'>
                These Terms are governed by applicable law, without regard to conflict-of-law
                rules. Any dispute must be brought in a court with authority over it, unless
                mandatory law gives you another forum or right.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>15. General terms</h2>
              <p className='mt-4'>
                If a court finds part of these Terms unenforceable, the rest will remain in effect
                and the court should enforce the affected part as far as the law allows. Our failure
                to enforce a provision is not a waiver of our right to enforce it later. These Terms
                and the Privacy Policy are the complete agreement about your use of the Service,
                unless we give you additional terms for a specific feature.
              </p>
            </section>

            <section className='mt-10 border-t border-border pt-8'>
              <h2 className='font-display text-2xl font-semibold tracking-tight'>16. Contact</h2>
              <p className='mt-4'>
                For questions about these Terms, contact Court Finder through the public project
                repository:
              </p>
              <a
                href='https://github.com/seansusmilch/court-finder/issues'
                target='_blank'
                rel='noreferrer'
                className='mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background'
              >
                Court Finder issue tracker
                <ExternalLink className='size-4' />
              </a>
            </section>

            <p className='mt-10 border-t border-border pt-6 text-sm text-muted-foreground'>
              See also the <Link to='/privacy' className='font-semibold text-foreground underline decoration-primary/40 underline-offset-4 hover:text-primary'>Privacy Policy</Link>.
            </p>
          </article>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
