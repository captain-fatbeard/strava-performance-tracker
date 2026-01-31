# Supabase Database Setup

This directory contains SQL migrations for the Supabase database.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 2. Run the Migration

**Option A: Via Supabase Dashboard (Recommended for first setup)**

1. Go to your project's SQL Editor in the Supabase dashboard
2. Copy the contents of `migrations/20260131173247_create_user_settings.sql`
3. Run the query

**Option B: Via Supabase CLI**

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
pnpm db:migrate
```

### 3. Configure Environment Variables

Update `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Migrations

| File | Description |
|------|-------------|
| `20260131173247_create_user_settings.sql` | Creates `user_settings` table for syncing app settings |

## Schema

The `user_settings` table stores user preferences keyed by Strava athlete ID:

- `athlete_id` - Primary key (from Strava OAuth)
- `weight`, `max_hr`, `resting_hr`, `age`, `gender` - User profile
- `time_range`, `activity_type` - Filter preferences
- `excluded_activity_ids` - Array of excluded activities
- `created_at`, `updated_at` - Timestamps
