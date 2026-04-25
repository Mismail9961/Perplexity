-- ============================================================
--  Perplexity AI Clone — Full PostgreSQL Schema
--  Database: Supabase (Postgres 15+)
--  Run migrations top-to-bottom in order
-- ============================================================

-- ─────────────────────────────────────────────
--  EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "vector";          -- pgvector for embeddings
create extension if not exists "pg_trgm";         -- trigram search on text
create extension if not exists "unaccent";        -- normalise accents in search


-- ─────────────────────────────────────────────
--  ENUMS
-- ─────────────────────────────────────────────
create type search_mode as enum (
  'concise',          -- short answer
  'detailed',         -- long-form answer
  'creative'          -- creative / brainstorm
);

create type search_focus as enum (
  'web',              -- general web search
  'academic',         -- academic papers
  'news',             -- recent news
  'youtube',          -- video results
  'reddit',           -- social discussion
  'all'               -- mixed
);

create type source_type as enum (
  'web',
  'pdf',
  'youtube',
  'reddit',
  'news',
  'academic'
);

create type subscription_tier as enum (
  'free',
  'pro',
  'enterprise'
);

create type message_role as enum (
  'user',
  'assistant',
  'system'
);


-- ─────────────────────────────────────────────
--  USERS  (extends Supabase auth.users)
-- ─────────────────────────────────────────────
create table public.users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text unique not null,
  display_name        text,
  avatar_url          text,
  subscription_tier   subscription_tier not null default 'free',
  subscription_ends_at timestamptz,
  -- usage counters (reset monthly)
  searches_this_month integer not null default 0,
  -- preferences
  default_mode        search_mode not null default 'concise',
  default_focus       search_focus not null default 'web',
  language            text not null default 'en',
  -- metadata
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_active_at      timestamptz
);

comment on table public.users is
  'App-level user profile extending Supabase auth.users.';


-- ─────────────────────────────────────────────
--  THREADS  (a conversation / search session)
-- ─────────────────────────────────────────────
create table public.threads (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.users(id) on delete cascade,
  -- nullable for anonymous guests
  title           text,                        -- auto-generated from first query
  is_public       boolean not null default false,
  share_token     text unique,                 -- for shareable links
  mode            search_mode not null default 'concise',
  focus           search_focus not null default 'web',
  -- stats
  message_count   integer not null default 0,
  -- metadata
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.threads is
  'A conversation thread. Each thread holds multiple search turns.';

create index idx_threads_user_id      on public.threads(user_id);
create index idx_threads_share_token  on public.threads(share_token) where share_token is not null;
create index idx_threads_created_at   on public.threads(created_at desc);


-- ─────────────────────────────────────────────
--  MESSAGES  (individual turns inside a thread)
-- ─────────────────────────────────────────────
create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  thread_id       uuid not null references public.threads(id) on delete cascade,
  role            message_role not null,
  content         text not null,              -- full markdown answer text
  -- only populated for assistant messages
  model           text,                       -- e.g. 'gpt-4o', 'claude-3-5-sonnet'
  input_tokens    integer,
  output_tokens   integer,
  latency_ms      integer,                    -- time to first token
  -- ordering
  position        integer not null,           -- 1-based turn index in thread
  created_at      timestamptz not null default now()
);

comment on table public.messages is
  'Individual user queries and assistant answers inside a thread.';

create index idx_messages_thread_id on public.messages(thread_id, position);


-- ─────────────────────────────────────────────
--  SOURCES  (web results fetched per search turn)
-- ─────────────────────────────────────────────
create table public.sources (
  id              uuid primary key default uuid_generate_v4(),
  message_id      uuid not null references public.messages(id) on delete cascade,
  -- citation number shown in the answer, e.g. [1]
  citation_index  integer not null,
  source_type     source_type not null default 'web',
  -- page metadata
  url             text not null,
  title           text,
  description     text,                       -- meta description / snippet
  favicon_url     text,
  published_at    timestamptz,
  domain          text,                       -- extracted hostname
  -- retrieval scores
  search_rank     integer,                    -- rank from search API (1 = top)
  relevance_score float,                      -- reranker score 0–1
  -- was this source actually used in the answer?
  is_cited        boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (message_id, citation_index)
);

comment on table public.sources is
  'Web sources retrieved for a specific assistant message.';

create index idx_sources_message_id on public.sources(message_id);
create index idx_sources_domain     on public.sources(domain);


-- ─────────────────────────────────────────────
--  DOCUMENT_CHUNKS  (scraped + chunked content)
-- ─────────────────────────────────────────────
create table public.document_chunks (
  id              uuid primary key default uuid_generate_v4(),
  source_id       uuid not null references public.sources(id) on delete cascade,
  chunk_index     integer not null,           -- order within the document
  content         text not null,              -- raw chunk text (~500 tokens)
  token_count     integer,
  -- pgvector embedding (1536 dims for text-embedding-3-small)
  embedding       vector(1536),
  -- metadata
  created_at      timestamptz not null default now(),
  unique (source_id, chunk_index)
);

comment on table public.document_chunks is
  'Scraped page text split into chunks with vector embeddings for semantic search.';

-- HNSW index for fast ANN search
create index idx_chunks_embedding
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index idx_chunks_source_id on public.document_chunks(source_id);


-- ─────────────────────────────────────────────
--  FOLLOW_UP_QUESTIONS  (suggested next queries)
-- ─────────────────────────────────────────────
create table public.follow_up_questions (
  id              uuid primary key default uuid_generate_v4(),
  message_id      uuid not null references public.messages(id) on delete cascade,
  question        text not null,
  position        integer not null,           -- display order (1, 2, 3)
  was_clicked     boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_followup_message_id on public.follow_up_questions(message_id);


-- ─────────────────────────────────────────────
--  SEARCH_CACHE  (dedup identical queries)
-- ─────────────────────────────────────────────
create table public.search_cache (
  id              uuid primary key default uuid_generate_v4(),
  query_hash      text not null unique,       -- sha256 of normalised query
  query_text      text not null,
  focus           search_focus not null default 'web',
  -- cached payload from search API
  raw_results     jsonb not null,             -- array of result objects
  hit_count       integer not null default 1,
  expires_at      timestamptz not null,       -- TTL: usually now() + 1 hour
  created_at      timestamptz not null default now()
);

comment on table public.search_cache is
  'Caches raw web search API responses to reduce API costs.';

create index idx_search_cache_hash       on public.search_cache(query_hash);
create index idx_search_cache_expires_at on public.search_cache(expires_at);


-- ─────────────────────────────────────────────
--  SPACES  (Perplexity Spaces — shared workspaces)
-- ─────────────────────────────────────────────
create table public.spaces (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references public.users(id) on delete cascade,
  name            text not null,
  description     text,
  is_public       boolean not null default false,
  -- custom instructions applied to all threads in this space
  system_prompt   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_spaces_owner_id on public.spaces(owner_id);


-- ─────────────────────────────────────────────
--  SPACE_MEMBERS
-- ─────────────────────────────────────────────
create type space_role as enum ('owner', 'editor', 'viewer');

create table public.space_members (
  space_id        uuid not null references public.spaces(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  role            space_role not null default 'viewer',
  joined_at       timestamptz not null default now(),
  primary key (space_id, user_id)
);


-- ─────────────────────────────────────────────
--  SPACE_THREADS  (threads that belong to a space)
-- ─────────────────────────────────────────────
create table public.space_threads (
  space_id        uuid not null references public.spaces(id) on delete cascade,
  thread_id       uuid not null references public.threads(id) on delete cascade,
  added_at        timestamptz not null default now(),
  primary key (space_id, thread_id)
);


-- ─────────────────────────────────────────────
--  COLLECTIONS  (bookmarked / saved threads)
-- ─────────────────────────────────────────────
create table public.collections (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  name            text not null,
  description     text,
  created_at      timestamptz not null default now()
);

create table public.collection_threads (
  collection_id   uuid not null references public.collections(id) on delete cascade,
  thread_id       uuid not null references public.threads(id) on delete cascade,
  saved_at        timestamptz not null default now(),
  primary key (collection_id, thread_id)
);


-- ─────────────────────────────────────────────
--  API_KEYS  (for Pro users / developer access)
-- ─────────────────────────────────────────────
create table public.api_keys (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  key_hash        text not null unique,       -- bcrypt hash of the actual key
  key_prefix      text not null,             -- e.g. "pplx-" first 8 chars shown in UI
  name            text,                      -- user label: "My App"
  last_used_at    timestamptz,
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_api_keys_user_id  on public.api_keys(user_id);
create index idx_api_keys_key_hash on public.api_keys(key_hash);


-- ─────────────────────────────────────────────
--  USAGE_EVENTS  (analytics + billing)
-- ─────────────────────────────────────────────
create table public.usage_events (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.users(id) on delete set null,
  thread_id       uuid references public.threads(id) on delete set null,
  message_id      uuid references public.messages(id) on delete set null,
  event_type      text not null,             -- 'search', 'image_gen', 'api_call', …
  -- token usage
  prompt_tokens   integer not null default 0,
  completion_tokens integer not null default 0,
  -- cost in USD micro-cents (avoids floats)
  cost_microcents bigint not null default 0,
  model           text,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

comment on table public.usage_events is
  'Append-only log of every billable event. Never update rows.';

create index idx_usage_user_id    on public.usage_events(user_id, created_at desc);
create index idx_usage_created_at on public.usage_events(created_at desc);


-- ─────────────────────────────────────────────
--  FEEDBACK  (thumbs up / down on answers)
-- ─────────────────────────────────────────────
create type feedback_value as enum ('up', 'down');

create table public.feedback (
  id              uuid primary key default uuid_generate_v4(),
  message_id      uuid not null references public.messages(id) on delete cascade,
  user_id         uuid references public.users(id) on delete set null,
  value           feedback_value not null,
  comment         text,
  created_at      timestamptz not null default now(),
  unique (message_id, user_id)
);

create index idx_feedback_message_id on public.feedback(message_id);


-- ─────────────────────────────────────────────
--  TRENDING_QUERIES  (materialised hourly)
-- ─────────────────────────────────────────────
create table public.trending_queries (
  id              uuid primary key default uuid_generate_v4(),
  query_text      text not null,
  focus           search_focus not null default 'web',
  search_count    integer not null default 1,
  window_start    timestamptz not null,       -- hourly bucket
  created_at      timestamptz not null default now(),
  unique (query_text, focus, window_start)
);

create index idx_trending_window on public.trending_queries(window_start desc, search_count desc);


-- ─────────────────────────────────────────────
--  FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger trg_threads_updated_at
  before update on public.threads
  for each row execute function public.set_updated_at();

create trigger trg_spaces_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();

-- Increment thread message_count when a message is inserted
create or replace function public.increment_thread_message_count()
returns trigger language plpgsql as $$
begin
  update public.threads
  set message_count = message_count + 1,
      updated_at    = now()
  where id = new.thread_id;
  return new;
end;
$$;

create trigger trg_message_count
  after insert on public.messages
  for each row execute function public.increment_thread_message_count();

-- Auto-generate thread title from first user message
create or replace function public.set_thread_title()
returns trigger language plpgsql as $$
begin
  if new.role = 'user' and new.position = 1 then
    update public.threads
    set title = left(new.content, 80)
    where id = new.thread_id and title is null;
  end if;
  return new;
end;
$$;

create trigger trg_thread_title
  after insert on public.messages
  for each row execute function public.set_thread_title();

-- Expire old cache rows (call this from a cron job)
create or replace function public.purge_expired_cache()
returns void language sql as $$
  delete from public.search_cache where expires_at < now();
$$;

-- Semantic similarity search helper
create or replace function public.match_chunks(
  query_embedding vector(1536),
  match_threshold float  default 0.7,
  match_count     int    default 10,
  p_source_ids    uuid[] default null
)
returns table (
  id              uuid,
  source_id       uuid,
  content         text,
  similarity      float
)
language sql stable as $$
  select
    dc.id,
    dc.source_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where
    (p_source_ids is null or dc.source_id = any(p_source_ids))
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;


-- ─────────────────────────────────────────────
--  ROW LEVEL SECURITY  (Supabase)
-- ─────────────────────────────────────────────
alter table public.users              enable row level security;
alter table public.threads            enable row level security;
alter table public.messages           enable row level security;
alter table public.sources            enable row level security;
alter table public.document_chunks    enable row level security;
alter table public.follow_up_questions enable row level security;
alter table public.spaces             enable row level security;
alter table public.space_members      enable row level security;
alter table public.collections        enable row level security;
alter table public.collection_threads enable row level security;
alter table public.api_keys           enable row level security;
alter table public.feedback           enable row level security;

-- users: own row only
create policy "users_self" on public.users
  using (auth.uid() = id);

-- threads: own threads + public threads
create policy "threads_read" on public.threads for select
  using (user_id = auth.uid() or is_public = true);
create policy "threads_insert" on public.threads for insert
  with check (user_id = auth.uid());
create policy "threads_update" on public.threads for update
  using (user_id = auth.uid());
create policy "threads_delete" on public.threads for delete
  using (user_id = auth.uid());

-- messages: readable if thread is accessible
create policy "messages_read" on public.messages for select
  using (
    exists (
      select 1 from public.threads t
      where t.id = thread_id
        and (t.user_id = auth.uid() or t.is_public = true)
    )
  );
create policy "messages_insert" on public.messages for insert
  with check (
    exists (
      select 1 from public.threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

-- sources / chunks / follow-ups follow message access
create policy "sources_read" on public.sources for select
  using (
    exists (
      select 1 from public.messages m
      join public.threads t on t.id = m.thread_id
      where m.id = message_id
        and (t.user_id = auth.uid() or t.is_public = true)
    )
  );

-- spaces: members can read; owner can do everything
create policy "spaces_read" on public.spaces for select
  using (
    owner_id = auth.uid()
    or is_public = true
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = id and sm.user_id = auth.uid()
    )
  );
create policy "spaces_insert" on public.spaces for insert
  with check (owner_id = auth.uid());
create policy "spaces_update" on public.spaces for update
  using (owner_id = auth.uid());
create policy "spaces_delete" on public.spaces for delete
  using (owner_id = auth.uid());

-- api_keys: own keys only
create policy "api_keys_self" on public.api_keys
  using (user_id = auth.uid());

-- collections: own collections only
create policy "collections_self" on public.collections
  using (user_id = auth.uid());