#!/usr/bin/env tsx
/**
 * Environment Verification Script
 *
 * This script ensures that NO operations (migrations, builds, dev server) are EVER
 * performed against the MAIN production database.
 * It checks the current environment configuration and blocks execution if MAIN is detected.
 */

import * as fs from 'fs';
import * as path from 'path';

// Environment configuration
const FORBIDDEN_DB = 'hfjyowydvpqjbtbbzoeu';
const ALLOWED_DB = 'jpksnvuiaptymrwnwnhn';
const FORBIDDEN_URL = `https://${FORBIDDEN_DB}.supabase.co`;
const ALLOWED_URL = `https://${ALLOWED_DB}.supabase.co`;

interface EnvCheck {
  isValid: boolean;
  environment: 'MAIN' | 'STAGING' | 'UNKNOWN';
  url: string | null;
  errors: string[];
  warnings: string[];
}

function readEnvFile(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });

  return env;
}

function checkEnvironment(): EnvCheck {
  const result: EnvCheck = {
    isValid: true,
    environment: 'UNKNOWN',
    url: null,
    errors: [],
    warnings: []
  };

  // Check all .env files
  const envFiles = ['.env', '.env.local', '.env.staging', '.env.production'];
  const projectRoot = process.cwd();

  for (const envFile of envFiles) {
    const envPath = path.join(projectRoot, envFile);
    const env = readEnvFile(envPath);

    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;

    if (supabaseUrl) {
      // Check if it's the FORBIDDEN database
      if (supabaseUrl.includes(FORBIDDEN_DB)) {
        result.isValid = false;
        result.environment = 'MAIN';
        result.url = supabaseUrl;
        result.errors.push(
          `🚨 CRITICAL: File ${envFile} contains MAIN production database URL!`
        );
        result.errors.push(`   URL: ${supabaseUrl}`);
        result.errors.push(`   This is FORBIDDEN for safety reasons.`);
      }
      // Check if it's the ALLOWED database
      else if (supabaseUrl.includes(ALLOWED_DB)) {
        if (result.environment === 'UNKNOWN') {
          result.environment = 'STAGING';
          result.url = supabaseUrl;
        }
      }
      // Unknown database
      else {
        result.warnings.push(
          `⚠️  WARNING: File ${envFile} contains an unknown database URL: ${supabaseUrl}`
        );
      }
    }
  }

  // Check if no database URL was found
  if (!result.url && result.environment === 'UNKNOWN') {
    result.errors.push('❌ No Supabase URL found in any .env file');
    result.isValid = false;
  }

  return result;
}

function displayBanner(check: EnvCheck): void {
  const width = 80;
  const line = '='.repeat(width);
  const doubleLine = '█'.repeat(width);

  console.log('\n');

  if (!check.isValid) {
    // RED BANNER - CRITICAL ERROR
    console.log('\x1b[41m\x1b[37m' + doubleLine + '\x1b[0m');
    console.log('\x1b[41m\x1b[37m' + '█'.repeat(width) + '\x1b[0m');
    console.log('\x1b[41m\x1b[37m█' + ' '.repeat(width - 2) + '█\x1b[0m');
    console.log(
      '\x1b[41m\x1b[37m█' +
      '  🚨  MIGRATION BLOCKED - MAIN DATABASE DETECTED  🚨  '.padEnd(width - 2) +
      '█\x1b[0m'
    );
    console.log('\x1b[41m\x1b[37m█' + ' '.repeat(width - 2) + '█\x1b[0m');
    console.log('\x1b[41m\x1b[37m' + '█'.repeat(width) + '\x1b[0m');
    console.log('\x1b[41m\x1b[37m' + doubleLine + '\x1b[0m');
  } else if (check.environment === 'STAGING') {
    // GREEN BANNER - SAFE TO PROCEED
    console.log('\x1b[42m\x1b[30m' + doubleLine + '\x1b[0m');
    console.log('\x1b[42m\x1b[30m█' + ' '.repeat(width - 2) + '█\x1b[0m');
    console.log(
      '\x1b[42m\x1b[30m█' +
      '  ✓  ENVIRONMENT CHECK PASSED - STAGING DATABASE  ✓  '.padEnd(width - 2) +
      '█\x1b[0m'
    );
    console.log('\x1b[42m\x1b[30m█' + ' '.repeat(width - 2) + '█\x1b[0m');
    console.log('\x1b[42m\x1b[30m' + doubleLine + '\x1b[0m');
  }

  console.log('\n' + line);
  console.log('🔍 ENVIRONMENT VERIFICATION (BUILD/MIGRATION PROTECTION)');
  console.log(line);

  console.log('\n📊 Detection Results:');
  console.log(`   Environment: ${check.environment}`);
  console.log(`   Database URL: ${check.url || 'Not found'}`);
  console.log(`   Status: ${check.isValid ? '✓ SAFE' : '✗ BLOCKED'}`);

  if (check.errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    check.errors.forEach(error => console.log(`   ${error}`));
  }

  if (check.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    check.warnings.forEach(warning => console.log(`   ${warning}`));
  }

  console.log('\n' + line);

  if (!check.isValid) {
    console.log('\n❌ OPERATION BLOCKED - CANNOT PROCEED');
    console.log('\nReasons:');
    console.log('   • You are connected to the MAIN production database');
    console.log(`   • URL detected: ${FORBIDDEN_URL}`);
    console.log('   • NO automated operations allowed on MAIN (builds, migrations, dev server)');
    console.log('\nRequired Actions:');
    console.log('   1. Update your .env files to use STAGING database');
    console.log(`   2. STAGING URL: ${ALLOWED_URL}`);
    console.log('   3. Remove any reference to MAIN database from .env files');
    console.log('   4. Re-run this verification script');
    console.log('\n⚠️  To apply changes to MAIN, you must:');
    console.log('   • Test thoroughly on STAGING first');
    console.log('   • Manually apply via Supabase Dashboard only');
    console.log('   • NEVER use automated tools (build, migration, deploy) on MAIN');
  } else {
    console.log('\n✓ SAFE TO PROCEED');
    console.log('\nYou are connected to: STAGING');
    console.log(`Database: ${ALLOWED_DB}`);
    console.log('\nYou may proceed with migrations.');
  }

  console.log('\n' + line + '\n');
}

function main(): void {
  console.clear();

  const check = checkEnvironment();
  displayBanner(check);

  if (!check.isValid) {
    process.exit(1);
  }

  process.exit(0);
}

// Run main function
main();

export { checkEnvironment, displayBanner };
