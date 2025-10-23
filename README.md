# 🚀 Avenai - AI-Powered API Onboarding Platform

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/OlliBurten/Avenai-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **Transform your API documentation into an intelligent, 24/7 customer success copilot**

Avenai helps SaaS companies reduce implementation time, cut support costs, and increase developer satisfaction by providing instant, accurate AI assistance powered by their own API documentation.

---

## 📋 Table of Contents

- [Vision](#-vision)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Vision

**The Problem:** API-first SaaS companies lose customers during onboarding. Developers struggle with documentation, support tickets pile up, and implementation takes weeks instead of days.

**The Solution:** Avenai turns static API docs into an intelligent copilot that:
- ✅ Answers developer questions instantly (24/7)
- ✅ Provides code examples in any language
- ✅ Reduces support tickets by 70%+
- ✅ Cuts time-to-first-API-call by 60%+

**Target Market:** $10B+ API economy, targeting 10,000+ customers at $100M+ revenue scale.

---

## ✨ Features

### 🤖 AI Copilot
- **Intelligent Q&A** - Natural language search across API documentation
- **Code Generation** - Auto-generate integration code in Python, JavaScript, cURL, and more
- **Context-Aware** - Remembers conversation history for follow-up questions
- **Multi-Language** - Supports 50+ programming languages

### 📄 Document Management
- **Smart Upload** - PDF, Markdown, OpenAPI/Swagger, HTML support
- **Automatic Processing** - Chunking, embedding, and indexing via pgvector
- **Version Control** - Track changes and updates to documentation
- **Dataset Organization** - Group docs by product, version, or use case

### 📊 Analytics & Insights
- **Pilot Metrics** - Satisfaction rate, query confidence, response time
- **Usage Tracking** - Monitor API calls, sessions, and user engagement
- **Top Queries** - Identify common questions and knowledge gaps
- **Confidence Distribution** - Track AI response quality

### 🎨 Customizable Widget
- **Brand Matching** - Customize colors, logo, and styling
- **Embeddable** - Drop-in script for any website
- **Responsive** - Works on desktop, tablet, and mobile
- **Expandable** - Compact and full-screen modes

### 🔐 Enterprise Security
- **Multi-Tenant Architecture** - Complete data isolation per organization
- **Row-Level Security** - PostgreSQL RLS for database-level protection
- **OAuth 2.0** - Google and Microsoft SSO integration
- **API Key Management** - Secure key generation and rotation

---

## 🛠️ Tech Stack

### **Frontend**
- [Next.js 15](https://nextjs.org/) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type-safe development
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first styling
- [Radix UI](https://www.radix-ui.com/) - Accessible components

### **Backend**
- [Node.js](https://nodejs.org/) - Server runtime
- [Prisma](https://www.prisma.io/) - Type-safe ORM
- [PostgreSQL](https://www.postgresql.org/) - Primary database
- [pgvector](https://github.com/pgvector/pgvector) - Vector similarity search

### **AI & ML**
- [OpenAI GPT-4](https://openai.com/) - Large language model
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings) - Text embeddings (1536 dimensions)
- Custom RAG Pipeline - Retrieval-augmented generation

### **Authentication & Storage**
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) / [AWS S3](https://aws.amazon.com/s3/) - File storage

### **Deployment**
- [Vercel](https://vercel.com/) - Frontend hosting
- [Neon](https://neon.tech/) / [Supabase](https://supabase.com/) - PostgreSQL hosting

---

## 📁 Repository Structure

```
Avenai/
├── app/                      # Next.js App Router pages & API routes
│   ├── (dashboard)/         # Dashboard pages (AI Copilot, Analytics, etc.)
│   ├── api/                 # API endpoints (chat, auth, api-keys)
│   ├── integration-guide/   # Quick Start Guide for pilot users
│   └── preview/             # Widget demo page
│
├── components/               # React components
│   ├── workspace/           # AI Copilot workspace (main chat interface)
│   ├── copilot/             # Copilot sub-components (feedback, badges)
│   ├── datasets/            # Dataset management
│   └── ui/                  # Base UI components (shadcn)
│
├── lib/                      # Server-side utilities
│   ├── auth/                # Authentication logic
│   ├── rag/                 # RAG pipeline (retrieval, ranking, context)
│   ├── pgvector.ts          # Vector search implementation
│   └── prisma.ts            # Database client
│
├── prisma/                   # Database schema & migrations
│   ├── schema.prisma        # Prisma schema definition
│   └── migrations/          # Database migration history
│
├── styles/                   # Global styles & design tokens
│   ├── tokens.css           # Brand colors, spacing, shadows
│   └── globals.css          # Global CSS imports
│
├── docs/                     # Documentation hub
│   ├── setup/               # OAuth, SSO, storage setup guides
│   ├── guides/              # User & deployment guides
│   ├── architecture/        # Technical documentation
│   ├── business/            # Business plans & materials
│   └── policies/            # Privacy & security policies
│
├── tests/                    # Test files & fixtures
│   ├── fixtures/            # Test documents
│   └── test-results/        # Test output
│
├── scripts/                  # Dev & deployment scripts
│   └── doc-worker/          # Document processing worker
│
├── README.md                 # This file
├── CONTRIBUTING.md           # Developer guide
└── LICENSE                   # MIT License
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm/pnpm
- **PostgreSQL** 14+ with pgvector extension
- **OpenAI API Key**

### 1. Clone & Install

```bash
git clone https://github.com/OlliBurten/Avenai-3.0.git
cd Avenai-3.0
npm install
```

### 2. Set Up Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure your `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/avenai"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"

# Storage (R2 or S3)
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="your-bucket-name"
```

### 3. Set Up Database

Enable pgvector extension and run migrations:

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL

# Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;
\q

# Push schema to database
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

| Category | Description | Link |
|----------|-------------|------|
| **Setup Guides** | OAuth, SSO, storage configuration | [docs/setup/](./docs/setup/) |
| **User Guides** | Onboarding, embedding, deployment | [docs/guides/](./docs/guides/) |
| **Architecture** | Technical design & standards | [docs/architecture/](./docs/architecture/) |
| **Business** | Plans, pricing, and sales | [docs/business/](./docs/business/) |
| **Policies** | Privacy & security | [docs/policies/](./docs/policies/) |

**Quick Links:**
- [Architecture Overview](./docs/architecture/ARCHITECTURE_GUIDE.md)
- [Deployment Guide](./docs/guides/DEPLOYMENT_GUIDE.md)
- [Google OAuth Setup](./docs/setup/GOOGLE_OAUTH_SETUP.md)
- [Contributing Guide](./CONTRIBUTING.md)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for:
- Code organization and structure
- Development workflow
- Coding standards
- Pull request process

### Development Guidelines

1. **Code Style:** TypeScript strict mode, ESLint, Prettier
2. **Components:** Use `SharedChatState` for all chat UIs
3. **Styling:** Tailwind CSS with design tokens from `styles/tokens.css`
4. **Database:** Prisma ORM with PostgreSQL + pgvector
5. **Testing:** Write tests for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🌟 Status

- ✅ **Production-Ready** - Pilot program launched
- ✅ **Investor-Ready** - Professional codebase and documentation
- ✅ **Enterprise-Ready** - Multi-tenant architecture with RLS
- 🚀 **Scaling to 10,000+ customers**

---

## 📞 Contact

- **Website:** [avenai.io](https://avenai.io)
- **Email:** team@avenai.io
- **Docs:** [docs.avenai.io](https://docs.avenai.io)

---

<div align="center">

**Built with ❤️ by the Avenai Team**

[Website](https://avenai.io) • [Documentation](./docs/) • [Contributing](./CONTRIBUTING.md)

</div>
