# 👥 Developer Onboarding Guide

## 🎯 Welcome to Avenai!

This guide will help you get up and running with the Avenai codebase quickly and efficiently. Follow these steps to become a productive member of the development team.

---

## 📋 Pre-requisites

### Required Software
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: Latest version
- **VS Code**: Recommended IDE with extensions
- **PostgreSQL**: For local development (or use Neon cloud)

### VS Code Extensions
Install these essential extensions:
```bash
# Essential extensions for Avenai development
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension prisma.prisma
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-json
```

---

## 🚀 Quick Start (15 minutes)

### Step 1: Clone and Setup
```bash
# Clone the repository
git clone https://github.com/your-org/avenai.git
cd avenai

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

### Step 2: Environment Configuration
Edit `.env.local` with your development credentials:

```bash
# Database (use Neon for easy setup)
DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication
NEXTAUTH_SECRET="your-development-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Services (get from OpenAI)
OPENAI_API_KEY="sk-your-openai-key"

# Vector Database (get from Pinecone)
PINECONE_API_KEY="your-pinecone-key"
PINECONE_ENVIRONMENT="your-environment"

# Email (get from Resend)
RESEND_API_KEY="re_your-resend-key"
RESEND_FROM_EMAIL="noreply@avenai.io"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Step 3: Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with test data
npm run db:seed
```

### Step 4: Start Development
```bash
# Start the development server
npm run dev

# Open browser to http://localhost:3000
```

---

## 📚 Learning the Codebase

### Week 1: Foundation
**Day 1-2: Project Structure**
- Read `DEVELOPER_DOCUMENTATION.md`
- Explore the `app/` directory structure
- Understand the `components/` organization
- Review `lib/` utilities

**Day 3-4: Database & API**
- Study `prisma/schema.prisma`
- Review API routes in `app/api/`
- Understand authentication flow
- Learn about multi-tenant architecture

**Day 5: Frontend**
- Explore React components
- Understand state management
- Review styling with Tailwind CSS
- Learn about performance optimizations

### Week 2: Deep Dive
**Day 1-2: Core Features**
- Document processing pipeline
- Chat functionality
- Analytics system
- Admin panel

**Day 3-4: Advanced Topics**
- Performance optimizations
- Security implementations
- Error handling patterns
- Testing strategies

**Day 5: Deployment**
- Vercel deployment process
- Environment management
- Monitoring and debugging

---

## 🛠️ Development Workflow

### Daily Workflow
```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and test locally
npm run dev

# 4. Run type checking
npm run type-check

# 5. Run linting
npm run lint

# 6. Commit changes
git add .
git commit -m "feat: description of your changes"

# 7. Push and create PR
git push origin feature/your-feature-name
```

### Code Quality Checklist
Before committing, ensure:
- [ ] TypeScript types are correct
- [ ] ESLint passes without errors
- [ ] Prettier formatting is applied
- [ ] Components are properly typed
- [ ] API routes have error handling
- [ ] Database queries are optimized
- [ ] Security considerations are addressed

---

## 🎯 First Tasks

### Beginner Tasks (Week 1)
1. **Fix a small bug**: Look for issues labeled "good first issue"
2. **Add a simple feature**: Implement a small UI improvement
3. **Update documentation**: Improve existing docs or add examples
4. **Write tests**: Add unit tests for utility functions

### Intermediate Tasks (Week 2-3)
1. **API endpoint**: Create a new API route with proper validation
2. **Database query**: Optimize an existing query or add indexing
3. **Component**: Build a reusable React component
4. **Feature**: Implement a complete feature from design to deployment

### Advanced Tasks (Week 4+)
1. **Performance optimization**: Identify and fix performance bottlenecks
2. **Security enhancement**: Implement new security measures
3. **Architecture improvement**: Refactor code for better maintainability
4. **Integration**: Connect with external services or APIs

---

## 🔍 Understanding Key Concepts

### Multi-Tenant Architecture
```typescript
// Every database query is scoped to organization
const documents = await prisma.document.findMany({
  where: {
    organizationId: session.user.organizationId, // Always required
    // ... other filters
  }
});
```

### Authentication Flow
```typescript
// JWT-based authentication with organization context
const session = await getSession();
if (!session?.user?.organizationId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Performance Optimizations
```typescript
// Parallel queries for better performance
const [users, documents, analytics] = await Promise.all([
  prisma.user.findMany({ where: { organizationId } }),
  prisma.document.findMany({ where: { organizationId } }),
  prisma.analyticsEvent.findMany({ where: { organizationId } })
]);
```

### Error Handling Pattern
```typescript
try {
  // Business logic
  const result = await processRequest();
  return createResponse(result, 'Success message');
} catch (error) {
  console.error('Operation failed:', error);
  return createErrorResponse({
    code: 'OPERATION_FAILED',
    message: 'User-friendly error message',
    statusCode: 500
  });
}
```

---

## 🧪 Testing Your Changes

### Local Testing
```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build the project
npm run build

# Test specific functionality
npm run test:unit
npm run test:integration
```

### Manual Testing Checklist
- [ ] Test happy path scenarios
- [ ] Test error conditions
- [ ] Test with different user roles
- [ ] Test with different organizations
- [ ] Test performance with large datasets
- [ ] Test on different screen sizes (responsive)

---

## 🚀 Deployment Process

### Staging Deployment
```bash
# Deploy to staging for testing
vercel --target staging
```

### Production Deployment
```bash
# Deploy to production (requires approval)
vercel --prod
```

### Deployment Checklist
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Environment variables are set
- [ ] Database migrations are applied
- [ ] Performance is acceptable

---

## 🐛 Debugging Guide

### Common Issues and Solutions

#### Database Connection Issues
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
- Monitor API response times in browser dev tools
- Review caching hit rates
- Analyze bundle size with `npm run analyze`

### Debugging Tools
- **Prisma Studio**: `npm run db:studio` - Database inspection
- **Browser DevTools**: Network tab for API debugging
- **Vercel Logs**: Production debugging
- **Console Logs**: Server-side debugging

---

## 📖 Learning Resources

### Internal Documentation
- `DEVELOPER_DOCUMENTATION.md` - Comprehensive developer guide
- `ARCHITECTURE_GUIDE.md` - System architecture overview
- `OPTIMIZATION_REPORT.md` - Performance optimization details
- `SECURITY.md` - Security implementation guide

### External Resources
- [Next.js Documentation](https://nextjs.org/docs) - Framework documentation
- [Prisma Documentation](https://www.prisma.io/docs) - Database toolkit
- [Tailwind CSS](https://tailwindcss.com/docs) - CSS framework
- [TypeScript Handbook](https://www.typescriptlang.org/docs) - Type system
- [React Documentation](https://react.dev) - UI library

### Video Tutorials
- Next.js App Router tutorial
- Prisma database management
- Tailwind CSS styling
- TypeScript best practices

---

## 🤝 Team Communication

### Communication Channels
- **Slack**: #avenai-dev channel for daily communication
- **GitHub**: Issues and pull requests for code discussion
- **Email**: dev@avenai.io for urgent issues
- **Meetings**: Weekly team sync (schedule in calendar)

### Code Review Process
1. **Self Review**: Review your own code before requesting review
2. **Peer Review**: Request review from team members
3. **Automated Checks**: Ensure CI/CD checks pass
4. **Testing**: Verify changes work as expected
5. **Approval**: Get approval before merging

### Getting Help
- **Documentation**: Check internal docs first
- **Slack**: Ask questions in #avenai-dev
- **Pair Programming**: Request pairing sessions
- **Code Review**: Learn from review feedback
- **Team Meetings**: Discuss architecture decisions

---

## 🎯 Success Metrics

### Week 1 Goals
- [ ] Successfully run the application locally
- [ ] Understand the basic project structure
- [ ] Make your first commit
- [ ] Complete a small bug fix or feature

### Week 2 Goals
- [ ] Understand the multi-tenant architecture
- [ ] Implement a new API endpoint
- [ ] Create a React component
- [ ] Deploy a change to staging

### Month 1 Goals
- [ ] Contribute to a major feature
- [ ] Optimize a performance bottleneck
- [ ] Lead a code review
- [ ] Mentor another developer

---

## 📞 Support Contacts

### Technical Support
- **Lead Developer**: tech-lead@avenai.io
- **DevOps**: devops@avenai.io
- **Security**: security@avenai.io

### General Support
- **HR**: hr@avenai.io
- **Manager**: manager@avenai.io
- **Emergency**: +1-XXX-XXX-XXXX

---

## 🎉 Welcome to the Team!

You're now ready to start contributing to Avenai! Remember:

- **Ask questions**: Don't hesitate to ask for help
- **Read documentation**: Always check docs first
- **Follow conventions**: Maintain code consistency
- **Test thoroughly**: Ensure quality before deployment
- **Communicate**: Keep the team informed of your progress

Happy coding! 🚀

---

*This onboarding guide is updated regularly. Last updated: September 2024*
