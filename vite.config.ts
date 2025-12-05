import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const envFile = process.env.VITE_ENV || 'staging';

  let envFilePath = '.env.staging';
  if (envFile === 'production') {
    envFilePath = '.env.production';
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 VITE BUILD STARTING - ENVIRONMENT: ${envFile.toUpperCase()}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📁 Environment file: ${envFilePath}`);

  // Load ONLY the specific environment file, not .env
  const fullPath = resolve(process.cwd(), envFilePath);
  let envContent = {};

  // Safety check constants
  const FORBIDDEN_DB = 'hfjyowydvpqjbtbbzoeu';
  const ALLOWED_DB = 'jpksnvuiaptymrwnwnhn';

  try {
    const fileContent = readFileSync(fullPath, 'utf-8');
    fileContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envContent[key] = value;
      }
    });

    const supabaseUrl = envContent.VITE_SUPABASE_URL || '';

    // CRITICAL SAFETY CHECK
    if (supabaseUrl.includes(FORBIDDEN_DB)) {
      console.error('\n' + '█'.repeat(80));
      console.error('█' + ' '.repeat(78) + '█');
      console.error('█  🚨  CRITICAL ERROR: MAIN DATABASE DETECTED - BUILD BLOCKED  🚨           █');
      console.error('█' + ' '.repeat(78) + '█');
      console.error('█'.repeat(80));
      console.error('\n❌ CANNOT BUILD WITH MAIN DATABASE CONFIGURATION');
      console.error(`   Detected: ${FORBIDDEN_DB}`);
      console.error(`   File: ${envFilePath}`);
      console.error('\n✓ REQUIRED: Use STAGING database only');
      console.error(`   Project ID: ${ALLOWED_DB}`);
      console.error(`   URL: https://${ALLOWED_DB}.supabase.co`);
      console.error('\n🔧 Fix: Update your environment file to use STAGING credentials');
      console.error('   Run: npm run check:full (for detailed help)\n');
      process.exit(1);
    }

    console.log(`✅ Environment loaded successfully`);
    console.log(`🔗 Supabase URL: ${supabaseUrl}`);

    if (supabaseUrl.includes(ALLOWED_DB)) {
      console.log(`✓  Connected to: STAGING (${ALLOWED_DB})`);
    } else {
      console.log(`⚠️  Warning: Unknown database detected`);
    }
    console.log(`${'='.repeat(80)}\n`);
  } catch (error) {
    console.error(`❌ Error loading ${envFilePath}:`, error.message);
    process.exit(1);
  }

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    // Disable automatic .env file loading
    envDir: process.cwd(),
    envPrefix: ['VITE_', 'GALAXY_'],
    define: {
      'import.meta.env.VITE_APP_ENV': JSON.stringify(envFile),
      // Inject env variables directly
      ...Object.keys(envContent).reduce((acc, key) => {
        if (key.startsWith('VITE_') || key.startsWith('GALAXY_')) {
          acc[`import.meta.env.${key}`] = JSON.stringify(envContent[key]);
        }
        return acc;
      }, {}),
    },
  };
});
