# Workspace Components Architecture

## Quick Reference

### 🎯 Need to change the chat header?
**Edit:** `ChatHeader.tsx` (single file, used everywhere)

### 💬 Need to change chat messages or conversation logic?
**Edit:** `SharedChatState.tsx`

### 📐 Need to change layout or positioning?
**Edit:** `WorkspaceShell.tsx`

---

## Component Structure

```
WorkspaceShell.tsx (Main Container)
├── Dataset Info & Settings
├── Document Upload/Management
└── Chat Panel (3 views, all use same components)
    ├── Desktop Sticky Panel
    ├── Mobile Overlay Panel
    └── Expanded Full-Screen Modal
    
    Each view uses:
    ├── ChatHeader.tsx (green dot, buttons)
    └── SharedChatState.tsx (messages, input, logic)
```

---

## Files Explained

### `ChatHeader.tsx` ⭐ Single Source of Truth
**Purpose:** Reusable header component for all chat views

**Props:**
- `onExpand` - Function to expand chat
- `onExitExpand` - Function to exit expanded mode
- `onClose` - Function to close chat
- `isExpanded` - Boolean for expanded state
- `showExpandButton` - Boolean to show/hide expand button

**Why it exists:** Eliminates duplicate code. Change header once, updates everywhere.

---

### `StatusIndicator.tsx` ⭐ Live Status Monitoring
**Purpose:** Real-time API health monitoring with visual indicator

**Features:**
- 🟢 **Green** - Online (< 1s response)
- 🟡 **Amber** - Degraded (1-3s response)
- 🔴 **Red** - Offline (no connection)
- ⚪ **Gray** - Connecting (pulsing animation)

**Props:**
- `showLabel` - Optional boolean to show status text ("Online", "Slow", etc.)

**Behavior:**
- Checks `/api/health` endpoint every 30 seconds
- 5 second timeout for health checks
- Tooltip shows current status on hover
- Automatic reconnection attempts

---

### `WorkspaceShell.tsx` (Main Layout)
**Purpose:** Container that manages the entire workspace page

**Key Responsibilities:**
- Page layout (sidebar, content, chat positioning)
- Open/close/expand/collapse state management
- Settings and configuration
- Responsive behavior (desktop vs mobile)

**What it renders:**
- Document upload section
- Documents table
- Activity feed
- Chat panel container (uses `ChatHeader` + `SharedChatState`)

**State:**
- `isCopilotOpen` - Is chat visible?
- `isCopilotExpanded` - Is chat in full-screen mode?
- `showResponseMetadata` - Show dev badges?
- `showCoverageNotices` - Show coverage warnings?

---

### `SharedChatState.tsx` (Chat Logic)
**Purpose:** The actual chat interface with messages and conversation

**Key Responsibilities:**
- Render conversation history
- Manage messages array and streaming
- Handle user input (textarea, send, stop)
- Edit message functionality
- Feedback (copy, thumbs up/down)
- Auto-scroll and "back to bottom" button
- API communication with `/api/chat`

**Global State:**
- Uses `globalChatState` object so conversation persists when chat is closed/reopened

**Message Types:**
- String (markdown responses)
- Structured JSON (with answers, summary, sources)

---

## Common Changes & Where to Make Them

| What to Change | File | Line/Section |
|----------------|------|--------------|
| Header text/labels | `ChatHeader.tsx` | Lines 18-44 |
| Header buttons | `ChatHeader.tsx` | Lines 23-44 |
| Green dot styling | `ChatHeader.tsx` | Line 20 |
| Message labels ("You", etc.) | `SharedChatState.tsx` | Line 565 |
| Chat input placeholder | `SharedChatState.tsx` | Line 745 |
| Send button icon | `SharedChatState.tsx` | Lines 772-774 |
| Message bubble styling | `SharedChatState.tsx` | Lines 568-577 |
| Auto-scroll behavior | `SharedChatState.tsx` | Lines 68-82 |
| Chat panel width/height | `WorkspaceShell.tsx` | Lines 516, 542, 569 |
| Chat panel positioning | `WorkspaceShell.tsx` | Lines 516, 542, 569 |

---

## Best Practices

### ✅ DO:
- Edit `ChatHeader.tsx` for any header changes (applies everywhere)
- Use the component props to customize behavior per view
- Test all 3 views (desktop, mobile, expanded) after changes
- Keep styling consistent across all views

### ❌ DON'T:
- Duplicate header code in `WorkspaceShell.tsx`
- Hardcode text/labels (use props or constants)
- Break the responsive layout
- Mix chat logic into `WorkspaceShell.tsx`

---

## Testing Checklist

After making changes, verify:
- [ ] Desktop sticky panel (xl+ screens)
- [ ] Mobile overlay panel (< xl screens)
- [ ] Expanded full-screen mode
- [ ] Open/close transitions
- [ ] Expand/collapse transitions
- [ ] Message rendering (markdown & JSON)
- [ ] Send/stop buttons
- [ ] Auto-scroll behavior
- [ ] Edit message functionality

---

## Future Improvements

- [ ] Extract message rendering into separate component
- [ ] Create reusable button components
- [ ] Add theme configuration file
- [ ] Centralize all text/labels for i18n
- [ ] Add unit tests for chat logic
