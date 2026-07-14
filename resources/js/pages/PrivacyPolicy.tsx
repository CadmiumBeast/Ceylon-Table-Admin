import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/**
 * Ceylon Table — Privacy Policy
 * Route suggestion: Route::get('/privacy-policy', ...)->name('privacy-policy');
 *
 * Design tokens (matches the app's existing AppColors system):
 *   ceylonAmber : #C89B3C  — accent, links, active states
 *   midnight    : #1B2230  — headings, primary text
 *   pearlCream  : #FAF6EC  — page background
 *   ink-soft    : #4A4F5C  — body text
 *   hairline    : #E7DFCC  — dividers, borders
 *
 * Fonts: display = 'Fraunces' (serif, warmth of a tea-house sign),
 *        body/UI = 'Inter' (clean, legible at small legal-text sizes)
 * Loaded via Google Fonts link tag below — swap for local fonts if you
 * already self-host these elsewhere in the app.
 */

const EFFECTIVE_DATE = 'July 14, 2026';
const LAST_UPDATED = 'July 14, 2026';
const APP_NAME = 'Ceylon Table';
const COMPANY_EMAIL = 'shakeelshajahan212@gmail.com';
const COMPANY_ADDRESS = 'Ceylon Table, Sri Lanka';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'information-we-collect', label: 'Information we collect' },
  { id: 'location-data', label: 'Location data' },
  { id: 'how-we-use-it', label: 'How we use it' },
  { id: 'how-we-store-it', label: 'How we store it' },
  { id: 'sharing', label: 'Sharing your information' },
  { id: 'your-rights', label: 'Your rights and choices' },
  { id: 'children', label: "Children's privacy" },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact us' },
];

export default function PrivacyPolicy() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Head title="Privacy Policy" />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          '--ceylon-amber': '#C89B3C',
          '--midnight': '#1B2230',
          '--pearl-cream': '#FAF6EC',
          '--ink-soft': '#4A4F5C',
          '--hairline': '#E7DFCC',
          fontFamily: "'Inter', sans-serif",
          backgroundColor: 'var(--pearl-cream)',
          color: 'var(--midnight)',
          minHeight: '100vh',
        }}
      >
        {/* Header */}
        <header
          style={{ borderBottom: '1px solid var(--hairline)' }}
          className="relative overflow-hidden"
        >
          <SteamMotif />
          <div className="max-w-5xl mx-auto px-6 pt-16 pb-14 relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm mb-10 transition-opacity hover:opacity-70"
              style={{ color: 'var(--ink-soft)' }}
            >
              <span aria-hidden="true">←</span> Back to {APP_NAME}
            </Link>

            <p
              className="text-sm tracking-[0.18em] uppercase mb-4"
              style={{ color: 'var(--ceylon-amber)', fontWeight: 600 }}
            >
              {APP_NAME} · Mobile App
            </p>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 500,
                fontSize: 'clamp(2.25rem, 5vw, 3.25rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.01em',
              }}
            >
              Privacy Policy
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
              A plain explanation of what we collect when you order through {APP_NAME},
              why we collect it, and what stays entirely in your control.
            </p>
            <div
              className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm"
              style={{ color: 'var(--ink-soft)' }}
            >
              <span>Effective {EFFECTIVE_DATE}</span>
              <span aria-hidden="true">·</span>
              <span>Last updated {LAST_UPDATED}</span>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-12">
          {/* On-page nav */}
          <nav className="hidden md:block sticky top-10 self-start">
            <p
              className="text-xs uppercase tracking-[0.14em] mb-4"
              style={{ color: 'var(--ink-soft)' }}
            >
              On this page
            </p>
            <ul className="space-y-1 border-l" style={{ borderColor: 'var(--hairline)' }}>
              {SECTIONS.map((s) => {
                const active = activeId === s.id;
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block pl-4 py-1.5 text-[13.5px] leading-snug transition-colors"
                      style={{
                        borderLeft: active ? '2px solid var(--ceylon-amber)' : '2px solid transparent',
                        marginLeft: '-1px',
                        color: active ? 'var(--midnight)' : 'var(--ink-soft)',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {s.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Mobile nav */}
          <details className="md:hidden mb-2 rounded-lg" style={{ border: '1px solid var(--hairline)' }}>
            <summary
              className="px-4 py-3 text-sm cursor-pointer select-none"
              style={{ color: 'var(--midnight)', fontWeight: 600 }}
            >
              Jump to section
            </summary>
            <ul className="px-4 pb-3 space-y-2">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-sm" style={{ color: 'var(--ceylon-amber)' }}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>

          {/* Content */}
          <main className="min-w-0">
            <Section id="overview" title="Overview">
              <p>
                {APP_NAME} is a restaurant ordering app. This policy covers the information
                we collect through the mobile app and how it's used — nothing more than
                what's needed to take your order, get it to the right table or address, and
                keep your account working.
              </p>
              <p>
                We don't run ads, we don't use analytics or tracking SDKs, and we don't sell
                or share your data with third parties. If that ever changes, we'll update
                this policy and let you know before it takes effect.
              </p>
            </Section>

            <Section id="information-we-collect" title="Information we collect">
              <p>We collect information you give us directly when you use the app:</p>
              <DataTable
                rows={[
                  ['Name', 'To personalize your account and identify your orders.'],
                  ['Email address', 'For account login, order confirmations, and support.'],
                  ['Phone number', 'So our staff or delivery contact can reach you about an order.'],
                  ['Delivery address', 'To route your order to the correct location.'],
                  [
                    'Order history',
                    'Items ordered, order status, and payment method selected (e.g. bank transfer), kept so you can view past orders.',
                  ],
                  [
                    'Payment receipt image',
                    'If you upload a bank transfer receipt at checkout, that image is stored to verify and reconcile your payment.',
                  ],
                ]}
              />
              <p className="mt-5">
                We do not collect your card numbers or bank credentials — bank transfers are
                verified manually by our staff from the receipt you upload, not through an
                automated payment gateway.
              </p>
            </Section>

            <Section id="location-data" title="Location data">
              <p>
                With your permission, the app can use your device's location to pre-fill your
                delivery address or suggest the nearest branch. Location is only accessed
                while you're actively placing an order — we don't track your location in the
                background or store a location history.
              </p>
              <p>
                You can decline this permission or turn it off at any time in your device
                settings; you'll just need to type your delivery address manually instead.
              </p>
            </Section>

            <Section id="how-we-use-it" title="How we use it">
              <List
                items={[
                  'Creating and maintaining your account',
                  'Taking, confirming, and delivering your orders',
                  'Verifying bank transfer payments against uploaded receipts',
                  'Sending order status updates and receipts',
                  'Responding to support requests',
                  'Keeping the app secure and preventing misuse',
                ]}
              />
              <p className="mt-5">
                We do not use your information for advertising, and we do not build profiles
                of you for marketing purposes.
              </p>
            </Section>

            <Section id="how-we-store-it" title="How we store it">
              <p>
                Your data is stored on secured servers and protected in transit with
                encryption (HTTPS). Access is limited to the {APP_NAME} staff who need it to
                fulfil orders or provide support — for example, kitchen and front-of-house
                staff see order details, while payment receipts are only reviewed by staff
                handling payment verification.
              </p>
              <p>
                We keep order history and receipts for as long as your account is active, or
                as needed to meet accounting and tax obligations. You can request deletion of
                your account and associated data at any time — see{' '}
                <a href="#your-rights" style={{ color: 'var(--ceylon-amber)', fontWeight: 600 }}>
                  Your rights and choices
                </a>
                .
              </p>
            </Section>

            <Section id="sharing" title="Sharing your information">
              <p>
                We do not sell, rent, or share your personal information with third parties
                for their own marketing purposes. The only cases where information leaves
                {' '}{APP_NAME} are:
              </p>
              <List
                items={[
                  'When required by law, such as a valid request from a regulatory or tax authority.',
                  'To protect the rights, safety, or property of Ceylon Table, our staff, or our customers.',
                  'With a service provider strictly to keep the app running (e.g. our hosting provider), and only under a duty to keep your data confidential.',
                ]}
              />
            </Section>

            <Section id="your-rights" title="Your rights and choices">
              <p>You're in control of your information. At any time, you can:</p>
              <List
                items={[
                  'View and update your profile details from the app',
                  'Ask us for a copy of the personal data we hold about you',
                  'Ask us to correct inaccurate information',
                  'Ask us to delete your account and associated data',
                  'Withdraw location permission from your device settings',
                ]}
              />
              <p className="mt-5">
                To exercise any of these, contact us at{' '}
                <a href={`mailto:${COMPANY_EMAIL}`} style={{ color: 'var(--ceylon-amber)', fontWeight: 600 }}>
                  {COMPANY_EMAIL}
                </a>
                . We'll respond within a reasonable time, and may ask you to verify your
                identity first.
              </p>
            </Section>

            <Section id="children" title="Children's privacy">
              <p>
                {APP_NAME} is not directed at children, and we don't knowingly collect
                information from anyone under 13. If you believe a child has provided us
                with personal information, contact us and we'll remove it.
              </p>
            </Section>

            <Section id="changes" title="Changes to this policy">
              <p>
                If we make material changes to how we handle your information, we'll update
                the "last updated" date above and notify you in the app before the change
                takes effect. Continuing to use {APP_NAME} after a change takes effect means
                you accept the updated policy.
              </p>
            </Section>

            <Section id="contact" title="Contact us" last>
              <p>Questions about this policy or your data? Reach us at:</p>
              <div
                className="mt-4 rounded-xl px-6 py-5"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--hairline)' }}
              >
                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: '1.05rem' }}>
                  {APP_NAME}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
                  {COMPANY_ADDRESS}
                </p>
                <p className="text-sm mt-3">
                  <a href={`mailto:${COMPANY_EMAIL}`} style={{ color: 'var(--ceylon-amber)', fontWeight: 600 }}>
                    {COMPANY_EMAIL}
                  </a>
                </p>
              </div>
            </Section>
          </main>
        </div>
      </div>
    </>
  );
}

/* ---------- Building blocks ---------- */

function Section({ id, title, children, last = false }) {
  return (
    <section
      id={id}
      className={last ? 'scroll-mt-10' : 'scroll-mt-10 pb-10 mb-10'}
      style={last ? {} : { borderBottom: '1px solid var(--hairline)' }}
    >
      <h2
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 500,
          fontSize: '1.55rem',
          letterSpacing: '-0.01em',
        }}
        className="mb-4"
      >
        {title}
      </h2>
      <div
        className="space-y-4 text-[15px] leading-relaxed"
        style={{ color: 'var(--ink-soft)' }}
      >
        {children}
      </div>
    </section>
  );
}

function List({ items }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-[9px] w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'var(--ceylon-amber)' }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DataTable({ rows }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hairline)' }}>
      {rows.map(([label, desc], i) => (
        <div
          key={label}
          className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-6 px-5 py-4"
          style={{
            backgroundColor: i % 2 === 0 ? '#FFFFFF' : 'transparent',
            borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
          }}
        >
          <span style={{ color: 'var(--midnight)', fontWeight: 600 }} className="text-sm">
            {label}
          </span>
          <span className="text-sm">{desc}</span>
        </div>
      ))}
    </div>
  );
}

/** Subtle decorative steam-swirl, evoking a cup of Ceylon tea — the page's
 *  one signature flourish. Pure CSS/SVG, no external assets. */
function SteamMotif() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 200"
      className="absolute -top-6 -right-10 w-72 opacity-[0.07] pointer-events-none"
      style={{ color: 'var(--ceylon-amber)' }}
    >
      <path
        d="M40 200 C40 150 80 150 80 100 C80 50 40 50 40 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M140 200 C140 160 180 160 180 110 C180 60 140 60 140 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M240 200 C240 145 280 145 280 95 C280 45 240 45 240 -5"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}
