# Migration Safety System

## Overview

This document describes the multi-layered safety system implemented to prevent accidental migrations to the MAIN production database (`hfjyowydvpqjbtbbzoeu`).

All automated migrations are **BLOCKED** on the MAIN database. Only the STAGING database (`jpksnvuiaptymrwnwnhn`) allows automated migrations.

---

## Database Environments

### MAIN Production Database
- **ID**: `hfjyowydvpqjbtbbzoeu`
- **URL**: `https://hfjyowydvpqjbtbbzoeu.supabase.co`
- **Status**: **PROTECTED** - No automated migrations allowed
- **Access**: Manual changes via Supabase Dashboard only

### STAGING Database
- **ID**: `jpksnvuiaptymrwnwnhn`
- **URL**: `https://jpksnvuiaptymrwnwnhn.supabase.co`
- **Status**: Safe for automated migrations
- **Access**: Full access for testing and development

---

## Safety Layers

### 1. Environment Verification Script

**Location**: `scripts/verify-migration-env.ts`

This TypeScript script checks your current environment configuration before any migration.

**How to use:**
```bash
npm run migrate:check
# or
npm run migrate:verify
```

**What it does:**
- Scans all `.env` files (`.env`, `.env.local`, `.env.staging`, `.env.production`)
- Detects which Supabase database is configured
- **BLOCKS** execution if MAIN database is detected
- Displays a clear visual banner indicating safety status
- Provides actionable instructions if issues are found

**Output Examples:**

**Safe (STAGING):**
```
████████████████████████████████████████████████████████████████████████████████
█                                                                              █
█  ✓  ENVIRONMENT CHECK PASSED - STAGING DATABASE  ✓                          █
█                                                                              █
████████████████████████████████████████████████████████████████████████████████

✓ SAFE TO PROCEED
```

**Blocked (MAIN):**
```
████████████████████████████████████████████████████████████████████████████████
█                                                                              █
█  🚨  MIGRATION BLOCKED - MAIN DATABASE DETECTED  🚨                         █
█                                                                              █
████████████████████████████████████████████████████████████████████████████████

❌ MIGRATION CANNOT PROCEED
```

---

### 2. Git Pre-Commit Hook

**Location**: `.husky/pre-commit`

This hook runs automatically before every commit and prevents you from committing:
- Migration files containing references to MAIN database
- `.env` files configured with MAIN database URL

**What it checks:**
- All staged `.sql` migration files for `hfjyowydvpqjbtbbzoeu` references
- All staged `.env` files for MAIN database configuration
- Displays clear error messages if violations are found

**Bypass (NOT RECOMMENDED):**
```bash
git commit --no-verify
```
Only use this in genuine emergencies with proper authorization.

---

### 3. NPM Safety Scripts

**Available Commands:**

```bash
# Check current environment configuration
npm run migrate:check

# Same as migrate:check
npm run migrate:verify
```

These commands run the verification script and display the current environment status.

---

### 4. Configuration File

**Location**: `.migration-safety.json`

This JSON file defines:
- Allowed and forbidden databases
- Migration rules and restrictions
- Emergency procedures
- Contact information for approvals
- Documentation references

You can modify this file to update database URLs or add new environments.

---

## Migration Workflow

### For STAGING (Allowed)

1. **Ensure STAGING environment:**
   ```bash
   npm run migrate:check
   ```

2. **Create migration file:**
   ```bash
   # Create your .sql file in supabase/migrations/
   ```

3. **Test your migration:**
   - Apply via Supabase Dashboard SQL Editor on STAGING
   - Verify results
   - Test rollback if necessary

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add migration: description"
   ```
   The pre-commit hook will verify your changes automatically.

5. **Deploy:**
   - Push to repository
   - Changes will be applied to STAGING

---

### For MAIN (Manual Only)

**IMPORTANT**: MAIN migrations are NEVER automated.

1. **Test thoroughly on STAGING first:**
   - Apply migration to STAGING
   - Run comprehensive tests
   - Verify data integrity
   - Test with production-like data volumes
   - Document expected behavior

2. **Get approval:**
   - Senior developer review
   - DBA approval
   - Document the change request

3. **Backup MAIN database:**
   - Create manual backup via Supabase Dashboard
   - Verify backup completed successfully

4. **Apply manually:**
   - Open Supabase Dashboard
   - Navigate to SQL Editor
   - Copy migration script
   - Review one more time
   - Execute manually
   - Verify results immediately

5. **Monitor:**
   - Check application logs
   - Verify user-facing functionality
   - Monitor database performance
   - Be ready to rollback if needed

---

## Common Scenarios

### Scenario 1: Accidental MAIN Configuration

**Problem**: Your `.env` file points to MAIN database.

**Detection**:
```bash
npm run migrate:check
```

**Resolution**:
1. Open your `.env` file
2. Update `VITE_SUPABASE_URL` to STAGING:
   ```
   VITE_SUPABASE_URL=https://jpksnvuiaptymrwnwnhn.supabase.co
   ```
3. Update `VITE_SUPABASE_ANON_KEY` to STAGING key
4. Run verification again: `npm run migrate:check`

---

### Scenario 2: Migration File References MAIN

**Problem**: Your SQL file contains `hfjyowydvpqjbtbbzoeu`.

**Detection**: Git pre-commit hook will block the commit.

**Resolution**:
1. Open the migration file
2. Remove or replace the MAIN database reference
3. Use STAGING database (`jpksnvuiaptymrwnwnhn`) instead
4. Commit again

---

### Scenario 3: Need to Apply to MAIN

**Problem**: You have a tested migration that needs to go to MAIN.

**Resolution**:
1. Ensure it's thoroughly tested on STAGING
2. Get proper approvals
3. Backup MAIN database
4. Open Supabase Dashboard for MAIN
5. Navigate to SQL Editor
6. Manually paste and execute the migration
7. Verify results
8. Document the change

**DO NOT**:
- Configure `.env` to point to MAIN
- Try to bypass the safety system
- Apply untested migrations

---

## Emergency Procedures

### Bypass Pre-Commit Hook

**Command**:
```bash
git commit --no-verify
```

**When to use**:
- Genuine emergencies only
- With proper authorization
- Must document the reason

**Never use to**:
- Skip testing
- Apply to MAIN without approval
- Circumvent safety for convenience

---

### Rollback a Migration

If a migration causes issues on MAIN:

1. **Assess the damage:**
   - What broke?
   - What data is affected?
   - Is the system operational?

2. **Create rollback script:**
   - Write SQL to undo the changes
   - Test on STAGING first
   - Verify it restores expected state

3. **Apply rollback to MAIN:**
   - Via Supabase Dashboard SQL Editor
   - Monitor closely
   - Verify system recovery

4. **Document:**
   - What went wrong
   - How it was fixed
   - Lessons learned
   - Prevention measures

---

## Troubleshooting

### Verification Script Fails

**Error**: "No Supabase URL found"

**Solution**: Ensure you have a `.env` file with `VITE_SUPABASE_URL` defined.

---

### Pre-Commit Hook Not Running

**Problem**: Hook doesn't execute on commit.

**Solution**:
```bash
# Reinstall hooks
npm run prepare

# Verify hook is executable
chmod +x .husky/pre-commit
```

---

### Want to Temporarily Disable Safety

**NOT RECOMMENDED**, but if absolutely necessary:

```bash
# Disable pre-commit hook for one commit
git commit --no-verify -m "message"

# Disable verification script
# Edit package.json and remove the preinstall script
```

**Remember**: Always re-enable safety features after emergency is resolved.

---

## Testing the Safety System

### Test Environment Detection

```bash
npm run migrate:check
```

Expected: Green banner showing STAGING environment.

---

### Test Pre-Commit Hook

1. Create a test migration file:
   ```bash
   echo "SELECT * FROM hfjyowydvpqjbtbbzoeu;" > test-migration.sql
   ```

2. Try to commit:
   ```bash
   git add test-migration.sql
   git commit -m "test"
   ```

Expected: Commit should be blocked with error message.

3. Clean up:
   ```bash
   git reset HEAD test-migration.sql
   rm test-migration.sql
   ```

---

## Configuration Updates

### Add New Environment

Edit `.migration-safety.json`:

```json
{
  "databases": {
    "newEnvironment": {
      "id": "new-database-id",
      "name": "New Environment",
      "url": "https://new-database-id.supabase.co",
      "environment": "development",
      "allowAutomatedMigrations": true,
      "description": "Development environment"
    }
  }
}
```

Update `scripts/verify-migration-env.ts` to include the new database ID.

---

### Update Database URLs

If database URLs change, update:

1. `.migration-safety.json` - Update URLs in database configs
2. `scripts/verify-migration-env.ts` - Update FORBIDDEN_DB and ALLOWED_DB constants
3. `.husky/pre-commit` - Update FORBIDDEN_DB and ALLOWED_DB variables
4. Documentation - Update this file with new URLs

---

## Best Practices

1. **Always develop on STAGING**
   - Never point your local environment to MAIN
   - Test all changes on STAGING first

2. **Run verification before important operations**
   ```bash
   npm run migrate:check
   ```

3. **Never bypass safety without reason**
   - Safety systems exist to protect data
   - Bypassing should be rare and documented

4. **Document all MAIN changes**
   - Keep a changelog
   - Note who approved
   - Record date and time

5. **Test rollback procedures**
   - Always have a rollback plan
   - Test rollback on STAGING

6. **Regular backups**
   - Backup MAIN before any change
   - Verify backups work

7. **Monitor after changes**
   - Watch logs after MAIN changes
   - Be ready to rollback quickly

---

## Support

### Questions About Safety System

- Review this document
- Check `.migration-safety.json` for configuration
- Run `npm run migrate:check` to see current status

### Reporting Issues

If you find a way to bypass the safety system:
- Document the bypass method
- Report to the team immediately
- Help improve the safety system

### Requesting MAIN Changes

1. Test thoroughly on STAGING
2. Document the change
3. Request approval from DBA or senior developer
4. Schedule a maintenance window if needed
5. Backup MAIN database
6. Apply manually via Dashboard
7. Verify and monitor

---

## Version History

- **v1.0.0** (2025-11-15): Initial implementation
  - Environment verification script
  - Git pre-commit hook
  - NPM safety scripts
  - Configuration file
  - Documentation

---

## Summary

This safety system provides multiple layers of protection:

1. **Prevention**: Blocks automated access to MAIN
2. **Detection**: Identifies MAIN references in code
3. **Verification**: Confirms STAGING environment before operations
4. **Documentation**: Clear instructions and procedures
5. **Emergency**: Documented bypass procedures for genuine emergencies

**Remember**: The goal is to protect production data while allowing safe development on STAGING. Always test on STAGING first, and apply to MAIN manually with proper approvals.
