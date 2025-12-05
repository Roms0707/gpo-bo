#!/usr/bin/env tsx
/**
 * Pre-Build/Pre-Dev Environment Check
 *
 * This lightweight script runs before build and dev commands to ensure
 * STAGING database is configured. Quick validation to prevent MAIN database usage.
 * Additionally, if VITE_APP_ENV=STG, it updates .env with staging Supabase credentials.
 */

import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN_DB = 'hfjyowydvpqjbtbbzoeu';
const ALLOWED_DB = 'jpksnvuiaptymrwnwnhn';

const STG_SUPABASE_URL = 'https://jpksnvuiaptymrwnwnhn.supabase.co';
const STG_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impwa3NudnVpYXB0eW1yd253bmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1Mjg2MDcsImV4cCI6MjA3ODEwNDYwN30.FE91H4WFbIOhTt74fHQUveDka1P6L2oM3ZX0Bk2ZR44';

function updateEnvWithStagingCredentials(): void {
  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, '.env');

  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env file not found, skipping credential update');
    return;
  }

  let content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');

  let hasAppEnvStg = false;
  let needsUpdate = false;

  for (const line of lines) {
    if (line.trim().startsWith('VITE_APP_ENV=STG')) {
      hasAppEnvStg = true;
    }
    if (line.includes(FORBIDDEN_DB)) {
      needsUpdate = true;
    }
  }

  if (hasAppEnvStg && needsUpdate) {
    console.log('\n✓ VITE_APP_ENV=STG detected, updating .env with staging credentials...');

    content = content.replace(
      /VITE_SUPABASE_URL=https:\/\/[a-z0-9]+\.supabase\.co/,
      `VITE_SUPABASE_URL=${STG_SUPABASE_URL}`
    );

    content = content.replace(
      /VITE_SUPABASE_ANON_KEY=eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
      `VITE_SUPABASE_ANON_KEY=${STG_SUPABASE_ANON_KEY}`
    );

    fs.writeFileSync(envPath, content, 'utf-8');
    console.log('✓ Updated .env with staging Supabase credentials\n');
  }
}

function checkEnvQuick(): boolean {
  const envFiles = ['.env', '.env.local', '.env.staging', '.env.production'];
  const projectRoot = process.cwd();

  updateEnvWithStagingCredentials();

  for (const envFile of envFiles) {
    const envPath = path.join(projectRoot, envFile);

    if (!fs.existsSync(envPath)) continue;

    const content = fs.readFileSync(envPath, 'utf-8');

    if (content.includes(FORBIDDEN_DB)) {
      console.error('\n');
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║  🚨  BLOCKED: MAIN DATABASE DETECTED IN ' + envFile.padEnd(20) + '║');
      console.error('╚══════════════════════════════════════════════════════════════╝');
      console.error('\n❌ Cannot proceed with this operation.');
      console.error(`   File: ${envFile}`);
      console.error(`   Found: ${FORBIDDEN_DB}`);
      console.error('\n✓ Switch to STAGING database: ${ALLOWED_DB}');
      console.error('   Run: npm run migrate:check (for detailed info)\n');
      return false;
    }
  }

  return true;
}

const isValid = checkEnvQuick();
process.exit(isValid ? 0 : 1);
