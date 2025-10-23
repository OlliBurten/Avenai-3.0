# 🚀 Avenai Developer Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Code Organization](#code-organization)
5. [Development Standards](#development-standards)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

---

## 🎯 Project Overview

**Avenai** is an enterprise-grade AI-powered document processing and chat platform built for multi-tenant SaaS architecture. The platform enables organizations to upload, process, and chat with their documents using advanced AI capabilities.

### Key Features
- **Multi-tenant Architecture**: Isolated data per organization
- **Document Processing**: PDF, text, and various file format support
- **AI Chat Interface**: Contextual conversations with documents
- **Role-based Access Control**: SUPER_ADMIN, OWNER, ADMIN, MEMBER, VIEWER
- **Analytics Dashboard**: Comprehensive usage metrics
- **API Management**: RESTful APIs with rate limiting
- **Real-time Processing**: SSE for document processing updates

### Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon)
- **AI**: OpenAI GPT-4, Embeddings
- **Vector Database**: Pinecone
- **Authentication**: JWT-based with bcrypt
- **Deployment**: Vercel
- **Email**: Resend
- **Payments**: Stripe

---

## 🏗️ Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Database      │
│   (Next.js)     │◄──►│   (Next.js)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Services   │    │   Vector DB     │    │   File Storage  │
│   (OpenAI)      │    │   (Pinecone)    │    │   (Vercel)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Multi-Tenant Data Isolation
- **Organization-based**: All data scoped to organization
- **Row Level Security**: Database-level isolation
- **API-level**: Middleware enforces organization boundaries
- **Frontend**: User context determines data access

### Performance Optimizations
- **Query Caching**: LRU cache with 5-minute TTL
- **Response Caching**: API response caching (2-minute TTL)
- **Parallel Queries**: Database queries executed in parallel
- **Rate Limiting**: IP-based request limiting
- **Code Splitting**: Dynamic imports for large components

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database
- OpenAI API key
- Pinecone account
- Resend API key (for emails)

### Environment Setup
1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Fill in all required environment variables
4. Install dependencies: `npm install`
5. Generate Prisma client: `npm run db:generate`
6. Run database migrations: `npm run db:push`
7. Start development server: `npm run dev`

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Services
OPENAI_API_KEY="sk-..."
PINECONE_API_KEY="..."
PINECONE_ENVIRONMENT="..."

# Email
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@avenai.io"

# Payments
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 📁 Code Organization

### Directory Structure
```
avenai/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── admin/        # Admin-only endpoints
│   │   ├── chat/         # Chat functionality
│   │   ├── documents/    # Document management
│   │   └── ...
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Main dashboard
│   ├── admin/            # Admin interface
│   └── ...
├── components/           # Reusable React components
│   ├── ui/              # Base UI components
│   ├── chat/            # Chat-specific components
│   └── ...
├── lib/                  # Utility libraries
│   ├── database-optimizations.ts  # DB query optimizations
│   ├── api-optimizations.ts      # API middleware
│   ├── frontend-optimizations.tsx # React optimizations
│   ├── auth.ts          # Authentication utilities
│   ├── prisma.ts        # Database client
│   └── ...
├── prisma/              # Database schema and migrations
├── scripts/             # Utility scripts
└── types/              # TypeScript type definitions
```

### Naming Conventions

#### Files and Directories
- **kebab-case**: `user-profile.tsx`, `api-keys/`
- **PascalCase**: React components (`UserProfile.tsx`)
- **camelCase**: Utility functions (`getUserData()`)

#### Variables and Functions
- **camelCase**: `userName`, `getUserData()`
- **PascalCase**: React components, classes
- **UPPER_SNAKE_CASE**: Constants (`API_BASE_URL`)

#### Database
- **snake_case**: Table and column names (`user_id`, `created_at`)
- **PascalCase**: Model names (`User`, `Organization`)

---

## 📝 Development Standards

### Code Quality
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured with Next.js rules
- **Prettier**: Code formatting
- **Type Safety**: All functions properly typed

### Component Standards
```typescript
// ✅ Good: Properly typed component with JSDoc
/**
 * User profile component with inline editing
 * @param user - User data object
 * @param onUpdate - Callback when user data is updated
 * @param isEditable - Whether the profile can be edited
 */
interface UserProfileProps {
  user: User;
  onUpdate: (userData: Partial<User>) => void;
  isEditable?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  user, 
  onUpdate, 
  isEditable = false 
}) => {
  // Component implementation
};
```

### API Route Standards
```typescript
// ✅ Good: Properly structured API route
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'
import { createOptimizedHandler } from '@/lib/api-optimizations'

/**
 * Get user profile data
 * @param req - Next.js request object
 * @param session - Authenticated user session
 * @returns User profile data or error
 */
async function handleGetProfile(req: NextRequest, session: any) {
  try {
    const userId = session.user.id
    
    // Implementation here
    
    return createResponse(data, 'Profile retrieved successfully')
  } catch (error) {
    console.error('Profile fetch error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch profile',
      statusCode: 500
    })
  }
}

export const GET = withAuth(handleGetProfile)
```

### Error Handling
- **Consistent Error Format**: Use `createErrorResponse()` utility
- **Logging**: Always log errors with context
- **User-Friendly Messages**: Don't expose internal details
- **Status Codes**: Use appropriate HTTP status codes

### Performance Guidelines
- **Database Queries**: Use parallel execution with `Promise.all()`
- **Caching**: Implement caching for expensive operations
- **Pagination**: Always paginate large datasets
- **Rate Limiting**: Protect all API endpoints
- **Code Splitting**: Use dynamic imports for large components

---

## 🔌 API Documentation

### Authentication
All API routes (except auth endpoints) require authentication via JWT token.

**Headers Required:**
```
Authorization: Bearer <jwt-token>
```

### Core Endpoints

#### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `DELETE /api/documents?id=<id>` - Delete document

#### Chat
- `POST /api/chat` - Send chat message
- `GET /api/chat/db-only` - Chat with database only

#### Analytics
- `GET /api/analytics` - Get organization analytics

#### Admin (SUPER_ADMIN only)
- `GET /api/admin/organizations` - List all organizations
- `GET /api/admin/stats` - Platform statistics

### Response Format
```typescript
// Success Response
{
  success: true,
  data: any,
  message: string,
  timestamp: string
}

// Error Response
{
  success: false,
  error: {
    code: string,
    message: string,
    statusCode: number
  },
  timestamp: string
}
```

---

## 🗄️ Database Schema

### Core Models

#### Organization
```typescript
model Organization {
  id                 String             @id @default(cuid())
  name               String
  slug               String             @unique
  subscriptionTier   SubscriptionTier   @default(FREE)
  subscriptionStatus SubscriptionStatus @default(ACTIVE)
  apiKeyHash         String?
  // ... other fields
}
```

#### User
```typescript
model User {
  id             String   @id @default(cuid())
  organizationId String
  email          String
  role           UserRole @default(MEMBER)
  isActive       Boolean  @default(true)
  emailVerified  Boolean  @default(false)
  // ... other fields
}
```

#### Document
```typescript
model Document {
  id             String         @id @default(cuid())
  organizationId String
  title          String
  status         DocumentStatus @default(PROCESSING)
  // ... other fields
}
```

### Relationships
- **Organization** → **Users** (1:many)
- **Organization** → **Documents** (1:many)
- **Document** → **DocumentChunks** (1:many)
- **Organization** → **ChatSessions** (1:many)

---

## 🚀 Deployment

### Production Deployment
1. **Vercel**: Primary deployment platform
2. **Environment**: Production environment variables set
3. **Database**: Neon PostgreSQL production instance
4. **Monitoring**: Vercel Analytics enabled

### Deployment Process
```bash
# 1. Test locally
npm run build
npm run type-check

# 2. Commit changes
git add .
git commit -m "feat: description of changes"

# 3. Deploy to production
vercel --prod
```

### Environment Management
- **Development**: `.env.local`
- **Production**: Vercel environment variables
- **Secrets**: Never commit API keys or secrets

---

## 🔧 Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check database connection
npm run db:studio

# Reset database (development only)
npm run db:reset
```

#### Build Errors
```bash
# Clear Next.js cache
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Performance Issues
- Check query performance in Prisma Studio
- Monitor API response times
- Review caching hit rates
- Analyze bundle size with `npm run analyze`

### Debug Tools
- **Prisma Studio**: Database inspection
- **Vercel Logs**: Production debugging
- **Browser DevTools**: Frontend debugging
- **Network Tab**: API call monitoring

---

## 🤝 Contributing

### Development Workflow
1. **Create Feature Branch**: `git checkout -b feature/description`
2. **Make Changes**: Follow coding standards
3. **Test Locally**: Ensure all tests pass
4. **Commit Changes**: Use conventional commit messages
5. **Create Pull Request**: Detailed description of changes
6. **Code Review**: Team review required
7. **Merge**: After approval and testing

### Commit Message Format
```
feat: add user profile editing
fix: resolve chat message ordering issue
docs: update API documentation
perf: optimize database queries
refactor: reorganize component structure
```

### Code Review Checklist
- [ ] Code follows TypeScript standards
- [ ] Components are properly typed
- [ ] API routes have error handling
- [ ] Database queries are optimized
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Documentation updated

---

## 📚 Additional Resources

### Internal Documentation
- `OPTIMIZATION_REPORT.md` - Performance optimization details
- `SECURITY.md` - Security implementation guide
- `CHAT_ENHANCEMENT.md` - Chat feature documentation

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [OpenAI API](https://platform.openai.com/docs)

### Team Communication
- **Slack**: #avenai-dev channel
- **GitHub**: Issues and pull requests
- **Vercel**: Deployment notifications
- **Email**: dev@avenai.io for urgent issues

---

## 🎯 Future Development

### Planned Features
- **Advanced Analytics**: More detailed metrics
- **API Versioning**: v2 API endpoints
- **Webhooks**: Real-time event notifications
- **Mobile App**: React Native implementation
- **Enterprise SSO**: SAML/OAuth integration

### Technical Debt
- **Test Coverage**: Increase test coverage to 80%+
- **Documentation**: API documentation with OpenAPI
- **Monitoring**: Advanced error tracking and performance monitoring
- **CI/CD**: Automated testing and deployment pipelines

---

*Last Updated: September 2024*
*Version: 3.0*
*Maintained by: Avenai Development Team*
