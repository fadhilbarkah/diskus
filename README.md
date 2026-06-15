<div align="center">
  <img src="public/assets/logo.png" alt="Diskus Logo" width="120" />
  <h1>Diskus</h1>
</div>

**A lightweight, self-hosted comments system built for modern web applications.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?logo=bun&logoColor=white)](https://bun.sh)
[![Preact](https://img.shields.io/badge/Preact-673AB8?logo=preact&logoColor=white)](https://preactjs.com/)

Diskus is designed to be a fast, privacy-respecting alternative to Disqus and other bloated third-party commenting services.

[![Live Demo](https://img.shields.io/badge/🚀_Try_the_Live_Demo-2ea44f?style=for-the-badge)](https://diskus.pages.dev/)
[![Documentation](https://img.shields.io/badge/📖_Read_the_Docs-0366d6?style=for-the-badge)](https://diskus.pages.dev/)
## Screenshots

<div align="center">
  <img src="public/assets/Diskus_Dashboard.png" alt="Diskus Dashboard" width="800" />
  <p><em>Diskus Centralized Admin Dashboard</em></p>
  
  <br />

  <img src="public/assets/Diskus_Widget.png" alt="Diskus Widget" width="800" />
  <p><em>Diskus Lightweight Widget</em></p>
</div>

## Features

- **Ultra-lightweight Widget:** The entire widget is bundled into a single lightweight script (`embed.js`), with a total footprint of ~24.1KB (gzipped), ensuring zero impact on your Core Web Vitals.
- **100% CSS Isolation:** Runs within a native `Shadow DOM`, ensuring your website's CSS never conflicts with the widget's design and vice-versa, without the heavy performance overhead of traditional iframes.
- **Multi-tenant Architecture:** Manage comments across multiple domains and websites from a single centralized dashboard.
- **Built-in Anti-Spam:** Native rate-limiting and invisible honeypot traps to prevent automated bot registrations without requiring intrusive CAPTCHAs.
- **Social Login:** Seamless Google OAuth integration allowing commenters to sign in quickly and securely without managing additional passwords.
- **Server-side Sanitization:** Strict HTML sanitization (`isomorphic-dompurify`) and Markdown parsing are offloaded to the server to maintain a minimal client bundle.
- **Data Portability:** Full JSON-based import and export capabilities for threads and comments.
- **Email Notifications:** Configurable email alerts for new comments powered by standard SMTP integration.
- **Modern Stack:** Built on Bun, Hono, Preact, and Drizzle ORM for maximum performance and type safety.

## Architecture

Diskus operates as a monorepo containing three core packages:

1. **Backend (`/backend`)**: A REST API built with Hono and running on Bun. Uses SQLite via Drizzle ORM for data persistence.
2. **Dashboard (`/dashboard`)**: A Preact-based Single Page Application (SPA) for administrators to manage sites, moderate comments, and view users.
3. **Widget (`/widget`)**: A highly optimized Preact component. The lightweight embed script (`embed.js`) dynamically injects the widget using a **native Shadow DOM**, guaranteeing **100% CSS isolation** and zero style bleeding with the host website, while maintaining a featherlight ~24.1KB (gzipped) footprint containing full Tailwind CSS v4 logic.

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

> **Note:** When you open the Dashboard (`http://localhost:5173`) for the first time, you will be automatically prompted to create your initial Admin account. No manual seeding is required!

## 🚀 One-Click Deploy to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/diskus)

Click the button above to instantly deploy both the Backend API and the Dashboard Frontend. All environment variables, volumes, and start commands are pre-configured in this official template.

## Production Deployment (Docker)

Diskus is fully containerized for easy production deployment using Docker Compose. We provide a one-click startup script that automatically handles secure secret generation.

1. Build and start the services:
   ```bash
   # Run the start script
   ./start.sh
   ```
   > **Note:** The script will automatically generate a secure `.env` file with a strong `JWT_SECRET` if one does not exist, and then run `docker-compose up -d --build`.

2. The services will be available at:
   - **Frontend (Dashboard & Widget Embed)**: `http://localhost:5173` (or your domain)
   - **Backend API**: `http://localhost:3000`

> **Note:** The database uses a Docker Volume (`diskus-data`), so your comments will persist even if you restart the containers.

### Initial Setup in Production
Instead of manually seeding the database, simply open your frontend domain in the browser. You will be greeted with a "Create Admin Account" screen. **Register your account immediately** to secure your deployment, as the setup screen will permanently disappear once the first admin is created.

### Resetting the Production Database
If you ever need to completely wipe your production database (e.g., to resolve severe migration conflicts or start fresh), you must destroy the Docker Named Volume. **WARNING: This will permanently delete all comments and user data.**
```bash
# Bring down containers and DESTROY the database volume (-v)
docker-compose down -v

# Restart the services (a fresh database will be created)
./start.sh
```

## Usage

### 1. Register a Website
Open the Dashboard (`http://localhost:5173`), navigate to **Websites**, and register a new domain. You will receive an App ID.

### 2. Embed the Widget
Paste the following HTML snippet into your target website, replacing the data attributes with your specific keys:

```html
<!-- Diskus Embed -->
<div id="diskus-thread" 
     data-app-id="YOUR_APP_ID" 
     data-thread-key="your-unique-page-identifier"
     data-api-url="http://localhost:3000/api/v1">
</div>
<script src="http://localhost:5173/widget/dist/embed.js" async defer></script>
```

> **Note:** The `data-thread-key` should be unique per page (e.g., the article slug or ID) so that comments remain tied to their specific content.

## Security & Moderation

- **Role-based Access Control (RBAC):** Distinct roles for Administrators and Commenters.
- **Honeypot Traps:** The widget form includes an invisible field to catch spam bots automatically.
- **Moderation Tools:** Administrators can approve, delete, or mark comments as spam directly from the dashboard.

## Admin Troubleshooting

### Resetting Admin Password (CLI)
If you are locked out of the dashboard, you can reset your password securely via the command line. This requires direct access to your server terminal or Railway console.

1. Navigate to the `backend` directory (if not already there).
2. Run the reset-password script with your email address:
   ```bash
   bun run reset-password admin@example.com
   ```
3. Follow the on-screen prompt to confirm. The system will generate a secure temporary password and print it to the terminal. Please log in immediately and change this temporary password.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change. 

Please make sure to update tests as appropriate.

## License

[GPL-3.0](LICENSE)