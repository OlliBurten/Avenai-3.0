# Contributing to Avenai 3.0

## 🎯 Quick Navigation: Where to Change What

This guide helps you (and AI assistants like Cursor) know exactly which file to edit for common tasks.

---

## 📁 Repository Structure

```
Avenai 3.0/
├── app/
│   ├── (dashboard)/          ← Dashboard pages (AI Copilot, Analytics, etc.)
│   ├── api/                  ← API routes (chat, auth, api-keys)
│   ├── integration-guide/    ← Quick Start Guide for pilot users
│   ├── preview/              ← Widget demo page
│   └── auth/                 ← Authentication pages
├── components/
│   ├── workspace/            ← AI Copilot workspace components ⭐
│   ├── copilot/              ← Copilot sub-components (feedback, badges, etc.)
│   ├── datasets/             ← Dataset management components
│   └── ui/                   ← Base UI components (Button, Card, etc.)
├── lib/                      ← Utilities, database, auth, RAG logic
├── styles/                   ← Design tokens and global styles
└── prisma/                   ← Database schema and migrations
```

---

## 🎨 Design & Styling

### **Want to change brand colors?**
**Edit:** `styles/tokens.css`
- Primary purple: `--color-primary: #7F56D9`
- All colors defined as CSS variables
- Automatically synced with Tailwind config

### **Want to change component styling?**
**Edit:** The component file directly (use Tailwind classes)
- All components use Tailwind utilities
- Brand colors: `bg-primary` or `text-brand-600`
- Design tokens: `var(--color-primary)`

### **Want to change global styles?**
**Edit:** `app/globals.css`
- Imports design tokens from `styles/tokens.css`
- Typography styles for markdown
- Base styles for html/body

---

## 💬 Chat & Copilot Features

### **Want to change the chat interface?**
**Edit:** `components/workspace/SharedChatState.tsx`
- Message rendering
- Input box and send button
- Streaming logic
- Feedback buttons (thumbs up/down)
- Copy functionality
- Auto-scroll behavior

### **Want to change the chat header?**
**Edit:** `components/workspace/ChatHeader.tsx`
- Logo and title
- Expand/minimize buttons
- Close button
- Header styling

### **Want to change the workspace layout?**
**Edit:** `components/workspace/WorkspaceShell.tsx`
- 30/70 split layout (sidebar + chat)
- Upload documents section
- Document list
- Activity & stats
- Chat panel positioning

### **Want to add/modify chat features?**
| Feature | File | Component |
|---------|------|-----------|
| Feedback buttons | `app/(components)/copilot/FeedbackButtons.tsx` | Individual thumbs component |
| Source chips | `app/(components)/copilot/SourceChips.tsx` | Document source badges |
| Confidence badge | `app/(components)/copilot/ConfidenceBadge.tsx` | HIGH/MED/LOW indicator |
| Markdown rendering | `app/(components)/copilot/ChatMarkdown.tsx` | Format AI responses |
| Structured responses | `app/(components)/copilot/StructuredResponse.tsx` | JSON/table displays |

---

## 📄 Pages & Routes

### **Want to edit the Dashboard?**
**Edit:** `app/(dashboard)/dashboard/page.tsx`
- Pilot status banner
- Welcome message
- Next steps cards
- Loading states

**Client Logic:** `components/DashboardClient.tsx`

### **Want to edit the AI Copilot page?**
**Edit:** `app/(dashboard)/datasets/[id]/page.tsx`
- Server-side data fetching
- Props passed to WorkspaceShell

**Layout:** `components/workspace/WorkspaceShell.tsx`

### **Want to edit the Quick Start Guide?**
**Edit:** `app/integration-guide/page.tsx`
- Step progression
- Code examples (cURL, Python, JavaScript)
- Test API functionality
- Integration status

### **Want to edit the Preview page?**
**Edit:** `app/preview/page.tsx`
- Widget demo landing page
- Floating "Ask AI" button
- Widget modal (compact & expanded views)

### **Want to edit API Keys page?**
**Edit:** `app/(dashboard)/api-keys/page.tsx`
- API key generation
- Key management UI
- Usage stats display

### **Want to edit Analytics page?**
**Edit:** `app/(dashboard)/analytics/page.tsx`
- Pilot metrics (satisfaction, confidence, queries)
- Charts and visualizations

---

## 🔌 API Routes

### **Want to change chat API logic?**
**Edit:** `app/api/chat/route.ts` (session-based) or `app/api/v1/chat/route.ts` (API key-based)
- Message processing
- Context retrieval
- LLM calls
- Response streaming
- Analytics tracking

### **Want to change API key management?**
**Edit:** `app/api/api-key/route.ts`
- Generate API keys
- List active keys
- Revoke keys
- Usage tracking

### **Want to change analytics?**
**Edit:** `app/api/analytics/route.ts`
- Pilot metrics queries
- Satisfaction rate calculation
- Confidence distribution
- Top queries

---

## 🗄️ Database & Backend

### **Want to change the database schema?**
**Edit:** `prisma/schema.prisma`
**Then run:** `npx prisma db push` (dev) or `npx prisma migrate dev` (with migration)

### **Want to change vector search?**
**Edit:** `lib/pgvector.ts`
- Semantic search with pgvector
- Hybrid search (vector + keyword)
- Embedding storage
- Search parameters

### **Want to change RAG/retrieval logic?**
**Edit:**
- `lib/rag/retrieval.ts` - Document chunking and retrieval
- `lib/rag/ranking.ts` - Score and rank results
- `lib/rag/context.ts` - Context assembly

### **Want to change authentication?**
**Edit:** `app/api/auth/[...nextauth]/authOptions.ts`
- OAuth providers (Google, Azure AD)
- Session callbacks
- JWT configuration

---

## 🧩 Component Guidelines

### **✅ DO:**
- Use `components/workspace/SharedChatState.tsx` for all chat UIs
- Use `components/workspace/ChatHeader.tsx` for all chat headers
- Use Tailwind classes for styling (not inline styles)
- Use design tokens from `styles/tokens.css`
- Keep components small and focused (< 300 lines)

### **❌ DON'T:**
- Create new chat components (use SharedChatState)
- Duplicate chat logic (extend SharedChatState instead)
- Add page-level CSS (use Tailwind or component styles)
- Hardcode colors (use design tokens)
- Create backup files (.backup, .old, etc.)

---

## 🎯 Common Tasks

### **Add a new pilot metric**
1. Update `app/api/analytics/route.ts` - Add SQL query
2. Update `app/(dashboard)/analytics/page.tsx` - Display the metric
3. Update `AnalyticsData` interface if needed

### **Change chat message styling**
1. Edit `components/workspace/SharedChatState.tsx`
2. Find the message bubble rendering (look for `.map((message)`)
3. Update Tailwind classes

### **Add a feedback feature**
1. Create component in `app/(components)/copilot/`
2. Import in `SharedChatState.tsx`
3. Add API route in `app/api/` if needed

### **Change widget appearance (for preview page)**
1. Edit `app/preview/page.tsx` - Widget container
2. Edit `components/workspace/ChatHeader.tsx` - Header styling
3. Edit `components/workspace/SharedChatState.tsx` - Chat content

---

## 🚀 Development Workflow

### **Local Development:**
```bash
# Start dev server
npm run dev

# Run type checking
npm run type-check

# Run linter
npm run lint

# Verify everything (type-check + lint + build)
npm run verify

# Quick verify (type-check + lint, skip build)
npm run verify:quick

# Access at http://localhost:3000
# Database: postgresql://harburt@localhost:5432/avenai
```

### **Making Changes:**
1. Find the right file using this guide
2. Edit using Tailwind classes and design tokens
3. Test locally
4. Check for TypeScript errors: `npm run build`
5. Check for linter errors: `npm run lint`

### **Database Changes:**
```bash
# Update schema
Edit prisma/schema.prisma

# Apply changes (dev)
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Restart Next.js server
```

---

## 📦 File Naming Conventions

- **Pages:** `page.tsx` (Next.js App Router)
- **Components:** `PascalCase.tsx` (e.g., `ChatHeader.tsx`)
- **Utilities:** `camelCase.ts` (e.g., `pgvector.ts`)
- **Hooks:** `useThing.ts` (e.g., `useAuth.ts`)
- **Types:** `types.ts` or inline in component

---

## 🎨 Brand Identity

### **Avenai Purple:**
- Primary: `#7F56D9`
- Light: `#9E77ED`  
- Dark: `#6941C6`
- Background: `#F9F5FF`
- Border: `#E9D7FE`

### **Logo Usage:**
- **White logo:** `/logo-mark-white.svg` (on purple backgrounds)
- **Black logo:** `/logo-mark-black.svg` (on light backgrounds)
- **Full logo:** `/logo-full.svg` (wordmark + icon)

### **Animations:**
- **Loading:** Pulse effect (`animate-pulse`)
- **Hover:** Scale 105% (`hover:scale-105`)
- **Transitions:** 200ms ease-in-out

---

## 🔍 Finding Code

### **"Where is X defined?"**

| Looking for... | Check... |
|----------------|----------|
| Chat messages | `components/workspace/SharedChatState.tsx` |
| Chat header | `components/workspace/ChatHeader.tsx` |
| Workspace layout | `components/workspace/WorkspaceShell.tsx` |
| Feedback buttons | `app/(components)/copilot/FeedbackButtons.tsx` |
| API key logic | `app/api/api-key/route.ts` |
| Chat API | `app/api/chat/route.ts` or `app/api/v1/chat/route.ts` |
| Vector search | `lib/pgvector.ts` |
| Database queries | Search for `prisma.` in relevant files |

---

## ⚠️ Important Notes

### **Single Source of Truth:**
- **Chat UI:** Only `SharedChatState.tsx` - no other chat components
- **Brand Colors:** Only `styles/tokens.css` - no hardcoded colors
- **Chat Header:** Only `ChatHeader.tsx` - used everywhere

### **What's Deprecated (Don't Use):**
- ❌ `ChatClient.tsx` (deleted)
- ❌ `ChatWidget.tsx` (deleted)
- ❌ `WidgetPreview.tsx` (deleted)
- ❌ `components/widget/` (deleted)
- ❌ `/billing`, `/usage`, `/chat` pages (deleted)

### **Development Bypasses:**
- Dev mode allows API key generation without permissions
- `av_onb=1` cookie bypasses onboarding
- Fallback organization creation in dev

---

## 🐛 Troubleshooting

### **Chat not working?**
1. Check `components/workspace/SharedChatState.tsx` for errors
2. Check browser console for API errors
3. Check terminal for server-side errors
4. Verify `DATABASE_URL` in `.env.local`

### **Styling not applying?**
1. Hard refresh browser (Cmd+Shift+R)
2. Check Tailwind class names are correct
3. Verify design tokens imported in `globals.css`
4. Restart dev server

### **Database errors?**
1. Check PostgreSQL is running
2. Run `npx prisma generate`
3. Run `npx prisma db push`
4. Restart dev server

---

## 📞 Need Help?

- **Architecture questions:** See `ARCHITECTURE_GUIDE.md`
- **Business context:** See `BUSINESS_PLAN.md`
- **Security:** See `SECURITY.md`
- **Deployment:** See `DEPLOYMENT_GUIDE.md`

---

**Last Updated:** October 21, 2025  
**Maintained by:** Avenai Development Team

