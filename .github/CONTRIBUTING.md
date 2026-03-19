# Contributing

Thanks for your interest in contributing to FormLab!

## Getting Started

1. Fork the repository
2. Clone your fork and install dependencies:

   ```bash
   git clone https://github.com/your-username/strava-performance-tracker.git
   cd strava-performance-tracker
   pnpm install
   ```

3. Create a branch for your change:

   ```bash
   git checkout -b feat/my-feature
   ```

4. Make your changes and ensure the project builds:

   ```bash
   pnpm build
   ```

5. Commit using [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   git commit -m "feat: add new chart component"
   ```

6. Push and open a pull request

## Commit Messages

This project enforces Conventional Commits via commitlint. Your commits must follow this format:

```
type(scope): description
```

| Type | Purpose |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code restructuring without behavior change |
| `docs` | Documentation only |
| `chore` | Maintenance tasks |
| `style` | Formatting, whitespace |
| `test` | Adding or updating tests |
| `build` | Build system or dependency changes |
| `ci` | CI/CD changes |

## Development

- **`pnpm dev`** — Start the dev server
- **`pnpm build`** — Run a production build (also runs as a pre-commit hook)
- **`pnpm db:push`** — Apply database migrations

## Guidelines

- Keep pull requests focused on a single change
- Ensure the project builds before submitting
- Add context in your PR description for non-trivial changes
