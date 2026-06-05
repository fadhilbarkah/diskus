<div align="center">
  <h1>Diskus 💬</h1>
  <p><strong>An ultra-lightweight, privacy-first, and self-hosted Comment-System-as-a-Service.</strong></p>
  <p>The perfect open-source alternative to Disqus.</p>
</div>

---

## 🌟 Why Diskus?

Diskus is designed to be embedded into any website with just a single line of script. It prioritizes speed, bundle size, and security, making sure your website's performance (Core Web Vitals) remains uncompromised.

- ⚡️ **Ultra-lightweight**: The drop-in widget is only **~18kB** (gzipped).
- 🛡️ **Security-First**: Strict CORS policies, JWT-based authentication, and server-side XSS sanitization (`isomorphic-dompurify`).
- 🏢 **Multi-Tenant**: Manage multiple websites/domains from a single dashboard.
- 🎨 **Modern UI/UX**: Premium, responsive dashboard and widget built with Preact and Tailwind CSS.
- 🌙 **Dark Mode Support**: The widget automatically adapts to your website's theme.

## 🏗️ Architecture & Tech Stack

Diskus is structured as a modern monorepo, strictly adhering to industry standards like the **Controller-Service pattern** for the backend.

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend API** | [Bun](https://bun.sh/) + [Hono](https://hono.dev/) | Ultra-fast REST API with minimal memory overhead. |
| **Database** | [SQLite](https://sqlite.org/) + [Drizzle ORM](https://orm.drizzle.team/) | Lightweight, scalable, and fully typed database interaction. |
| **Dashboard** | [Preact](https://preactjs.com/) + [Tailwind CSS](https://tailwindcss.com/) | Snappy SPA for tenant management and comment moderation. |
| **Widget** | [Preact](https://preactjs.com/) + [Vite](https://vitejs.dev/) | Isolated, lightweight embed script without heavy dependencies. |

*Note: Heavy operations like Markdown parsing (`marked`) and HTML sanitization (`dompurify`) are intentionally offloaded to the **Backend** to keep the widget bundle as small as possible.*

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Bun](https://bun.sh/) installed on your machine.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/diskus.git
   cd diskus
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Database Migration**
   Setup the SQLite database schemas using Drizzle:
   ```bash
   cd backend
   bun run db:push
   ```

4. **Environment Variables**
   Create a `.env` file in the `backend`, `dashboard`, and `widget` directories based on their respective `.env.example` configurations. Make sure to set `JWT_SECRET`.

5. **Start the Development Server**
   Run the monorepo concurrently:
   ```bash
   # From the project root
   bun dev
   ```
   - Backend API runs on `http://localhost:3000`
   - Dashboard runs on `http://localhost:5173`
   - Widget dev server runs on `http://localhost:5174`

---

## 💻 Usage

### Embedding the Widget
To embed Diskus into your website (e.g., your blog, documentation, or portfolio), copy and paste the following snippet into your HTML:

```html
<div id="diskus-thread" 
     data-api-key="YOUR_PUBLIC_API_KEY" 
     data-thread-key="unique-article-slug"
     data-api-url="https://api.yourdomain.com/v1">
</div>
<script src="https://widget.yourdomain.com/embed.js" async></script>
```
*You can get your `YOUR_PUBLIC_API_KEY` by registering your website in the Diskus Dashboard.*

### Dashboard Management
Access your Diskus Dashboard to:
- Register new websites and domains.
- Approve, delete, or mark comments as spam.
- View basic analytics regarding user interactions.
- Manage user authentication requirements.

---

## 🗺️ Roadmap

- [ ] **Email Notifications**: Integration with Resend/AWS SES to notify users of replies.
- [ ] **Spam Detection**: Automated AI-based spam filtering (Akismet integration).
- [ ] **OAuth Login**: Allow guest users to log in via Google/GitHub to comment.
- [ ] **PostgreSQL Support**: Expand database compatibility for larger deployments.

---

## 📜 License

Diskus is open-sourced software licensed under the [MIT license](LICENSE).

<div align="center">
  <i>Built with ❤️ for a faster, cleaner web.</i>
</div>