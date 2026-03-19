# FormLab

A personal fitness analytics dashboard that connects to Strava and provides deep performance insights for cycling and running.

## Features

- **Training Analytics** — Fitness & Form chart (CTL/ATL/TSB), power zone distribution, weekly training load
- **Performance Metrics** — FTP estimation, W/kg efficiency trends, climbing speed analysis, pace zones
- **Health Tracking** — Weight history with trends, heart rate zone insights, VO2max estimation
- **Activity Browser** — Searchable list with detail pages, interactive maps, and per-activity charts
- **Personal Records** — Best efforts across power, speed, heart rate, and distance
- **Multi-Sport** — Cycling, running, and virtual ride support with sport-specific analytics
- **Cross-Device Sync** — Settings and data persist via Supabase

## Tech Stack

- [TanStack Start](https://tanstack.com/start) (React 19) — full-stack framework
- [TanStack Router](https://tanstack.com/router) — file-based routing
- [Recharts](https://recharts.org) — charts and visualizations
- [Leaflet](https://leafletjs.com) — activity maps
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [Supabase](https://supabase.com) — database and storage
- [Strava API](https://developers.strava.com) — activity data
- [Vite](https://vite.dev) — build tooling
- [Vercel](https://vercel.com) — deployment

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io)
- A [Strava API application](https://www.strava.com/settings/api)
- A [Supabase](https://supabase.com) project

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/captain-fatbeard/strava-performance-tracker.git
   cd strava-performance-tracker
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy the environment file and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

   ```
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   APP_URL=http://localhost:3000
   ```

   All required variables are documented in `.env.example`.

4. Set up the database:

   ```bash
   pnpm db:push
   ```

5. Start the dev server:

   ```bash
   pnpm dev
   ```

### Strava API Setup

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create an application (or use an existing one)
3. Set the **Authorization Callback Domain** to `localhost` (for local dev) or your production domain
4. Copy the Client ID and Client Secret into your `.env` file

## Database Schema

The app uses four Supabase tables:

| Table | Purpose |
|-------|---------|
| `user_settings` | Per-athlete settings (birthday, gender, time range, activity type) |
| `weight_entries` | Weight history for tracking and VO2max estimation |
| `activities` | Cached Strava activities with full detail JSON |
| `excluded_activities` | Activities excluded from performance calculations |

Migrations are in `supabase/migrations/`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm db:push` | Push database migrations |
| `pnpm db:reset` | Reset database |
| `pnpm db:diff` | Generate migration diff |
| `pnpm release` | Bump version and generate changelog |
| `pnpm release:minor` | Release as minor version |
| `pnpm release:major` | Release as major version |

## Release Process

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and [standard-version](https://github.com/conventional-changelog/standard-version) for versioning and changelog generation.

Commit messages follow the format:

```
type(scope): description

feat: add new chart component
fix: correct HR zone calculation
perf: optimize activity sync
refactor: extract shared chart config
docs: update setup instructions
```

To create a release:

```bash
pnpm release        # auto-detect version bump from commits
pnpm release:minor  # force minor bump
pnpm release:major  # force major bump
```

This will:
1. Bump the version in `package.json`
2. Update `CHANGELOG.md` with commits since the last release
3. Create a git commit and tag

## Deployment

The app is configured for [Vercel](https://vercel.com) with the Nitro server preset. Set the same environment variables in your Vercel project settings.

## Acknowledgements

[![Powered by Strava](https://developers.strava.com/images/logos/strava_powered_by_light.svg)](https://www.strava.com)

This app uses the [Strava API](https://developers.strava.com) but is not endorsed or certified by Strava.

## License

[MIT](LICENSE)
