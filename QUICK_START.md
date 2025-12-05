# Quick Start Guide - Gaming Tournament Backoffice

## Database Safety

This project has comprehensive protections to ensure you NEVER accidentally work with the MAIN production database.

### Current Configuration

- **STAGING Database** (Safe for development): `jpksnvuiaptymrwnwnhn`
- **MAIN Database** (Protected): `hfjyowydvpqjbtbbzoeu`

All development work MUST be done on STAGING only.

---

## Getting Started

### 1. Verify Your Environment

Before doing anything, verify your database configuration:

```bash
npm run check:full
```

You should see a **GREEN** banner confirming STAGING database connection.

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The app will:
- Automatically check for MAIN database (will BLOCK if detected)
- Load STAGING environment configuration
- Start on http://localhost:5173

---

## Available Commands

### Development

```bash
npm run dev              # Start dev server (STAGING)
npm run dev:staging      # Explicitly use STAGING
npm run dev:production   # Use production environment variables
```

### Building

```bash
npm run build            # Build for STAGING
npm run build:staging    # Explicitly build for STAGING
npm run build:production # Build with production environment
```

### Environment Checks

```bash
npm run check:env        # Quick environment check
npm run check:full       # Detailed environment verification
npm run migrate:check    # Verify migration safety
```

### Preview

```bash
npm run preview          # Preview built app (STAGING)
```

---

## Safety Features

This project has **MULTIPLE LAYERS** of protection:

### 1. Pre-Build Checks
Every `dev`, `build`, and `preview` command automatically checks for MAIN database.

### 2. Vite Configuration Guard
The build process includes runtime verification that blocks MAIN database.

### 3. Pre-Commit Hook
Git commits are blocked if ANY file contains MAIN database references.

### 4. Pre-Push Hook
Final verification before pushing to remote repository.

### 5. Environment Scripts
Manual verification scripts available at any time.

---

## Configuration Files

### Active Environment Files

- `.env` - Current environment (should be STAGING)
- `.env.staging` - STAGING credentials
- `.env.production` - Production environment config

### Reference Only

- `.env.main.READONLY` - MAIN database info (documentation only, DO NOT USE)

### Safety Configuration

- `.migration-safety.json` - Database policies and rules
- `supabase/config.toml` - Supabase configuration (locked to STAGING)
- `MIGRATION_SAFETY.md` - Detailed safety documentation

---

## What If I See an Error?

### "MAIN DATABASE DETECTED - BUILD BLOCKED"

Your environment is configured for MAIN database. Fix it:

1. Open your `.env` file
2. Verify it points to STAGING:
   ```
   VITE_SUPABASE_URL=https://jpksnvuiaptymrwnwnhn.supabase.co
   VITE_SUPABASE_ANON_KEY=<staging-key-here>
   ```
3. Run `npm run check:full` to verify
4. Try your command again

### "COMMIT BLOCKED - MAIN DATABASE REFERENCE DETECTED"

A file you're trying to commit contains MAIN database references:

1. Check which file(s) are mentioned in the error
2. Replace ALL occurrences of `hfjyowydvpqjbtbbzoeu` with `jpksnvuiaptymrwnwnhn`
3. Stage the fixed files
4. Commit again

### "PUSH BLOCKED"

Your codebase contains MAIN database references:

1. Run: `git grep "hfjyowydvpqjbtbbzoeu"` (excluding .env.main.READONLY)
2. Replace all matches with STAGING database ID
3. Commit the changes
4. Push again

---

## Working with Migrations

### Creating a Migration

1. Create your SQL file in `supabase/migrations/`
2. **NEVER** include MAIN database ID in the migration
3. Test on STAGING first
4. Commit and push

### Applying Migrations

Migrations are applied via Supabase MCP tools:

```bash
# The system will automatically verify you're on STAGING
# before any migration is applied
```

### MAIN Database Migrations

MAIN database changes are **NEVER** automated:

1. Test thoroughly on STAGING
2. Get approval from senior developer/DBA
3. Backup MAIN database via Supabase Dashboard
4. Manually apply via Supabase Dashboard SQL Editor
5. Monitor and verify

---

## Common Workflows

### Starting Your Day

```bash
# Verify configuration
npm run check:full

# Start development
npm run dev
```

### Before Committing

```bash
# Check for MAIN references (optional, hook will do this)
git grep "hfjyowydvpqjbtbbzoeu"

# Should return nothing or only .env.main.READONLY

# Commit
git add .
git commit -m "Your message"
```

### Before Pushing

```bash
# Final check (optional, hook will do this)
npm run check:full

# Push
git push
```

### Building for Deployment

```bash
# Verify environment first
npm run check:full

# Build
npm run build

# The build will automatically verify STAGING configuration
```

---

## Environment Variables

### Required Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://jpksnvuiaptymrwnwnhn.supabase.co
VITE_SUPABASE_ANON_KEY=<your-staging-anon-key>

# Twitch Integration
VITE_TWITCH_CLIENT_ID=<your-twitch-client-id>
VITE_TWITCH_CLIENT_SECRET=<your-twitch-client-secret>

# Galaxy API
GALAXY_API_KEY="esport_plt_srv"
GALAXY_API_SECRET_KEY="<your-galaxy-secret>"
GALAXY_CAMPAIGN_ID="4471"
GALAXY_SERVICE_ID="1251"
GALAXY_COUNTRY_CODE="tn"
GALAXY_LANGUAGE_CODE="fr"
GALAXY_BASE_URL="https://galaxy-api.galaxydve.com"
```

---

## Bypassing Safety Checks

### When to Bypass

**ONLY** in genuine emergencies with proper authorization.

### How to Bypass

```bash
# Pre-commit hook
git commit --no-verify

# Pre-push hook
git push --no-verify
```

### After Bypassing

1. Document why you bypassed
2. Fix the underlying issue immediately
3. Inform the team
4. Re-enable safety checks

---

## Getting Help

### Check Current Status

```bash
npm run check:full
```

### Review Safety Documentation

```bash
# Detailed safety information
cat MIGRATION_SAFETY.md

# Safety configuration
cat .migration-safety.json
```

### Verify Git Hooks

```bash
# List hooks
ls -la .husky/

# Test pre-commit
git add .
git commit -m "test" --dry-run

# Test pre-push
git push --dry-run
```

---

## Important Notes

1. **NEVER** modify `.env` to point to MAIN database
2. **ALWAYS** test on STAGING first
3. **NEVER** commit with `--no-verify` unless emergency
4. **ALWAYS** run `npm run check:full` if unsure
5. **NEVER** apply automated migrations to MAIN

---

## Project Structure

```
project/
├── .env                    # Current environment (STAGING)
├── .env.staging            # STAGING credentials
├── .env.production         # Production config
├── .env.main.READONLY      # MAIN info (reference only)
├── supabase/
│   ├── config.toml         # Supabase config (locked to STAGING)
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge functions
├── scripts/
│   ├── check-env.ts        # Quick env check
│   └── verify-migration-env.ts  # Full verification
├── .husky/
│   ├── pre-commit          # Commit safety check
│   └── pre-push            # Push safety check
├── MIGRATION_SAFETY.md     # Detailed safety docs
├── .migration-safety.json  # Safety policies
└── QUICK_START.md          # This file
```

---

## Summary

This project is designed to be **SAFE BY DEFAULT**. Multiple layers of protection ensure you cannot accidentally work with MAIN database. Follow the workflows above and you'll always be working on STAGING.

**When in doubt**: Run `npm run check:full`

**Remember**: All development on STAGING, manual operations only for MAIN.
