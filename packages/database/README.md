# @alfred/database

PostgreSQL database layer for Alfred.

## Prerequisites

- PostgreSQL 15+
- pgvector extension (for embeddings)

## Setup

### 1. Install PostgreSQL
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu
sudo apt install postgresql-15 postgresql-15-pgvector
```

### 2. Create Database
```bash
createdb alfred
```

### 3. Enable pgvector
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Set Environment Variable
```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/alfred"
```

### 5. Push Schema
```bash
pnpm db:push
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate migrations from schema changes |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:push` | Push schema directly (dev only) |
| `pnpm db:studio` | Open Drizzle Studio GUI |
| `pnpm db:seed` | Seed database with sample data |

## Schema

### Core Tables

- `users` ?ser accounts and preferences
- `conversations` — Chat sessions
- `messages` — Individual messages
- `projects` — User projects
- `project_decisions` — Architecture decisions

### Memory Tables

- `memory_entries` — Long-term memory with decay

### RAG Tables

- `documents` — Source documents
- `chunks` — Embedded chunks with vectors

### System Tables

- `api_keys` — API authentication
- `usage_records` — Usage tracking

## Vector Search

For production vector search, enable pgvector:
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column (after schema push)
ALTER TABLE chunks
ADD COLUMN embedding_vector vector(1536);

-- Create index
CREATE INDEX ON chunks
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);
```

## Indexes

All query patterns have corresponding indexes. See `schema.ts` for details.
