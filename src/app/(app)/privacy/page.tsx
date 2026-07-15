// src/app/(app)/privacy/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Aniotako. Learn what information we collect, how we protect it, and your choices regarding your personal watchlist data.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "July 15, 2026";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-zinc-300">

      {/* Header */}
      <div className="border-b border-zinc-800 pb-8 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Privacy Policy
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          Last Updated:{" "}
          <span className="text-zinc-200 font-medium">{lastUpdated}</span>
        </p>
      </div>

      {/* Summary Box */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 mb-10 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <svg
            className="w-5 h-5 text-cyan-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Our Commitment to Your Privacy
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          Aniotako (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
          developed and operated from{" "}
          <strong className="text-white">
            Lucknow, Uttar Pradesh, India
          </strong>{" "}
          by a solo independent developer. We collect only the minimum
          information necessary to operate our personal anime tracking and
          schedule countdown service. This Privacy Policy explains what data we
          collect, how we use it, which external services are involved, and what
          rights you have under applicable law — including India&apos;s{" "}
          <strong className="text-white">
            Digital Personal Data Protection Act, 2023 (DPDP Act)
          </strong>
          .
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-10 text-sm leading-relaxed text-zinc-300">

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              1
            </span>
            Legal Basis for Processing
          </h2>
          <p>
            Under India&apos;s{" "}
            <strong className="text-white">
              Digital Personal Data Protection Act, 2023
            </strong>{" "}
            and other applicable privacy laws, we process your personal data
            based on:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-400">
            <li>
              <strong className="text-zinc-200">Your Consent:</strong> By
              creating an account and agreeing to these policies at registration,
              you consent to the collection and use of your data as described in
              this policy. You may withdraw consent at any time by deleting your
              account.
            </li>
            <li>
              <strong className="text-zinc-200">
                Legitimate Interests / Contractual Necessity:
              </strong>{" "}
              Certain data (such as session cookies and server logs) is
              processed to provide, maintain, and secure the Service you have
              requested.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              2
            </span>
            Information We Collect
          </h2>
          <p>
            We collect limited account and usage data necessary to operate the
            application:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-400">
            <li>
              <strong className="text-zinc-200">Account Information:</strong>{" "}
              When you register, our authentication service collects your email
              address and securely manages encrypted authentication credentials.
              You may also provide a display name.
            </li>
            <li>
              <strong className="text-zinc-200">
                Watchlist &amp; Preferences:
              </strong>{" "}
              We store the anime titles you track (using third-party catalog IDs
              such as AniList or MyAnimeList IDs), watch progress, scores,
              localized timezone selection, and display preferences.
            </li>
            <li>
              <strong className="text-zinc-200">
                Push Notification Subscriptions:
              </strong>{" "}
              If you opt in to receive desktop push notifications, our
              application stores your browser&apos;s Web Push endpoint URL and
              standard encryption keys (p256dh and auth) to deliver alerts.
            </li>
            <li>
              <strong className="text-zinc-200">
                Server &amp; Connection Logs:
              </strong>{" "}
              Like most web applications, our cloud hosting infrastructure
              automatically records basic request logs (such as IP addresses,
              browser types, and request timestamps) for security monitoring and
              error diagnosis. These logs are retained for approximately{" "}
              <strong className="text-zinc-200">30 days</strong> and then
              automatically purged.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              3
            </span>
            What We Do NOT Collect
          </h2>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-400">
            <li>
              <strong className="text-zinc-200">No Analytics Tracking:</strong>{" "}
              We do not use Google Analytics, advertising pixels, behavioral
              tracking, or any user-level analytics tools. We do not build
              profiles of your browsing behavior.
            </li>
            <li>
              <strong className="text-zinc-200">No Advertising:</strong> We do
              not show ads and have no relationships with ad networks.
            </li>
            <li>
              <strong className="text-zinc-200">No Data Selling:</strong> We
              never sell, rent, trade, or monetize your personal data to any
              third party.
            </li>
            <li>
              <strong className="text-zinc-200">
                Google Search Console (Aggregate Only):
              </strong>{" "}
              Our site is registered with Google Search Console to monitor
              search indexing performance. This provides only anonymous,
              aggregate data (e.g., search impressions and clicks) and does not
              identify individual users or collect any personal data.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              4
            </span>
            How We Use Your Information
          </h2>
          <p>
            We use your information strictly to provide and maintain the
            Aniotako service:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-400">
            <li>
              To authenticate your identity and keep your personal watchlist
              synced across devices.
            </li>
            <li>
              To calculate airing countdowns tailored to your selected timezone
              (e.g., Asia/Kolkata).
            </li>
            <li>
              To schedule and deliver browser push notifications when your
              tracked episodes air.
            </li>
            <li>
              To respect your application settings (such as hiding adult content
              unless explicitly enabled).
            </li>
            <li>
              To protect the application against automated abuse, unauthorized
              access, and technical errors.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              5
            </span>
            External Services &amp; Infrastructure
          </h2>
          <p>
            To provide dynamic anime catalogs, broadcast timetables, and
            reliable hosting, our application relies on external cloud
            infrastructure and APIs:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
            <div>
              <strong className="text-white block">
                Metadata &amp; Schedule APIs (AniList, Jikan/MyAnimeList,
                AnimeSchedule):
              </strong>
              <p className="text-zinc-400 mt-1">
                When you search for anime, view summaries, or check airing
                times, queries are sent to external anime databases. These
                providers process requests under their own privacy policies. We
                temporarily cache metadata results (such as titles and artwork)
                on our backend to reduce network overhead.
              </p>
            </div>
            <div className="border-t border-zinc-800 pt-3">
              <strong className="text-white block">
                Cloud Hosting &amp; Database (Vercel &amp; Supabase):
              </strong>
              <p className="text-zinc-400 mt-1">
                Our application interface, serverless functions, and user
                database are hosted on Vercel (US-based) and Supabase
                (US-based). Your personal data (account info, watchlist,
                notification subscriptions) is stored on these platforms. Both
                providers maintain strict security controls and are bound by
                their own privacy and data processing commitments.
              </p>
            </div>
            <div className="border-t border-zinc-800 pt-3">
              <strong className="text-white block">
                Automated Background Schedulers:
              </strong>
              <p className="text-zinc-400 mt-1">
                To check broadcast timetables and trigger push notifications,
                our serverless endpoints are periodically invoked by automated
                scheduling services. These schedulers only send technical timing
                triggers and do not collect or process personal user data.
              </p>
            </div>
            <div className="border-t border-zinc-800 pt-3">
              <strong className="text-white block">
                Push Notification Gateways:
              </strong>
              <p className="text-zinc-400 mt-1">
                When an episode alert is triggered, our server encrypts the
                alert using your browser&apos;s subscription keys and transmits
                it through your browser vendor&apos;s push notification gateway
                (such as Google FCM for Chrome/Android or Apple APNs for
                Safari/iOS) to reach your device.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              6
            </span>
            International Data Transfers
          </h2>
          <p>
            Aniotako is operated from India, but our hosting infrastructure
            (Vercel and Supabase) is based in the{" "}
            <strong className="text-white">United States</strong>. By using the
            Service, you acknowledge and consent to your data being transferred
            to and stored on servers located outside India.
          </p>
          <p>
            We rely on our hosting providers&apos; privacy and security
            commitments to protect your data during such transfers. We do not
            transfer your data to any other countries or entities beyond what is
            described in this policy.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              7
            </span>
            Cookies &amp; Local Storage
          </h2>
          <p>
            We use strictly necessary session cookies and browser storage
            (localStorage) to keep you authenticated and remember display
            preferences (such as preferred title language, grid/list layout
            view, and sort order). We do not use third-party advertising
            cookies, tracking pixels, or session replay tools.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              8
            </span>
            Data Retention
          </h2>
          <p>
            We retain your data for the following periods:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-300 font-semibold p-4">
                    Data Type
                  </th>
                  <th className="text-left text-zinc-300 font-semibold p-4">
                    Retention Period
                  </th>
                </tr>
              </thead>
              <tbody className="text-zinc-400 divide-y divide-zinc-800">
                <tr>
                  <td className="p-4">Account &amp; Watchlist Data</td>
                  <td className="p-4">Until account deletion</td>
                </tr>
                <tr>
                  <td className="p-4">
                    Push Notification Subscriptions
                  </td>
                  <td className="p-4">
                    Until you disable notifications or delete your account
                  </td>
                </tr>
                <tr>
                  <td className="p-4">Server / Connection Logs</td>
                  <td className="p-4">~30 days, then auto-purged</td>
                </tr>
                <tr>
                  <td className="p-4">
                    Cached Anime Metadata
                  </td>
                  <td className="p-4">
                    Refreshed periodically; not tied to individual users
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              9
            </span>
            Data Security
          </h2>
          <p>
            We protect your data in transit using standard{" "}
            <strong className="text-white">HTTPS / TLS encryption</strong> and
            rely on secure cloud database isolation (Supabase Row-Level Security)
            to safeguard stored records. Authentication credentials are never
            stored in plain text.
          </p>
          <p>
            While we take reasonable security measures, no internet transmission
            or electronic storage method is 100% secure. We cannot guarantee
            absolute security of your data.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              10
            </span>
            Data Breach Notification
          </h2>
          <p>
            In the event of a personal data breach that poses a risk to your
            rights and interests, we will make reasonable efforts to notify
            affected users within a reasonable timeframe and in accordance with
            applicable law, including the{" "}
            <strong className="text-white">DPDP Act, 2023</strong>. Notification
            will be provided via the email address associated with your account.
          </p>
          <p>
            Because this is a solo-operated project with no dedicated security
            team, we encourage you to use a strong, unique password and to
            contact us immediately at{" "}
            <a
              href="mailto:contact.harshvdev@gmail.com"
              className="text-cyan-400 underline"
            >
              contact.harshvdev@gmail.com
            </a>{" "}
            if you suspect any unauthorized access.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              11
            </span>
            Your Rights &amp; Control Over Your Data
          </h2>
          <p>
            Under the Digital Personal Data Protection Act, 2023 (DPDP Act) and
            other applicable privacy laws, you have the following rights:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-400">
            <li>
              <strong className="text-zinc-200">Right to Access:</strong> You
              can export a complete copy of your watchlist anytime via our{" "}
              <Link href="/settings" className="text-cyan-400 underline">
                Settings page
              </Link>{" "}
              in <strong className="text-white">JSON</strong>,{" "}
              <strong className="text-white">CSV</strong>, or{" "}
              <strong className="text-white">MyAnimeList XML</strong> formats.
            </li>
            <li>
              <strong className="text-zinc-200">Right to Correction:</strong>{" "}
              You can update your display name, timezone, and notification
              settings at any time via the Settings page.
            </li>
            <li>
              <strong className="text-zinc-200">
                Right to Erasure (Right to Be Forgotten):
              </strong>{" "}
              You can permanently delete your account and all associated
              personal data directly from the{" "}
              <Link href="/settings" className="text-cyan-400 underline">
                Settings page
              </Link>{" "}
              (Danger Zone section). Deletion is immediate and irreversible.
            </li>
            <li>
              <strong className="text-zinc-200">
                Right to Withdraw Consent:
              </strong>{" "}
              You can disable push notifications or adult content at any time
              via Settings, or delete your account to withdraw all consent.
            </li>
            <li>
              <strong className="text-zinc-200">
                Right to Grievance Redressal:
              </strong>{" "}
              If you have a concern about how your data is handled, please
              contact us at{" "}
              <a
                href="mailto:contact.harshvdev@gmail.com"
                className="text-cyan-400 underline"
              >
                contact.harshvdev@gmail.com
              </a>
              . We will respond to your inquiry within a reasonable timeframe.
            </li>
          </ul>
        </section>

        {/* Section 12 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              12
            </span>
            Children&apos;s Privacy
          </h2>
          <p>
            Aniotako is not intended for children under the age of 13 (or under
            18 for adult content features). We do not knowingly collect personal
            information from individuals under applicable age thresholds. If you
            believe an underage account has been created, please contact us at{" "}
            <a
              href="mailto:contact.harshvdev@gmail.com"
              className="text-cyan-400 underline"
            >
              contact.harshvdev@gmail.com
            </a>{" "}
            so we can take appropriate steps to remove the account.
          </p>
        </section>

        {/* Section 13 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              13
            </span>
            Governing Law
          </h2>
          <p>
            This Privacy Policy is governed by the laws of{" "}
            <strong className="text-white">India</strong>, including the Digital
            Personal Data Protection Act, 2023 and the Information Technology
            Act, 2000. Any disputes shall be subject to the exclusive
            jurisdiction of the courts in{" "}
            <strong className="text-white">
              Lucknow, Uttar Pradesh, India
            </strong>
            .
          </p>
        </section>

        {/* Section 14 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-fuchsia-400 text-xs font-extrabold">
              14
            </span>
            Changes to This Policy &amp; Contact
          </h2>
          <p>
            We may update this Privacy Policy from time to time as the
            application evolves. The &quot;Last Updated&quot; date at the top
            of this document reflects the most recent revision. Continued use of
            the Service after changes are posted constitutes your acceptance.
          </p>
          <p>
            If you have any questions or inquiries about your data, please
            contact us at:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 text-xs sm:text-sm text-zinc-300 space-y-1">
            <p>
              <strong className="text-white">Application Name:</strong> Aniotako
            </p>
            <p>
              <strong className="text-white">Developer Location:</strong>{" "}
              Lucknow, Uttar Pradesh, India
            </p>
            <p>
              <strong className="text-white">Contact Email:</strong>{" "}
              <a
                href="mailto:contact.harshvdev@gmail.com"
                className="text-cyan-400 underline"
              >
                contact.harshvdev@gmail.com
              </a>
            </p>
          </div>
        </section>

      </div>

      {/* Bottom Navigation */}
      <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div>© {new Date().getFullYear()} Aniotako. All rights reserved.</div>
        <div className="flex gap-6">
          <Link
            href="/terms"
            className="hover:text-zinc-300 transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="/settings"
            className="hover:text-zinc-300 transition-colors"
          >
            Back to Settings
          </Link>
        </div>
      </div>

    </div>
  );
}
