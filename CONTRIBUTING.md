# Contributing to Diskus

First off, thank you for considering contributing to Diskus! It's people like you that make Diskus a great modern commenting platform.

Diskus is built as an open-source monorepo. This document will guide you through our development process and how to get your contributions merged.

## 🏗 Project Architecture

Diskus is organized into three main components:

1. **`backend/`**: The core API server built with Bun, Hono, Drizzle ORM, and SQLite.
2. **`dashboard/`**: The management interface for site owners, built with Vite and Preact.
3. **`widget/`**: The highly optimized, lightweight comment embed script for websites, built with Vite and Preact.

---

## 🛠 Setting Up for Development

Diskus requires [Bun](https://bun.sh/) as the primary runtime and package manager.

### 1. Prerequisites
- Install **Bun** (v1.1+ recommended): `curl -fsSL https://bun.sh/install | bash`
- Node.js is not required as we use Bun natively.

### 2. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/fadhilbarkah/diskus.git
cd diskus
bun install
```

### 3. Environment Variables
Copy the `.env.example` file (if available) or create a `.env` file in the root directory. At minimum, ensure SQLite database configurations are set.

### 4. Running Locally
You can run all three development servers concurrently from the root directory:
```bash
bun run dev
```
Alternatively, you can run them individually by navigating to their respective directories and running `bun run dev`.

---

## 🧪 Testing Guidelines

We take code quality seriously. Diskus maintains strict global coverage thresholds. **Pull requests that lower code coverage will automatically be rejected by our CI/CD pipeline.**

### Running Tests
To ensure your changes don't break existing functionality, run the test suites:

- **Backend Tests** (Uses native `bun test` with in-memory SQLite):
  ```bash
  cd backend
  bun test --coverage
  ```
  *(Coverage threshold: 65%)*

- **Dashboard Tests** (Uses `vitest` + `happy-dom`):
  ```bash
  cd dashboard
  bun run test:coverage
  ```
  *(Coverage threshold: 80%)*

- **Widget Tests** (Uses `vitest` + `happy-dom`):
  ```bash
  cd widget
  bun run test:coverage
  ```
  *(Coverage threshold: 80%)*

**Tips for Backend Mocking**: 
If you are adding new controllers, use `spyOn` and `mock` from `"bun:test"` to mock the Service layers. We avoid mocking the database directly to keep the integration layer robust.

---

## 💅 Code Style & Linting

Diskus uses [Biome](https://biomejs.dev/) to enforce consistent code styling and catch errors quickly.

Before committing, please ensure your code passes the linter:
```bash
bun run lint
```
*(To automatically fix formatting issues, you can usually run `bunx biome check --apply .` or follow the instructions provided by the linter.)*

---

## 🚀 Pull Request Process

1. **Fork the repo** and create your branch from `main`.
2. **Write clear code** and add tests if you are adding new functionality or fixing a bug.
3. **Run tests & linter** locally to ensure everything is green.
4. **Create a Pull Request** with a clear title and description.
   - Describe *why* you are making the change.
   - Link any relevant issues.
5. **CI/CD Checks**: Our GitHub Actions will automatically run Biome (Linter) and all Test Coverage suites on your PR. Ensure they pass!
6. **Code Review**: A maintainer will review your PR, suggest any tweaks, and merge it.

---

## 🐞 Reporting Bugs & Suggesting Features

We use GitHub Issues to track bugs and feature requests.
- **Bugs**: Provide detailed steps to reproduce the issue, what you expected to happen, and what actually happened. Include error logs if applicable.
- **Features**: Provide a clear explanation of what the feature is and why it would be beneficial to the Diskus ecosystem.

Thank you for helping make Diskus better! Happy coding! 🎉
