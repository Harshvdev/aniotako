# Aniotako - Personal Anime Watchlist Tracker & Scheduler

Aniotako is a high-performance, premium web application built with **Next.js 16**, **React 19**, **TailwindCSS v4**, and **Supabase**. It functions as a private, ad-free database to track anime watchlists, manage watching progress, and receive real-time push notifications when new episodes air.

---

## 📖 Table of Contents
1. [Core Features](#-core-features)
2. [Database Schema & Architecture](#-database-schema--architecture)
3. [API Reference & Routing](#-api-reference--routing)
4. [System Flows & Logic](#-system-flows--logic)
5. [Tech Stack & Architecture](#-tech-stack--architecture)

---

## ✨ Core Features

### 1. Watchlist Management & UI
*   **Dual View Layouts**: Seamless toggle between a highly aesthetic **Grid View** (featuring rich artwork posters, progress bars, and quick score overlays) and a clean **List View**.
*   **Progress Tracking**: One-click increment (`+`) and decrement (`-`) buttons to update watched episodes. Auto-completes watchlist status with user confirmation upon reaching the final episode.
*   **Star Rating System**: Assign ratings from `1` (Appalling) to `10` (Masterpiece) directly from the card interfaces.
*   **Dynamic Sorting**: Custom sort your watchlist by *Last Updated*, *Title (A-Z)*, *Score (High-Low)*, and *Episode Progress*.

### 2. Advanced Search & Filtering
*   **AniList Search Integration**: Lightning-fast search queries directly proxied through the AniList GraphQL API, complete with infinite scroll pagination.
*   **Comprehensive Client Filters**: Filter watchlists by type (*TV, Movie, OVA, ONA, Special, Music*), status (*Watching, Completed, On Hold, Dropped, Plan to Watch*), airing status (*Releasing, Finished, Not yet released, Cancelled*), scores, seasons, years, and specific date ranges.
*   **Detailed Genre & Tag Filtering**: Over 40 primary genres (*Action, Adventure, Isekai...*) and over 150 advanced tags (*Anti-Hero, Battle Royale, Cyberpunk, Reincarnation...*).

### 3. XML Watchlist Import & Background Enrichment
*   **MyAnimeList XML Import**: Drag-and-drop or select standard XML files exported from MAL. Parses and maps statuses and scores instantly in the browser.
*   **MAL Completed-Show Correction**: Fixes the common MAL export bug where completed shows are downloaded with `0` watched episodes by automatically mapping them to the total episode count.
*   **Hybrid Metadata Enrichment**: Once imported, a background enrichment pipeline (`/api/enrich`) fetches cover art, genres, English/Romaji titles, season details, and summaries. It prioritizes the **AniList GraphQL API** (batch fetches up to 50 shows) and falls back to **Jikan API** (MyAnimeList proxy) for missing items, respecting API rate limits and Vercel timeout guards.

### 4. Just-In-Time (JIT) Airing Notifications
*   **Periodic Timetable Scans**: A cron scanner route (`/api/cron/scanner`) runs regularly via **Upstash QStash**, fetching weekly schedules from `AnimeSchedule.net`.
*   **Fuzzy Matching Engine**: Matches airing schedules to user watchlists using exact AniList IDs or deep fuzzy title checks (English, Romaji, Native, and metadata strings).
*   **QStash Message Queue**: Schedules messages on Upstash QStash matching exact airing times, preventing premature alerts.
*   **JIT Timetable Verification**: Before sending notifications, `/api/notify` performs a live check on `AnimeSchedule.net` to verify if the episode was delayed, rescheduled, or cancelled:
    *   *Delayed*: Reschedules itself in QStash to the new airing time.
    *   *Cancelled*: Aborts the alert.
    *   *On-time*: Dispatches push notifications.
*   **Localized Notifications**: Uses the user's selected timezone to format absolute airing times and delivery timestamps. Sends web push notifications via service workers (using VAPID keys) and populates the in-app notification bell database.

### 5. Highly Tailored User Preferences
*   **Title Language Selector**: Choose preferred displaying title style globally between **English** and **Romaji**.
*   **Timezone Selector**: Override auto-detected browser timezones with standard global timezone zones (e.g., IST, JST, EST, CET, etc.).
*   **Notification Formats**: Choose what episode releases trigger alerts:
    *   `raw`: Notify when the raw broadcast airs in Japan.
    *   `sub`: Notify when English subtitles are ready (Recommended).
    *   `dub`: Notify when the English dub is released.
*   **Countdown Timers**: Option to toggle live airing countdown timers on watchlist cards and detail pages.
*   **NSFW/18+ Toggle**: Control adult content visibility in search queries.

---

## 🗄️ Database Schema & Architecture

Aniotako uses PostgreSQL hosted on **Supabase** with **Row Level Security (RLS)** active on all tables. 

```mermaid
erDiagram
    users ||--|| profiles : "has profile"
    users ||--|| user_preferences : "defines preferences"
    users ||--o{ watchlist_entries : "curates"
    users ||--o{ push_subscriptions : "subscribes"
    users ||--o{ notifications : "receives"
    anime_metadata ||--o{ watchlist_entries : "provides details"
    notification_events ||--o{ notifications : "groups alerts"

    profiles {
        uuid id PK
        text display_name
        timestamptz created_at
    }

    user_preferences {
        uuid user_id PK
        boolean notify_watching_only
        boolean email_notifications
        boolean show_adult
        text timezone
        text notification_format
        boolean countdown_enabled
        text title_language
        timestamptz updated_at
    }

    watchlist_entries {
        uuid id PK
        uuid user_id FK
        integer mal_id FK
        text title
        text status
        integer score
        integer watched_episodes
        integer total_episodes
        text poster_url
        text title_english
        text title_romaji
        timestamptz created_at
    }

    anime_metadata {
        integer mal_id PK
        integer anilist_id
        text title
        text title_english
        text title_romaji
        text title_native
        text genres
        text type
        text season
        text airing_status
        text studio
        integer year
        integer total_episodes
        text synopsis
        text poster_url
        jsonb jikan_raw
        jsonb anilist_raw
        timestamptz cached_at
    }

    push_subscriptions {
        uuid id PK
        uuid user_id FK
        text endpoint
        text p256dh
        text auth_key
        timestamptz created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        integer mal_id
        text anime_title
        integer episode_number
        text poster_url
        text format
        boolean is_read
        timestamptz aired_at
        timestamptz created_at
        uuid notification_event_id FK
    }

    notification_events {
        uuid id PK
        text event_key UK
        integer anilist_id
        integer mal_id
        integer episode_number
        text format
        timestamptz aired_at
        timestamptz created_at
    }
```

### Table Details & Security

1.  **`watchlist_entries`**: Stores users' anime records. 
    *   *Constraint*: Unique on `(user_id, mal_id)` to prevent duplicates.
    *   *Security*: RLS limits `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access to the record owner (`auth.uid() = user_id`).
2.  **`anime_metadata`**: Cache table storing scraped metadata.
    *   *Security*: Readable by all authenticated users. Writes/updates are reserved for internal backend routines using the Supabase Service Role.
3.  **`push_subscriptions`**: Holds browser endpoint details for Web Push.
    *   *Security*: Managed directly by the subscribing user.
4.  **`user_preferences`**: Contains user-specific settings. A Postgres trigger (`handle_new_user_prefs`) automatically inserts a default configuration row upon user signup.
    *   *Security*: Managed entirely by the owning user.
5.  **`notifications`**: Contains in-app alerts sent to users. 
    *   *Security*: Users can `SELECT` (read), `UPDATE` (mark read), or `DELETE` (clear) their own notifications. Client `INSERT` is blocked (no policy exists); only the service role cron execution can insert rows.
6.  **`notification_events`**: Relational event tracking table.
    *   *Constraint*: Unique on `event_key` (formatted as `mal_id:episode:format:time`) to prevent duplicate worker dispatches.

---

## 🔌 API Reference & Routing

The system uses standard Next.js Route Handlers. All user-facing APIs enforce token verification or Supabase session validation.

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `/api/watchlist/add` | `POST` | Yes | Adds a new anime entry to the user's watchlist. Prevents duplicates. |
| `/api/watchlist/update` | `PATCH` | Yes | Updates progress, score, or status of an existing entry. Enforces ownership check. |
| `/api/watchlist/delete` | `DELETE` | Yes | Removes a specific anime from the user's watchlist. |
| `/api/watchlist/all` | `DELETE` | Yes | Wipes the entire user's watchlist (Danger Zone). |
| `/api/import` | `POST` | Yes | Bulk imports MyAnimeList parsed entries and upserts them. |
| `/api/export` | `GET` | Yes | Exports the user's full watchlist as a downloadable JSON file. |
| `/api/preferences` | `GET` / `PATCH` | Yes | Fetches or updates database settings (format, countdown, timezone). |
| `/api/profile` | `POST` | Yes | Updates user display name. Enforces a 30-character limit. |
| `/api/anilist/search` | `GET` | Yes | Queries the AniList GraphQL API. Filters results based on user's NSFW settings. |
| `/api/anilist/anime/[id]` | `GET` | Yes | Retrieves full anime details. Returns cached database metadata if fresh (< 7 days), else fetches from AniList and caches it. Combines historical episode data from Jikan. |
| `/api/calendar` | `GET` | Yes | Fetches airing events for user watchlist. Querying with `week=true` returns dots for calendar display. |
| `/api/subscribe` | `POST` | Yes | Saves Web Push subscription credentials (`endpoint`, `p256dh`, `auth_key`). |
| `/api/cron/scanner` | `GET` | Bearer Token | Scans AnimeSchedule.net weekly timetable, matches watchlists, caches schedule meta, and queues alerts in QStash. |
| `/api/notify` | `POST` | QStash Signature | Processes queued QStash alerts. JIT verifies schedule, logs events, dispatches Web Push & in-app notifications. |

---

## ⚙️ System Flows & Logic

### 1. The Airing Notification Pipeline

This flowchart outlines the cron scanner and QStash execution loop that delivers JIT notifications.

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Upstash Cron
    participant Scanner as /api/cron/scanner
    participant AS as AnimeSchedule.net API
    participant DB as Supabase DB
    participant QS as Upstash QStash
    participant Notify as /api/notify
    participant SW as Browser Service Worker

    Cron->>Scanner: Trigger Scheduled Scan (Bearer Token)
    activate Scanner
    Scanner->>AS: Fetch Weekly Timetable (UTC)
    AS-->>Scanner: Return Airing Timetable List
    Scanner->>DB: Fetch Active User Watchlists (Status = 'watching')
    DB-->>Scanner: Return Watchlist & Meta Rows
    Note over Scanner: Fuzzy Title/ID Matcher Engine Matches Airing Shows to Watchlists
    Scanner->>DB: Upsert Airing Schedules to Cache (anime_metadata)
    Scanner->>DB: Log New Events to prevent duplicates (notification_events)
    Scanner->>QS: Publish Scheduled JSON Payload (notBefore = Airing Unix Time)
    deactivate Scanner
    
    Note over QS: Message waits in QStash until airing time...
    
    QS->>Notify: Dispatch Scheduled Alert (POST with verified signature)
    activate Notify
    Notify->>AS: JIT Check schedule verification (current week)
    AS-->>Notify: Return current live schedule
    
    alt Schedule Delayed
        Notify->>QS: Re-publish message with new timestamp
        Notify-->>QS: Success 200 (Stop retry)
    else Schedule Cancelled / Missing Target
        Notify-->>QS: Success 200 (Drop alert)
    else Schedule Confirmed & Airing
        Notify->>DB: Query watching users + preferences (tz, format)
        DB-->>Notify: Return user targets
        Notify->>DB: Fetch Push subscriptions credentials
        DB-->>Notify: Return push subscriptions
        Notify->>DB: Insert in-app notifications
        Notify->>SW: Dispatch Web Push (localized message & custom payload)
        Notify-->>QS: Success 200 (Complete pipeline)
    end
    deactivate Notify
```

### 2. Hybrid Metadata Enrichment Logic
When a watchlist is imported or a new anime is added:
1.  Check if metadata already exists in the database.
2.  If missing, check **AniList**. Since AniList GraphQL handles batched requests, it packs missing IDs and pulls them in a single network round-trip.
3.  If a show is not found on AniList (e.g., mismatched IDs), the server triggers a **Jikan Fallback** call.
4.  Because Jikan relies on public endpoints with strict rate limits, the handler restricts Jikan fallbacks to a maximum of **5 requests per batch** and employs a **1.1-second throttle delay** between requests to prevent Vercel server timeouts.
5.  All gathered metadata is upserted to `anime_metadata`, and the user's watchlist entries are populated with updated poster URLs and English/Romaji titles.

---

## 🛠️ Tech Stack & Architecture

*   **Next.js 16 (App Router)**: Serves as the React framework, leveraging Server Actions, SSR, and dynamic API Route Handlers.
*   **React 19**: Frontend UI rendering library.
*   **TailwindCSS v4**: Modern CSS utility compilation for lightning-fast, premium styling.
*   **Supabase (PostgreSQL)**: Managed database, user authentication, and Row Level Security policies.
*   **Upstash QStash**: Message queuing and cron scheduling infrastructure, executing verified cryptographic signature handshakes.
*   **Web Push (VAPID)**: Standardized browser push mechanism to deliver alerts even when the browser application is closed.
*   **NProgress**: Client-side progress indicator visualizer for smooth routing transits.
