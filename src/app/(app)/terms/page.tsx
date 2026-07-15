// src/app/(app)/terms/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Aniotako. Learn about our personal anime tracking service, data sources, content guidelines, and terms of use.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "July 15, 2026";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-zinc-300">

      {/* Header */}
      <div className="border-b border-zinc-800 pb-8 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Terms of Service
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Terms of Service
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Welcome to Aniotako
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          These Terms of Service (&quot;Terms&quot;) govern your access to and
          use of Aniotako, a personal anime tracking and schedule countdown web
          application developed and operated by a solo independent developer
          based in{" "}
          <strong className="text-white">Lucknow, Uttar Pradesh, India</strong>.
          By creating an account or using our application, you agree to be bound
          by these Terms and our{" "}
          <Link href="/privacy" className="text-cyan-400 underline hover:text-cyan-300">
            Privacy Policy
          </Link>
          . If you do not agree, please do not use the Service.
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-10 text-sm leading-relaxed text-zinc-300">

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              1
            </span>
            Our Service &amp; What We Do
          </h2>
          <p>
            Aniotako provides software tools that allow you to track your anime
            watching progress, organize personal watchlists, view localized
            countdowns for upcoming episodes, and receive browser push
            notifications when new episodes air.
          </p>
          <p>
            <strong className="text-white">
              No Video Streaming or Hosting:
            </strong>{" "}
            Aniotako is strictly a cataloging and schedule tracking tool. We do
            not host, stream, distribute, or provide links to video files,
            torrents, or copyrighted media of any kind.
          </p>
          <p>
            <strong className="text-white">Solo Independent Developer:</strong>{" "}
            Aniotako is a passion project developed and maintained by a single
            individual. There is no corporate entity, no investor funding, and
            no revenue model. The Service is provided free of charge.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              2
            </span>
            Third-Party Data Sources &amp; Caching
          </h2>
          <p>
            Aniotako does not maintain its own proprietary anime database. When
            you search for anime, view summaries, check broadcast countdowns, or
            import lists, our application retrieves data from external
            third-party services:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-400">
            <li>
              <strong className="text-zinc-200">
                Catalog &amp; Metadata APIs:
              </strong>{" "}
              External services (such as AniList and MyAnimeList/Jikan) provide
              anime titles, summaries, tags, episode counts, and cover artwork.
            </li>
            <li>
              <strong className="text-zinc-200">
                Schedule &amp; Timetable Services:
              </strong>{" "}
              External scheduling APIs (such as AnimeSchedule) provide live
              airing timetables and release status.
            </li>
            <li>
              <strong className="text-zinc-200">
                Automated Background Schedulers:
              </strong>{" "}
              External cron services and message queues periodically trigger our
              server routes to check upcoming airing times and deliver push
              notifications automatically.
            </li>
          </ul>
          <p>
            <strong className="text-white">Technical Caching:</strong> To
            improve loading speeds and reduce API load, Aniotako temporarily
            caches metadata responses (such as titles, artwork URLs, and
            broadcast timings) on our backend servers. Because this information
            originates from external providers, we do not guarantee the exact
            accuracy, completeness, or classification of third-party metadata.
          </p>
          <p>
            <strong className="text-white">No Responsibility for Third-Party Content:</strong>{" "}
            We are not responsible for the accuracy, availability, or legality
            of data provided by external APIs. Third-party providers may change,
            restrict, or discontinue their APIs at any time without notice.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              3
            </span>
            Adult Content (18+) &amp; Age Responsibility
          </h2>
          <p>
            By default, all adult (18+) search queries and metadata are disabled
            on Aniotako. You may choose to enable the &quot;Show Adult Content
            (18+)&quot; option in your Account Settings subject to the following
            rules:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-400">
            <li>
              <strong className="text-zinc-200">Age Requirement:</strong> You
              must be at least 18 years old (or the legal age of majority in
              your jurisdiction) to enable this option.
            </li>
            <li>
              <strong className="text-zinc-200">Your Sole Responsibility:</strong>{" "}
              By enabling adult content, you represent and warrant that you meet
              the applicable age requirements. If you provide false information
              about your age, you — and not the developer — bear full legal
              responsibility for that misrepresentation. We have no technical
              means to independently verify your age.
            </li>
            <li>
              <strong className="text-zinc-200">Compliance with Law:</strong>{" "}
              Users may not use the Service to search for, save, or share
              content that is illegal under applicable law, including content
              that violates the Protection of Children from Sexual Offences Act
              (POCSO), 2012 or equivalent laws in your country.
            </li>
            <li>
              <strong className="text-zinc-200">Content Restrictions:</strong>{" "}
              We reserve the right to restrict access to specific search
              queries, tags, or accounts at any time to maintain legal
              compliance and user safety.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              4
            </span>
            User Conduct &amp; Prohibited Uses
          </h2>
          <p>
            When using Aniotako, you agree that you will not, and will not
            attempt to:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-400">
            <li>
              Use automated scripts, bots, crawlers, or excessive high-frequency
              requests that disrupt our application or overload third-party API
              providers.
            </li>
            <li>
              Attempt to scan, probe, reverse-engineer, decompile, or compromise
              the security, source code, or database of our application.
            </li>
            <li>
              Scrape, harvest, or export data from the Service for commercial
              purposes or to build competing services.
            </li>
            <li>
              Impersonate any person or entity, or misrepresent your affiliation
              with any person or entity.
            </li>
            <li>
              Use the Service for any illegal purpose or in violation of any
              applicable law, regulation, or these Terms.
            </li>
            <li>
              Interfere with or disrupt the normal operation of the Service for
              other users.
            </li>
            <li>
              Attempt to gain unauthorized access to any portion of the Service,
              other user accounts, or related systems.
            </li>
          </ul>
          <p>
            Violations of this section may result in immediate suspension or
            permanent termination of your account without prior notice.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              5
            </span>
            Intellectual Property, Copyright &amp; Safe Harbor
          </h2>
          <p>
            The Aniotako application — including its original source code,
            interface design, logo, and client logic — is the intellectual
            property of its developer and is protected under applicable
            copyright law.
          </p>
          <p>
            All anime titles, cover images, character artwork, timetables,
            summaries, and related media displayed within the application belong
            to their respective animation studios, publishers, licensors, and
            third-party data providers (such as AniList and MyAnimeList).
            Aniotako asserts no ownership over any third-party media or
            metadata.
          </p>
          <p>
            <strong className="text-white">
              Intermediary Safe Harbor (IT Act 2000, Section 79):
            </strong>{" "}
            Aniotako operates as an intermediary under the Information
            Technology Act, 2000. We merely transmit and display data retrieved
            from third-party public APIs; we do not originate, select, or
            modify that content. To the extent permitted by applicable law, we
            are not liable for third-party content that passes through our
            application.
          </p>
          <p>
            <strong className="text-white">
              Copyright &amp; Takedown Requests:
            </strong>{" "}
            If you believe that any content displayed on Aniotako infringes your
            copyright or violates applicable guidelines, please contact us at{" "}
            <a
              href="mailto:contact.harshvdev@gmail.com"
              className="text-cyan-400 underline"
            >
              contact.harshvdev@gmail.com
            </a>{" "}
            with sufficient detail to identify the content in question. Upon
            receiving a valid request, we will take appropriate steps to
            restrict that content from our application. Because our metadata
            originates from external APIs (such as AniList or MyAnimeList),
            removing content from the underlying public databases requires
            contacting those third-party providers directly.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              6
            </span>
            Disclaimer of Warranties
          </h2>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 sm:p-5">
            <p className="text-zinc-300 uppercase font-semibold text-xs tracking-wide mb-3">
              Important — Please Read
            </p>
            <p className="text-zinc-400">
              THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER
              EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT
              LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, AND NON-INFRINGEMENT. THE DEVELOPER DOES NOT
              WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
              SECURE, OR THAT THIRD-PARTY API DATA WILL ALWAYS BE ACCURATE,
              AVAILABLE, OR COMPLETE. YOUR USE OF THE SERVICE IS ENTIRELY AT
              YOUR OWN RISK.
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              7
            </span>
            Limitation of Liability
          </h2>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 sm:p-5">
            <p className="text-zinc-300 uppercase font-semibold text-xs tracking-wide mb-3">
              Important — Please Read
            </p>
            <p className="text-zinc-400">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE DEVELOPER
              SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES — INCLUDING BUT NOT
              LIMITED TO LOSS OF DATA (SUCH AS PERSONAL WATCHLIST RECORDS), LOSS
              OF PROFITS, LOSS OF GOODWILL, OR ANY OTHER INTANGIBLE LOSSES —
              ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE
              SERVICE.
            </p>
            <p className="text-zinc-400 mt-3">
              IN ANY CASE, THE DEVELOPER&apos;S TOTAL CUMULATIVE LIABILITY TO
              YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE
              SERVICE SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID THE DEVELOPER IN
              THE TWELVE (12) MONTHS PRECEDING THE CLAIM. BECAUSE ANIOTAKO IS A
              FREE SERVICE, THIS AMOUNT IS ZERO (₹0 / $0).
            </p>
          </div>
          <p className="text-zinc-500 text-xs">
            Some jurisdictions do not allow certain limitations of liability. In
            those jurisdictions, liability is limited to the minimum extent
            permitted by applicable law.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              8
            </span>
            Indemnification
          </h2>
          <p>
            You agree to defend, indemnify, and hold harmless the developer of
            Aniotako from and against any and all claims, damages, obligations,
            losses, liabilities, costs, or expenses (including reasonable
            attorneys&apos; fees) arising from:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-400">
            <li>Your access to or use of the Service;</li>
            <li>
              Your violation of any provision of these Terms;
            </li>
            <li>
              Your violation of any applicable law, regulation, or third-party
              right (including intellectual property or privacy rights);
            </li>
            <li>
              Any false representation you make, including misrepresentation of
              your age to access adult content features.
            </li>
          </ul>
          <p>
            This defense and indemnification obligation will survive termination
            of these Terms and your use of the Service.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              9
            </span>
            Force Majeure
          </h2>
          <p>
            The developer shall not be liable for any delay or failure to
            perform any obligation under these Terms if such delay or failure is
            caused by circumstances beyond our reasonable control, including but
            not limited to: outages or policy changes by cloud hosting providers
            (such as Vercel or Supabase), interruptions to third-party APIs
            (such as AniList, MyAnimeList, or AnimeSchedule), internet
            disruptions, natural disasters, governmental actions, or any other
            event outside our direct control.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              10
            </span>
            Account Suspension &amp; Termination
          </h2>
          <p>
            You may stop using the Service and permanently delete your account
            at any time via the{" "}
            <Link href="/settings" className="text-cyan-400 underline">
              Settings page
            </Link>
            . Upon account deletion, your watchlist and personal data will be
            removed from our active database.
          </p>
          <p>
            We reserve the right to suspend, restrict, or permanently terminate
            any account — with or without prior notice — if we determine, in our
            sole discretion, that you have violated these Terms, engaged in
            abusive behavior, or caused harm to the Service or other users. We
            also reserve the right to discontinue the Service entirely at any
            time without liability.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              11
            </span>
            Governing Law &amp; Jurisdiction
          </h2>
          <p>
            These Terms of Service and any dispute arising from your use of
            Aniotako shall be governed by the laws of{" "}
            <strong className="text-white">India</strong>, without regard to
            its conflict of law provisions.
          </p>
          <p>
            You agree that the courts located in{" "}
            <strong className="text-white">
              Lucknow, Uttar Pradesh, India
            </strong>{" "}
            (including the Lucknow Bench of the High Court of Judicature at
            Allahabad) shall have exclusive jurisdiction over any legal disputes
            or claims relating to the Service.
          </p>
          <p>
            If you are accessing the Service from outside India, you do so on
            your own initiative and are responsible for compliance with your
            local laws. These Terms are not intended to be subject to any
            foreign jurisdiction beyond what is required by applicable law.
          </p>
        </section>

        {/* Section 12 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              12
            </span>
            Changes to These Terms
          </h2>
          <p>
            We may update these Terms from time to time as the application
            evolves. The &quot;Last Updated&quot; date at the top of this page
            will reflect the most recent revision. Your continued use of the
            Service after changes are posted constitutes your acceptance of the
            updated Terms.
          </p>
          <p>
            We will make reasonable efforts to notify registered users of
            material changes via email or an in-app notice, but we are not
            obligated to do so.
          </p>
        </section>

        {/* Section 13 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              13
            </span>
            Severability &amp; Entire Agreement
          </h2>
          <p>
            <strong className="text-white">Severability:</strong> If any
            provision of these Terms is found to be unlawful, void, or
            unenforceable by a court of competent jurisdiction, that provision
            shall be deemed severed from these Terms. The remaining provisions
            shall continue in full force and effect.
          </p>
          <p>
            <strong className="text-white">Entire Agreement:</strong> These
            Terms, together with our{" "}
            <Link href="/privacy" className="text-cyan-400 underline">
              Privacy Policy
            </Link>
            , constitute the entire agreement between you and the developer
            regarding the Service and supersede all prior or contemporaneous
            communications, whether written or oral, relating to the subject
            matter herein.
          </p>
          <p>
            <strong className="text-white">No Waiver:</strong> The developer&apos;s
            failure to enforce any right or provision of these Terms shall not
            constitute a waiver of that right or provision.
          </p>
        </section>

        {/* Section 14 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-extrabold">
              14
            </span>
            Contact Information
          </h2>
          <p>
            If you have any questions, feedback, or inquiries regarding these
            Terms of Service, please contact us at:
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
            href="/privacy"
            className="hover:text-zinc-300 transition-colors"
          >
            Privacy Policy
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
