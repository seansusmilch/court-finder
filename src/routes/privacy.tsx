import { createFileRoute } from '@tanstack/react-router';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

import SiteFooter from '@/components/site-footer';

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy policy | Court Finder' },
      {
        name: 'description',
        content: 'How Court Finder collects, uses, shares, and protects information.',
      },
    ],
  }),
  component: PrivacyPage,
});

const effectiveDate = 'September 20, 2026';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'information-we-collect', label: 'Information we collect' },
  { id: 'how-we-use-information', label: 'How we use information' },
  { id: 'sharing', label: 'Sharing and providers' },
  { id: 'retention', label: 'Retention and security' },
  { id: 'your-choices', label: 'Your choices and rights' },
  { id: 'other-important-details', label: 'Other important details' },
  { id: 'contact', label: 'Privacy requests' },
];

function PolicySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className='scroll-mt-28 border-t border-border/80 pt-10 first:border-t-0 first:pt-0'>
      <h2 className='font-display text-2xl font-semibold tracking-tight md:text-3xl'>{title}</h2>
      <div className='mt-5 space-y-5 text-base leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-primary/60 [&_a]:underline-offset-4 [&_a:hover]:text-primary [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5'>
        {children}
      </div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className='min-h-full bg-background'>
      <header className='border-b border-border/80'>
        <div className='mx-auto grid max-w-[90rem] gap-8 px-5 py-12 sm:px-8 md:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-12 xl:px-16'>
          <div>
            <p className='font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary'>
              Court Finder / privacy
            </p>
            <h1 className='mt-5 max-w-3xl text-balance font-display text-4xl font-bold leading-[1.03] tracking-[-0.035em] md:text-6xl'>
              Privacy that stays close to the map.
            </h1>
            <p className='mt-6 max-w-2xl text-lg leading-8 text-muted-foreground'>
              This policy explains what Court Finder handles when you browse possible facilities,
              use the map, create an account, submit feedback, or run an authorized scan.
            </p>
          </div>

          <div className='rounded-xl border border-border bg-muted/30 p-5 md:p-6'>
            <div className='flex items-start gap-3'>
              <ShieldCheck className='mt-0.5 size-5 shrink-0 text-accent' aria-hidden='true' />
              <div>
                <p className='font-display font-semibold text-foreground'>Plain-language notice</p>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                  We collect the information needed to run Court Finder, keep accounts secure, and
                  improve facility detections. We do not sell personal information.
                </p>
                <p className='mt-4 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
                  Effective {effectiveDate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className='mx-auto grid max-w-[90rem] gap-12 px-5 py-12 sm:px-8 md:py-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-12 xl:grid-cols-[240px_minmax(0,760px)] xl:gap-20 xl:px-16'>
        <aside className='lg:sticky lg:top-24 lg:self-start'>
          <p className='font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>
            On this page
          </p>
          <nav aria-label='Privacy policy sections' className='mt-4 border-l border-border'>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className='-ml-px block border-l-2 border-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              >
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className='min-w-0 space-y-10'>
          <PolicySection id='overview' title='Overview'>
            <p>
              Court Finder is a map-based service that helps people find possible sports facilities
              in satellite imagery. In this policy, "Court Finder," "we," "us," and "our" refer to
              the person or entity operating the Service. The Service includes the Court Finder web
              application and related features.
            </p>
            <p>
              This policy covers information we collect or receive through the Service. It does not
              cover the independent privacy practices of providers such as Clerk, Mapbox, Convex, or
              Roboflow. Those providers publish their own notices, linked in the{' '}
              <a href='#sharing'>sharing and providers section</a>.
            </p>
          </PolicySection>

          <PolicySection id='information-we-collect' title='Information we collect'>
            <p>
              We collect information directly from you, automatically when you use the Service, and
              from service providers that help us operate it.
            </p>

            <div className='overflow-x-auto rounded-xl border border-border'>
              <table className='w-full min-w-[620px] border-collapse text-left text-sm'>
                <caption className='sr-only'>Categories of information handled by Court Finder</caption>
                <thead className='bg-muted/50 text-foreground'>
                  <tr>
                    <th scope='col' className='px-4 py-3 font-display font-semibold'>
                      Category
                    </th>
                    <th scope='col' className='px-4 py-3 font-display font-semibold'>
                      Examples
                    </th>
                    <th scope='col' className='px-4 py-3 font-display font-semibold'>
                      Where it goes
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  <tr>
                    <th scope='row' className='px-4 py-4 align-top font-medium text-foreground'>
                      Account and identity
                    </th>
                    <td className='px-4 py-4 align-top'>Name, email address, profile details, sign-in credentials, and session information.</td>
                    <td className='px-4 py-4 align-top'>Clerk manages sign-in. Court Finder stores a Clerk user ID to connect your account to your activity.</td>
                  </tr>
                  <tr>
                    <th scope='row' className='px-4 py-4 align-top font-medium text-foreground'>
                      Feedback and account activity
                    </th>
                    <td className='px-4 py-4 align-top'>Your "yes," "no," or "unsure" response to a possible facility, along with the related detection and timestamps.</td>
                    <td className='px-4 py-4 align-top'>Convex stores this information so we can prevent duplicate submissions and review detection quality.</td>
                  </tr>
                  <tr>
                    <th scope='row' className='px-4 py-4 align-top font-medium text-foreground'>
                      Scan and facility data
                    </th>
                    <td className='px-4 py-4 align-top'>Authorized scan coordinates, radius, model and version, scan progress, tile identifiers, detections, and confidence scores.</td>
                    <td className='px-4 py-4 align-top'>Convex stores the records. Mapbox supplies imagery and location data. Roboflow processes imagery and model inferences.</td>
                  </tr>
                  <tr>
                    <th scope='row' className='px-4 py-4 align-top font-medium text-foreground'>
                      Location and map requests
                    </th>
                    <td className='px-4 py-4 align-top'>A location you search for, map coordinates you view, and precise device location if you grant browser permission.</td>
                    <td className='px-4 py-4 align-top'>Mapbox receives the search, map, geocoding, and imagery requests needed to provide its services. The current web app does not save browser location to your Court Finder account.</td>
                  </tr>
                  <tr>
                    <th scope='row' className='px-4 py-4 align-top font-medium text-foreground'>
                      Browser storage and technical data
                    </th>
                    <td className='px-4 py-4 align-top'>Saved favorites, map position and filters, theme choice, cookies or tokens needed for authentication, IP address, device, browser, and request information.</td>
                    <td className='px-4 py-4 align-top'>Favorites and map preferences stay in your browser. Authentication and infrastructure providers may receive technical request data.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              Please do not submit sensitive personal information in feedback or other fields. Court
              Finder does not ask for health, financial, biometric, or government-identification
              information.
            </p>
          </PolicySection>

          <PolicySection id='how-we-use-information' title='How we use information'>
            <p>We use information for the following purposes:</p>
            <ul>
              <li>Provide the map, location search, satellite imagery, facility detections, account features, and feedback tools.</li>
              <li>Authenticate users, enforce permissions, prevent abuse, apply scan limits, and secure the Service.</li>
              <li>Connect feedback to detections, review model performance, and improve facility detection workflows.</li>
              <li>Diagnose errors, maintain infrastructure, understand basic Service performance, and respond to support or privacy requests.</li>
              <li>Meet legal obligations, enforce our terms, protect the Service and its users, and handle a business transaction if one occurs.</li>
            </ul>
            <p>
              Court Finder uses computer vision to identify possible facilities in satellite imagery.
              Model outputs and confidence scores describe the system's detection process. They do
              not make decisions about a person, determine eligibility, or establish that a location
              is public, open, safe, accessible, or available to use.
            </p>
          </PolicySection>

          <PolicySection id='sharing' title='Sharing and providers'>
            <p>
              We share information only when needed to provide the Service, protect it, comply with
              law, or complete a business transaction. We do not sell personal information, and we
              do not use it for cross-context behavioral advertising.
            </p>
            <div className='space-y-4'>
              <div className='border-l-2 border-primary/70 pl-4'>
                <h3>Clerk</h3>
                <p className='mt-1'>Clerk provides authentication and user management. Clerk may handle account, sign-in, and security information under its own privacy notice.</p>
                <a className='mt-2 inline-flex items-center gap-1 text-sm' href='https://clerk.com/legal/privacy' target='_blank' rel='noreferrer'>
                  Clerk privacy policy <ArrowUpRight className='size-3.5' aria-hidden='true' />
                </a>
              </div>
              <div className='border-l-2 border-primary/70 pl-4'>
                <h3>Mapbox</h3>
                <p className='mt-1'>Mapbox provides maps, satellite tiles, search, and geocoding. Your map and search requests, including coordinates needed for those requests, may be processed by Mapbox.</p>
                <a className='mt-2 inline-flex items-center gap-1 text-sm' href='https://www.mapbox.com/legal/privacy' target='_blank' rel='noreferrer'>
                  Mapbox privacy policy <ArrowUpRight className='size-3.5' aria-hidden='true' />
                </a>
              </div>
              <div className='border-l-2 border-primary/70 pl-4'>
                <h3>Convex</h3>
                <p className='mt-1'>Convex hosts the application database and backend functions that store account links, feedback, scans, detection records, and related operational data.</p>
                <a className='mt-2 inline-flex items-center gap-1 text-sm' href='https://www.convex.dev/security' target='_blank' rel='noreferrer'>
                  Convex security information <ArrowUpRight className='size-3.5' aria-hidden='true' />
                </a>
              </div>
              <div className='border-l-2 border-primary/70 pl-4'>
                <h3>Roboflow</h3>
                <p className='mt-1'>Authorized scan and training workflows send satellite tile URLs, detection data, and feedback labels to Roboflow for inference or model-training operations. We do not send your account email or authentication credentials to Roboflow for these workflows.</p>
                <a className='mt-2 inline-flex items-center gap-1 text-sm' href='https://roboflow.com/privacy' target='_blank' rel='noreferrer'>
                  Roboflow privacy policy <ArrowUpRight className='size-3.5' aria-hidden='true' />
                </a>
              </div>
            </div>
            <p>
              We may also share information with vendors that provide hosting, security, logging,
              legal, or professional services; with authorities when required by law; or with a
              successor in a merger, acquisition, financing, or sale of assets. Those parties may
              access information only as needed for the relevant purpose and subject to appropriate
              obligations.
            </p>
          </PolicySection>

          <PolicySection id='retention' title='Retention and security'>
            <p>
              We keep information for as long as it is needed for the purposes described here. In
              general, account-link records, feedback, scan records, and detection-related activity
              are retained while they support your account, Service operations, security, or model
              improvement. Browser-stored favorites and preferences remain until you remove them or
              clear the site's storage. Providers may apply their own retention periods.
            </p>
            <p>
              When information is no longer needed, we delete it, de-identify it, or aggregate it
              where practical. We may retain limited information for legal claims, fraud prevention,
              security investigations, backups, or other lawful reasons. If you ask us to delete your
              account or information, we will review the request and apply these rules to information
              we control.
            </p>
            <p>
              We use reasonable administrative, technical, and organizational safeguards designed to
              protect information from unauthorized access, loss, misuse, or alteration. No internet
              service can guarantee perfect security. If we become aware of a breach that requires
              notice, we will provide notice as required by applicable law.
            </p>
          </PolicySection>

          <PolicySection id='your-choices' title='Your choices and rights'>
            <h3>Choices in the Service</h3>
            <ul>
              <li>You can browse the map without creating an account.</li>
              <li>You can deny or later withdraw browser permission for device location. The map can still be used without that permission, though distance or centering features may not work.</li>
              <li>You can remove favorites and map preferences by changing them in the Service or clearing Court Finder site data in your browser.</li>
              <li>You can manage sign-in and account details through Clerk's account tools.</li>
            </ul>

            <h3>Privacy requests</h3>
            <p>
              Depending on where you live, you may have rights to access, correct, delete, or obtain
              a copy of your personal information; restrict or object to certain processing; withdraw
              consent where processing relies on consent; and complain to a data-protection authority.
              California residents may also have rights to know, delete, correct, limit the use of
              sensitive personal information, opt out of sale or sharing, and receive equal service.
              Court Finder does not sell or share personal information for cross-context behavioral
              advertising.
            </p>
            <p>
              To submit a request, use the account controls provided by Clerk for account information
              or the support channel provided with your Court Finder access for information held by
              Court Finder. Tell us what you are asking for and the account identifier, if you have
              one. We may ask for information needed to verify your identity. We will respond within
              the time required by applicable law and may explain if an exception applies.
            </p>
            <p>
              If you are in the European Economic Area, the United Kingdom, or Switzerland, you may
              also lodge a complaint with your local data-protection authority. If we rely on
              legitimate interests, you may object to that processing where applicable.
            </p>
          </PolicySection>

          <PolicySection id='other-important-details' title='Other important details'>
            <h3>Children</h3>
            <p>
              Court Finder is not directed to children under 13, or a higher minimum age where local
              law requires one. We do not knowingly collect personal information from children below
              that age. If you believe a child provided personal information, contact us so we can
              review and delete it when required.
            </p>

            <h3>International processing</h3>
            <p>
              Court Finder and its providers may process information in the United States and other
              countries. Where applicable law requires safeguards for an international transfer, we
              will use a permitted transfer mechanism, such as an adequacy decision or standard
              contractual clauses.
            </p>

            <h3>Cookies and similar technologies</h3>
            <p>
              Court Finder uses cookies or similar browser storage that are necessary for
              authentication, security, theme settings, favorites, map position, and map filters.
              We do not currently operate a separate advertising or analytics tracker. Third-party
              providers may use their own cookies, SDKs, logs, or similar technologies when you use
              their services. Their policies govern those practices.
            </p>

            <h3>Changes to this policy</h3>
            <p>
              We may update this policy when the Service, providers, or applicable requirements
              change. We will post the updated version here and change the effective date. If a change
              materially affects how we use personal information, we will provide any additional
              notice required by law.
            </p>
          </PolicySection>

          <PolicySection id='contact' title='Privacy requests'>
            <p>
              Court Finder does not publish the operator's personal name, home address, or personal
              email in this notice. Use the support or account channel provided with your access to
              Court Finder for questions, requests, or concerns about this policy.
            </p>
            <p className='font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground'>
              Last updated {effectiveDate}
            </p>
          </PolicySection>
        </article>
      </div>

      <SiteFooter />
    </div>
  );
}
