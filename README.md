# Diskus

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?logo=bun&logoColor=white)](https://bun.sh)
[![Preact](https://img.shields.io/badge/Preact-673AB8?logo=preact&logoColor=white)](https://preactjs.com/)

A lightweight, self-hosted comments system built for modern web applications. Diskus is designed to be a fast, privacy-respecting alternative to Disqus and other bloated third-party commenting services.

## Features

- **Ultra-lightweight Widget:** The embed script is under 20kB (gzipped), ensuring zero impact on your Core Web Vitals.
- **Multi-tenant Architecture:** Manage comments across multiple domains and websites from a single centralized dashboard.
- **Built-in Anti-Spam:** Native rate-limiting and invisible honeypot traps to prevent automated bot registrations without requiring intrusive CAPTCHAs.
- **Server-side Sanitization:** Strict HTML sanitization (`isomorphic-dompurify`) and Markdown parsing are offloaded to the server to maintain a minimal client bundle.
- **Data Portability:** Full JSON-based import and export capabilities for threads and comments.
- **Email Notifications:** Configurable email alerts for new comments powered by Resend API integration.
- **Modern Stack:** Built on Bun, Hono, Preact, and Drizzle ORM for maximum performance and type safety.

## Architecture

Diskus operates as a monorepo containing three core packages:

1. **Backend (`/backend`)**: A REST API built with Hono and running on Bun. Uses SQLite via Drizzle ORM for data persistence.
2. **Dashboard (`/dashboard`)**: A Preact-based Single Page Application (SPA) for administrators to manage sites, moderate comments, and view users.
3. **Widget (`/widget`)**: A highly optimized Preact component bundled via Vite as an IIFE script, designed to be injected into host websites.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (v1.0.0 or higher)
- Node.js (v18+ recommended for some tooling)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/fadhilbarkah/diskus.git
   cd diskus
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Setup environment variables:
   Copy `.env.example` to `.env` in all three workspace directories (`backend`, `dashboard`, `widget`). 
   - **Backend (`/backend`)**: Configure the required `JWT_SECRET`. You can also configure `DASHBOARD_ORIGIN` (for CORS restrictions) and `DATABASE_PATH` (custom SQLite path).
   - **Dashboard & Widget**: Configure `VITE_API_URL` to point to your backend API URL.

4. Initialize the database schema and optionally seed initial data:
   ```bash
   cd backend
   bun run db:push
   # Optional: populate the database with test data and a default admin account
   bun run src/db/seed.ts
   ```

5. Start the development server (runs backend, dashboard, and widget concurrently):
   ```bash
   # From the project root
   bun dev
   ```

> **Note:** If you ran the seed script, you can log in to the Dashboard using the initial default credentials:  
> **Email:** `admin@blog.com`  
> **Password:** `password123`

## Usage

### 1. Register a Website
Open the Dashboard (`http://localhost:5173`), navigate to **Websites**, and register a new domain. You will receive a Public API Key.

### 2. Embed the Widget
Paste the following HTML snippet into your target website, replacing the data attributes with your specific keys:

```html
<!-- Diskus Embed -->
<div id="diskus-thread" 
     data-api-key="YOUR_PUBLIC_API_KEY" 
     data-thread-key="your-unique-page-identifier"
     data-api-url="http://localhost:3000/api/v1">
</div>
<script src="http://localhost:3000/widget/dist/embed.js" async defer></script>
```

> **Note:** The `data-thread-key` should be unique per page (e.g., the article slug or ID) so that comments remain tied to their specific content.

## Security & Moderation

- **Role-based Access Control (RBAC):** Distinct roles for Administrators and Commenters.
- **Honeypot Traps:** The widget form includes an invisible field to catch spam bots automatically.
- **Moderation Tools:** Administrators can approve, delete, or mark comments as spam directly from the dashboard.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change. 

Please make sure to update tests as appropriate.

## License

[MIT](LICENSE)