# Perplexity Clone

A lightweight, AI‑powered search and answer engine inspired by Perplexity. This implementation uses **Bun** as the runtime and **Supabase** for authentication and data storage.

## Features
- AI‑driven question answering
- High‑performance backend powered by Bun
- Supabase Auth (email/password and OAuth ready)
- Persistent chat and session storage
- Clean, modular API architecture
- Scalable design for future AI integrations

## Tech Stack
- **Runtime**: Bun
- **Server**: Express (or native Bun server)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Language**: TypeScript / JavaScript

## Project Structure
```
.
├── src/
│   ├── controllers/        # Request handlers
│   ├── routes/            # API route definitions
│   ├── lib/               # Supabase client abstraction (supabase.js)
│   ├── middleware/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── pipelines/
│   ├── config/
│   ├── utils/
│   ├── db/
│   └── index.js            # Server entry point
├── .env                  # Environment configuration
├── package.json
└── README.md
```

## Getting Started
1. **Clone the repository**
   ```bash
   git clone <https://github.com/Mismail9961/Perplexity.git>
   cd <Perplexity>
   ```
2. **Install dependencies**
   ```bash
   bun install
   ```
3. **Configure environment variables**
   Create a `.env` file in the project root with the following keys:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE=your_supabase_service_role
   OAUTH_REDIRECT_URL=your_oauth_redirect_url
   PORT=3000
   ```
4. **Run the development server**
   ```bash
   bun run dev
   ```
   The server will be available at `http://localhost:3000`.

## Supabase Setup
- Create a new project in the Supabase dashboard.
- Enable authentication (email/password and/or OAuth providers).
- Define the required tables:
  - `sessions` – stores chat sessions.
  - `messages` – stores individual messages within a session.

### Example Schema
```sql
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  created_at timestamp default now()
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id),
  role text check (role in ('user', 'assistant')),
  content text,
  created_at timestamp default now()
);
```

## API Endpoints
### Authentication
- `POST /api/auth/signup` – Register a new user.
- `POST /api/auth/login` – Log in an existing user.
- `POST /api/auth/logout` – End the user session.
- `GET /api/auth/oauth/:provider` – End the user session.
- `POST /api/auth/oauth/callback` – End the user session.

### Chat / Query
- `POST /api/query`
  ```json
  {
    "query": "What is AI?",
    "sessionId": "optional-session-id"
  }
  ```
  **Response**
  ```json
  {
    "answer": "Artificial Intelligence is...",
    "sources": []
  }
  ```

## Development Guidelines
- Keep Supabase interactions isolated in `src/lib/`.
- Use modular controllers to maintain scalability.
- Validate all incoming requests and handle errors consistently.

## Future Enhancements
- Streaming responses for real‑time AI output.
- Integration with external web search APIs.
- Caching layer (e.g., Redis) for performance.
- Front‑end UI using Next.js or React.
- Voice input and output capabilities.

## License
MIT License