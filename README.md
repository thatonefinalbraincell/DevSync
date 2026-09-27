# 🚀 DevSync

**DevSync** is a modern, real-time collaborative code editor built for developers, pair programming, technical interviews, and classrooms. It features **Yjs CRDT conflict resolution**, **Google Docs-style multi-user cursor tracking**, **live room chat**, and an **integrated multi-language code execution engine**.

---

## 🌟 Key Features

- ⚡ **Yjs CRDT Conflict Resolution**: Guarantees zero text overwriting or data loss during concurrent typing using Conflict-Free Replicated Data Types.
- 🟢 **Live Multi-Cursor Presence**: Displays real-time vertical cursor lines and floating user name tags in constant, distinct colors (like Google Docs).
- 📁 **Multi-File Project Explorer**: Create, delete, and manage code files (`.cpp`, `.js`, `.py`, `.html`, `.md`) with tabbed editor switching.
- ▶️ **Code Execution Engine**: Run C++, JavaScript, Python, and HTML directly inside the integrated terminal console with STDOUT, STDERR, and execution time metrics.
- 💬 **Live Room Chat**: In-app chat stream with quick-action chips and typing status indicators ("Arjun is typing...").
- 🌗 **Netflix Dark & Apple Light Themes**: Easily toggle between Netflix Deep Black (`#141414`) and Apple Light (`#F5F5F7`) themes.
- 🔗 **Smart Room Sharing**: Separate 1-click actions for copying ONLY the Room ID (`#A7F2`) or the full Invite Link (`http://.../room/A7F2`).
- 🗄️ **Supabase PostgreSQL & Prisma**: Database persistence for rooms, files, and chat messages with a graceful in-memory fallback store.

---

## 🏗️ System Architecture

```mermaid
graph TD
    UserA["👤 Developer A (Client)"] <-->|WebSockets / Socket.IO| Backend["🚀 Express Backend Server"]
    UserB["👤 Developer B (Client)"] <-->|WebSockets / Socket.IO| Backend
    Backend <-->|Yjs CRDT Sync| YjsEngine["🧠 Yjs CRDT Engine"]
    Backend <-->|Execution Runner| CodeRunner["⚡ Code Execution Service (JS / Py / C++)"]
    Backend <-->|Prisma ORM| Database[("🗄️ Supabase PostgreSQL")]
```

---

## 🧱 Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 19, TypeScript)
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **CRDT Sync**: Yjs (`yjs`, `y-monaco`)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **WebSockets**: Socket.IO Client

### Backend
- **Runtime**: Node.js & Express
- **Real-Time Communication**: Socket.IO Server
- **CRDT Processing**: Yjs (`yjs`)
- **ORM & Database**: Prisma ORM with Supabase (PostgreSQL)
- **Code Execution**: Node.js `child_process` & Sandbox Runners

---

## 📁 Project Structure

```
DevSync/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Prisma Models (Room, File, ChatMessage, User)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── crdt.ts           # Yjs CRDT Master Store & State Vector processing
│   │   │   └── db.ts             # Prisma Client & In-Memory Fallback Store
│   │   ├── services/
│   │   │   └── codeRunner.ts     # Multi-Language Code Execution Engine
│   │   └── server.ts             # Express REST API & Socket.IO Handlers
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css       # Global styles & theme definitions
│   │   │   ├── page.tsx          # Landing & Room Creation/Join Page
│   │   │   └── room/[roomId]/
│   │   │       └── page.tsx      # Main Collaborative Workspace
│   │   ├── components/
│   │   │   ├── Header.tsx        # Top Bar (Room ID, Invites, Presences, Theme Toggle)
│   │   │   ├── Sidebar.tsx       # File Explorer Tree & File Creation
│   │   │   ├── EditorTabBar.tsx  # Open File Tabs & Language Selector
│   │   │   ├── MonacoEditorWrapper.tsx # Monaco Editor & CRDT Delta Sync
│   │   │   ├── ChatPanel.tsx     # Live Room Chat Drawer
│   │   │   └── TerminalOutput.tsx# Code Execution Console Output
│   │   ├── lib/
│   │   │   ├── crdt.ts           # Client-side Yjs CRDT Helpers
│   │   │   ├── socket.ts         # Socket.IO Client Singleton
│   │   │   ├── supabase.ts       # Supabase Client & User Sessions
│   │   │   └── theme.ts          # Theme Storage Helper (Dark / Light)
│   │   └── types/
│   │       └── index.ts          # Shared TypeScript Interfaces
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

---

### 1. Clone & Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:
```env
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_SUPABASE_REF].supabase.co:5432/postgres"
PORT=5000
```

Push the database schema to PostgreSQL:
```bash
npx prisma db push
```

Start the Backend Server:
```bash
npm run dev
```
*(The backend runs on `http://localhost:5000`)*

---

### 2. Setup Frontend

Open a new terminal window:
```bash
cd frontend
npm install
```

Create a `.env.local` file inside `frontend/`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_SUPABASE_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the Next.js Frontend Server:
```bash
npm run dev
```
*(The frontend runs on `http://localhost:3000`)*

---

## 🧪 Testing Multi-User Real-Time Collaboration

1. Open `http://localhost:3000` in Browser Tab A.
2. Click **Create Room** to generate a new workspace (e.g. Room `#A7F2`).
3. Copy the **Invite Link** or **Room ID** (`A7F2`).
4. Open an Incognito Window or Browser Tab B, paste the link or enter the Room ID.
5. Type in the code editor or chat stream in Tab A and observe instant, conflict-free CRDT synchronization in Tab B!

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more details.
