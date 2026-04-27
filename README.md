# 🔍 Askly — Perplexity-Style AI Search Engine

> A full-stack AI-powered search application that works just like Perplexity AI.
> Type a question → it searches the web → an AI reads the results → gives you a clear, cited answer.

---

## 📋 Table of Contents

1. [What Does This App Do?](#what-does-this-app-do)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [How It All Works (Big Picture)](#how-it-all-works-big-picture)
5. [Backend Deep Dive](#backend-deep-dive)
   - [Entry Point — index.js](#entry-point--indexjs)
   - [Routes](#routes)
   - [Controllers](#controllers)
   - [Services](#services)
   - [Models](#models)
   - [Middleware](#middleware)
   - [Lib (Shared Utilities)](#lib-shared-utilities)
6. [Frontend Deep Dive](#frontend-deep-dive)
   - [Pages](#pages)
   - [Components](#components)
   - [Lib (Frontend Utilities)](#lib-frontend-utilities)
7. [Database Schema](#database-schema)
8. [Environment Variables](#environment-variables)
9. [Running Locally](#running-locally)
10. [API Reference](#api-reference)
11. [How Auth Works](#how-auth-works)
12. [How Search Works](#how-search-works)

---

## What Does This App Do?

1. User types a question like **"What are laptops?"**
2. The app searches the web using **Tavily** (an AI-friendly search API)
3. The web results are sent to an **LLM (AI model)** — by default Groq's Llama 3
4. The AI reads the web results and writes a clear, cited answer
5. The answer + sources + images are shown to the user in a beautiful UI
6. Everything is saved to a database so you can revisit old chats

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React + TypeScript + Vite | Fast, modern UI framework |
| **Styling** | Tailwind CSS + shadcn/ui | Beautiful components out of the box |
| **Backend** | Node.js + Express | Simple, fast web server |
| **Runtime** | Bun | Faster than Node for local dev |
| **Database** | Supabase (PostgreSQL) | Free, hosted database + built-in auth |
| **Auth** | Supabase Auth | Handles login, signup, JWT tokens |
| **Web Search** | Tavily API | Search engine built specifically for AI apps |
| **AI Model** | Groq (Llama 3) | Free, fast LLM API |
| **Deployment** | Vercel (frontend) + Railway (backend) | Easy cloud hosting |

---

## Project Structure

```
Perplexity/
├── frontend/                  ← React app (what users see)
│   └── src/
│       ├── pages/             ← One file per page/screen
│       ├── components/        ← Reusable UI pieces
│       │   ├── app/           ← App-specific components
│       │   └── ui/            ← Generic UI (buttons, inputs, etc.)
│       └── lib/               ← Helper functions & API calls
│
├── backend/                   ← Express server (handles requests)
│   └── src/
│       ├── index.js           ← Server entry point
│       ├── routes/            ← URL path definitions
│       ├── controllers/       ← Business logic for each route
│       ├── services/          ← External API calls (Tavily, Groq)
│       ├── models/            ← Database query functions
│       ├── middleware/        ← Request filters (auth check)
│       └── lib/               ← Shared server utilities (Supabase client)
│
└── package.json               ← Root scripts to run both together
```

---

## How It All Works (Big Picture)

```
User types question
        │
        ▼
  Frontend (React)
  Search.tsx page
        │
        │  POST /api/search  (sends question + auth token)
        ▼
  Backend (Express)
  requireAuth middleware ──── checks token with Supabase
        │
        ▼
  searchController.js
        │
        ├──► searchWeb()        → calls Tavily API → gets web results + images
        │
        ├──► summarizeWithAI()  → sends results to Groq LLM → gets AI answer
        │
        └──► saves to DB        → thread + messages stored in Supabase
        │
        │  returns { answer, sources, images, threadId }
        ▼
  Frontend displays answer
  in Answer / Images / Sources tabs
```

---

## Backend Deep Dive

The backend is a standard **Express.js** REST API server. Every incoming request goes through this chain:

```
HTTP Request → Middleware → Route → Controller → Service/Model → Response
```

### Entry Point — `index.js`

**File:** `backend/src/index.js`

This is the very first file that runs when you start the server. It:

1. Creates the Express app
2. Sets up **CORS** (which websites are allowed to talk to this server)
3. Registers middleware (JSON parsing, cookies, logging)
4. Mounts routes at their URL prefixes
5. Starts listening on a port

```js
// Which websites are allowed to make requests to this server
const allowedOrigins = [
  "https://perplexity-pi.vercel.app",  // production frontend
  "http://localhost:8080",              // local Vite dev server
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use('/api/auth', authRoutes);    // login/signup routes
app.use('/api/search', searchRoutes); // search routes
```

> **Beginner tip:** CORS is a browser security feature. Without it, your frontend on port 8080 cannot talk to your backend on port 3000. By listing `localhost:8080` in `allowedOrigins`, you're explicitly giving it permission.

---

### Routes

Routes are like a **reception desk** — they just look at the URL and method, then hand the request off to the right controller function.

#### `routes/auth.js`

| Method | URL | What it does |
|--------|-----|-------------|
| `POST` | `/api/auth/signup` | Create a new account |
| `POST` | `/api/auth/login` | Sign in and get a token |
| `POST` | `/api/auth/logout` | Sign out |
| `POST` | `/api/auth/refresh` | Exchange a refresh token for a new access token |
| `GET` | `/api/auth/oauth/:provider` | Start Google/GitHub OAuth login |
| `POST` | `/api/auth/oauth/callback` | Finish OAuth login |

#### `routes/search.js`

All these routes require you to be logged in (`requireAuth` middleware runs first).

| Method | URL | What it does |
|--------|-----|-------------|
| `POST` | `/api/search` | Run a new AI search |
| `GET` | `/api/search/history` | Get your past chat threads |
| `GET` | `/api/search/history/:threadId` | Get messages in a specific thread |
| `DELETE` | `/api/search/history` | Clear all your history |
| `GET` | `/api/search/tokens` | Check how many tokens you've used |
| `GET` | `/api/search/llm-keys` | List your saved API keys |
| `POST` | `/api/search/llm-keys` | Save a new API key |
| `DELETE` | `/api/search/llm-keys/:keyId` | Delete a saved API key |

> **Beginner tip:** Think of routes like a phone operator. "You want `/api/search`? Let me put you through to the search controller."

---

### Controllers

Controllers contain the actual **business logic**. They receive the request, decide what to do, call the right services/models, and send back a response.

#### `controllers/authController.js`

Handles all authentication using Supabase Auth.

| Function | What it does |
|----------|-------------|
| `signup` | Calls `supabase.auth.signUp()` with email + password + name |
| `login` | Calls `supabase.auth.signInWithPassword()`, returns a JWT token |
| `logout` | Calls `supabase.auth.signOut()` |
| `refresh` | Calls `supabase.auth.refreshSession()` to get a fresh JWT |
| `oauthSignIn` | Gets a Google/GitHub redirect URL from Supabase |
| `oauthCallback` | Exchanges an OAuth code for a session |

#### `controllers/searchController.js`

The main brain of the app. The `search` function:

```
1. Validate the query isn't empty
2. Check the user's DB profile + token usage
3. Enforce free-plan token limits
4. Create a new thread in the DB (or reuse existing)
5. Call searchWeb() → get web results + images from Tavily
6. Resolve which LLM to use (user's custom key or default Groq)
7. Call summarizeWithAI() → get AI-written answer
8. Save the answer as a message in the DB
9. Log token usage for billing/limits
10. Return { answer, sources, images, threadId } to the frontend
```

Other functions in `searchController.js`:

| Function | What it does |
|----------|-------------|
| `getHistory` | Returns a list of the user's past threads |
| `getThreadHistory` | Returns all messages in one thread |
| `getTokenStatus` | Returns how many tokens the user has used |
| `addUserLlmKey` | Saves a user's own API key encrypted in the DB |
| `listUserLlmKeys` | Returns all saved API keys |
| `removeUserLlmKey` | Deletes a saved API key |
| `clearHistory` | Deletes all threads for this user |

---

### Services

Services are focused modules that **talk to external APIs**. They know nothing about HTTP requests — they just take inputs and return outputs.

#### `services/webSearch.js`

Calls the **Tavily API** to search the web.

```js
// Input: "What are laptops?"
// Output: { sources: [{title, url, snippet}, ...], images: ["https://...", ...] }

const response = await fetch("https://api.tavily.com/search", {
  body: JSON.stringify({
    api_key: TAVILY_API_KEY,
    query: query,
    max_results: 8,
    include_images: true,   // also fetch images!
  })
});
```

Tavily is special — it returns clean text snippets from web pages, which is perfect for feeding to an AI. Regular Google results would return messy HTML.

#### `services/aiSummarize.js`

Calls an **LLM (AI model)** to generate an answer from the web results.

```
Input: user's question + array of web snippets
Output: { answer: "Laptops are...", model: "llama-3.1-8b", usage: {...} }
```

The function builds a prompt like:
```
You are a helpful AI search assistant.
The user asked: "What are laptops?"

Here are web results:
[1] Title: Laptop - Wikipedia ...
[2] Title: Best laptops 2024 ...

Answer clearly, cite sources like [1] [2], don't make things up.
```

It supports **any OpenAI-compatible API** (Groq, OpenRouter, etc.) by accepting a `llmConfig` parameter with `{ provider, apiKey, model, baseUrl }`.

---

### Models

Models are the **database layer** — they know how to read and write data to Supabase (PostgreSQL). Each model file maps to one database table.

> **Beginner tip:** Think of models as a "translator" between your JavaScript code and your database. Instead of writing raw SQL, you call functions like `getUserById("abc-123")`.

| Model File | Database Table | What it stores |
|-----------|---------------|----------------|
| `userModel.js` | `users` | User profiles (name, email, subscription tier) |
| `threadModel.js` | `threads` | Chat sessions (each search starts a thread) |
| `messageModel.js` | `messages` | Individual messages within a thread |
| `sourceModel.js` | `sources` | Web sources used in a search |
| `usageModel.js` | `usage_events` | Token usage logs for billing |
| `userLlmKeyModel.js` | `user_llm_keys` | User's saved custom API keys |
| `spaceModel.js` | `spaces` | Spaces (groups of threads) |
| `collectionModel.js` | `collections` | Saved/bookmarked searches |
| `searchCacheModel.js` | `search_cache` | Cached search results |
| `feedbackModel.js` | `feedback` | Thumbs up/down on answers |
| `trendingModel.js` | `trending_queries` | Popular search queries |
| `apiKeyModel.js` | `api_keys` | Admin API keys |
| `followUpModel.js` | `follow_up_questions` | Suggested follow-up questions |

**Example — `threadModel.js`:**

```js
// Create a new thread when user starts a chat
export async function createThread({ user_id }) {
  const { data, error } = await supabase
    .from("threads")        // which table
    .insert({ user_id })    // what to insert
    .select()               // return the created row
    .single();              // expect one row back

  if (error) throw error;
  return data;              // { id: "uuid", user_id: "...", created_at: "..." }
}
```

All models are exported from `models/index.js` so you import everything from one place:
```js
import { createThread, getThreadById, createMessage } from "../models/index.js";
```

---

### Middleware

Middleware are functions that run **before** your controller. They can check things, modify the request, or block it entirely.

#### `middleware/requireAuth.js`

Protects routes so only logged-in users can access them.

```
Request comes in
      │
      ▼
Extract "Bearer <token>" from Authorization header
      │
      ├── No token? → 401 "Missing Bearer token"
      │
      ▼
Call supabase.auth.getUser(token)
      │
      ├── Token invalid/expired? → 401 "Invalid or expired token"
      │                            (frontend auto-refreshes the token and retries)
      │
      └── Token valid → attach user object to req.user → call next()
                        (controller can now use req.user.id)
```

> **Beginner tip:** `next()` means "okay, everything checks out, pass the request to the next function in the chain" (which is the controller).

---

### Lib (Shared Utilities)

#### `lib/supabase.js`

Creates and exports the Supabase client used everywhere:

```js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,  // admin key — can verify any user token
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

We use `SERVICE_ROLE` key on the backend (not the anon key) so we can verify any user's JWT token reliably.

---

## Frontend Deep Dive

The frontend is a **React + TypeScript** app built with Vite. It talks to the backend via `fetch()` calls.

### Pages

Each file in `src/pages/` is one full screen.

#### `pages/Index.tsx` — Home Page
The landing page with the search box. When you type a question and hit enter, it redirects you to `/search?q=your+question`.

#### `pages/Search.tsx` — Search Results Page ⭐ (main page)

This is the most important page. It:

1. Reads the `q` (query) and `threadId` from the URL
2. If `threadId` exists → loads saved messages from the DB (old chat view)
3. If no `threadId` → calls `POST /api/search` to run a fresh search
4. Shows results in 3 tabs:
   - **Answer** — AI-written answer with sources strip
   - **Images** — masonry grid of relevant images
   - **Sources** — full list of web sources with snippets

```
URL: /search?q=what+are+laptops
URL: /search?q=what+are+laptops&threadId=abc-123  ← old chat
```

#### `pages/LibraryPage.tsx` — Chat History
Shows all your past threads. Fetches from `GET /api/search/history` and merges with locally stored threads (for guests).

#### `pages/SignIn.tsx` — Login / Signup
Simple form with email + password. On success, saves the `access_token` and `refresh_token` to `localStorage`.

#### `pages/Account.tsx` — Account Settings
Shows your profile, token usage, and lets you manage custom LLM API keys.

#### `pages/Discover.tsx` — Discover Page
Trending/suggested searches (UI only).

#### `pages/Spaces.tsx` — Spaces
Organize threads into groups (UI only).

---

### Components

#### `components/app/AppLayout.tsx`
The outer shell that wraps every page. Contains:
- The sidebar (left nav)
- The top header
- A listener for `askly:session-expired` events → redirects to sign-in if your token expires and can't be refreshed

#### `components/app/AppSidebar.tsx`
The left navigation sidebar with links to Home, Discover, Spaces, Library, and the "New Thread" button.

#### `components/app/SearchBox.tsx`
The search input at the bottom of the Search page. Handles:
- Text input
- Model selector dropdown
- Submit on Enter key or button click

#### `components/app/ModelSelector.tsx`
Dropdown to pick which AI model to use for your search. Includes preset models (Groq Llama, etc.) and any custom API keys you've added.

#### `components/ui/` — Generic UI Components
These are **shadcn/ui** components — pre-built, accessible UI primitives:
- `button.tsx` — Button component
- `input.tsx` — Text input
- `textarea.tsx` — Multi-line text input
- `sidebar.tsx` — Sidebar layout component
- `toaster.tsx` / `sonner.tsx` — Toast notification popups
- ...and many more

---

### Lib (Frontend Utilities)

#### `lib/api.ts` ⭐

The **single place** where all API calls are made. Every function here talks to the backend.

Key features:
- **401 auto-refresh**: If any request gets a "token expired" error, it automatically fetches a new token using the stored `refresh_token` and **retries the original request** — completely invisible to the user
- If refresh fails → dispatches `askly:session-expired` event → user is redirected to sign-in

```ts
// Example: run a search
export function searchQuery(token, query, threadId?, llmConfigOverride?) {
  return request("/api/search", {
    method: "POST",
    token,
    body: { query, threadId, llmConfigOverride }
  });
}
```

Functions available in `api.ts`:

| Function | Calls | What it does |
|----------|-------|-------------|
| `login()` | `POST /api/auth/login` | Sign in |
| `signup()` | `POST /api/auth/signup` | Create account |
| `refreshToken()` | `POST /api/auth/refresh` | Get new access token |
| `searchQuery()` | `POST /api/search` | Run a search |
| `getHistory()` | `GET /api/search/history` | Get past threads |
| `getThread()` | `GET /api/search/history/:id` | Get one thread's messages |
| `clearHistory()` | `DELETE /api/search/history` | Clear all history |
| `getTokenStatus()` | `GET /api/search/tokens` | Check usage |
| `listLlmKeys()` | `GET /api/search/llm-keys` | List API keys |
| `addLlmKey()` | `POST /api/search/llm-keys` | Save API key |

#### `lib/auth.tsx`

React context that stores the logged-in user's session. Available throughout the app via `useAuth()` hook.

```ts
const { token, email, isAuthenticated, setSession, clearSession } = useAuth();
```

On app start, it:
1. Reads the stored session from `localStorage`
2. If the `access_token` is expired but we have a `refresh_token` → silently gets a new one
3. If the `refresh_token` window (7 days) has passed → clears session (user must log in again)

Session stored in `localStorage` as:
```json
{
  "token": "eyJ...",           ← Supabase access_token (JWT, expires ~1 hour)
  "refreshToken": "abc...",    ← Used to get a new access_token
  "email": "user@example.com",
  "expiresAt": 1234567890,     ← 7-day window for refresh_token
  "accessTokenExpiresAt": 123  ← When the JWT itself expires
}
```

#### `lib/localHistory.ts`

Saves a list of recent searches in `localStorage` so the Library page works even without a server-side account. Deduplicates entries within a 15-second window.

#### `lib/localLlmKeys.ts`

Stores custom LLM API keys locally in `localStorage` (not sent to the server unless you're logged in).

---

## Database Schema

The database lives in **Supabase** (PostgreSQL). Key tables:

```
users
  id, email, display_name, subscription_tier (free/pro), searches_this_month

threads
  id, user_id, title, mode (concise/detailed/creative), created_at

messages
  id, thread_id, role (user/assistant/system), content, model, input_tokens, output_tokens

usage_events
  id, user_id, thread_id, prompt_tokens, completion_tokens, model, created_at

user_llm_keys
  id, user_id, provider, api_key (encrypted), model, base_url, is_default
```

---

## Environment Variables

### Backend — `backend/.env`

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE=eyJ...      ← used for verifying user tokens server-side

# External APIs
TAVILY_API_KEY=tvly-...           ← for web search + images
GROQ_API_KEY=gsk_...              ← default LLM (free tier available)

# Optional
PORT=3000
FREE_PLAN_MONTHLY_TOKEN_LIMIT=50000
OAUTH_REDIRECT_URL=http://localhost:3000/auth/callback
```

### Frontend — `frontend/.env.local`

```env
VITE_API_BASE_URL=http://localhost:3000    ← points to your local backend
```

In production this variable is set to the deployed backend URL on Vercel/Railway.

---

## Running Locally

### Prerequisites
- [Bun](https://bun.sh/) installed (`curl -fsSL https://bun.sh/install | bash`)
- A [Supabase](https://supabase.com) account (free)
- A [Tavily](https://tavily.com) API key (free)
- A [Groq](https://console.groq.com) API key (free)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-username/perplexity-clone
cd perplexity-clone

# 2. Install all dependencies
bun install

# 3. Set up backend environment
cp backend/.env.example backend/.env
# Edit backend/.env and fill in your API keys

# 4. Set up frontend environment
echo "VITE_API_BASE_URL=http://localhost:3000" > frontend/.env.local

# 5. Start both servers at once
bun run dev
```

This starts:
- **Backend** at `http://localhost:3000`
- **Frontend** at `http://localhost:8080`

Open `http://localhost:8080` in your browser. ✅

---

## API Reference

### `POST /api/search`

Run an AI search.

**Headers:** `Authorization: Bearer <token>`

**Request body:**
```json
{
  "query": "What are laptops?",
  "threadId": "optional-existing-thread-id",
  "llmConfigOverride": {
    "provider": "groq",
    "apiKey": "your-key",
    "model": "llama-3.1-8b-instant"
  }
}
```

**Response:**
```json
{
  "answer": "Laptops are portable computers...",
  "sources": [
    { "title": "Laptop - Wikipedia", "url": "https://...", "snippet": "..." }
  ],
  "images": ["https://upload.wikimedia.org/..."],
  "threadId": "uuid-of-thread",
  "model": "llama-3.1-8b-instant",
  "tokenUsage": { "prompt": 512, "completion": 256 }
}
```

### `POST /api/auth/login`

**Request body:** `{ "email": "...", "password": "..." }`

**Response:** `{ "session": { "access_token": "...", "refresh_token": "..." }, "user": {...} }`

### `POST /api/auth/refresh`

Exchange an expired access token for a fresh one.

**Request body:** `{ "refreshToken": "..." }`

**Response:** `{ "session": { "access_token": "...", "refresh_token": "..." } }`

---

## How Auth Works

```
1. User signs in → backend calls Supabase → gets access_token + refresh_token
2. Frontend stores both in localStorage
3. Every API request includes: Authorization: Bearer <access_token>
4. Backend middleware calls supabase.auth.getUser(token) to verify it
5. Supabase access_tokens expire after ~1 hour
6. When expired → frontend auto-calls POST /api/auth/refresh with the refresh_token
7. Gets a new access_token → retries the failed request automatically
8. refresh_token is valid for 7 days → after that, user must sign in again
```

---

## How Search Works

```
User: "What are laptops?"
          │
          ▼
  POST /api/search
  { query: "What are laptops?" }
          │
          ▼
  ┌─── requireAuth ────────────────────────────────┐
  │  Verify token with Supabase                    │
  │  Attach req.user = { id, email }               │
  └────────────────────────────────────────────────┘
          │
          ▼
  searchController.search()
          │
          ├── Check free plan token limit
          ├── Create thread in DB (or reuse existing)
          │
          ├──► webSearch.searchWeb("What are laptops?")
          │         │
          │         ▼
          │    Tavily API ──► returns top 8 web pages + images
          │
          ├──► aiSummarize.summarizeWithAI(query, sources, llmConfig)
          │         │
          │         ▼
          │    Groq API (Llama 3)
          │    Prompt: "User asked X. Here are web results. Write a clear answer."
          │         │
          │         ▼
          │    "Laptops are portable computers... [1][2]"
          │
          ├── Save user message + AI answer to DB
          ├── Log token usage
          │
          └──► Response: { answer, sources, images, threadId }
                    │
                    ▼
           Frontend renders:
           ├── Answer tab (AI text)
           ├── Images tab (photo grid)
           └── Sources tab (web links)
```

---

## Deployment

| Part | Platform | Notes |
|------|----------|-------|
| Frontend | **Vercel** | Set `VITE_API_BASE_URL` to your backend URL |
| Backend | **Railway** | Set all env vars from `backend/.env` |
| Database | **Supabase** | Free tier is sufficient to start |

---

*Built with ❤️ as a learning project. Inspired by [Perplexity AI](https://perplexity.ai).*
