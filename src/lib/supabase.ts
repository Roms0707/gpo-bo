import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const appEnv = import.meta.env.VITE_APP_ENV || 'staging';

// Environment detection based on Supabase URL
type Environment = 'MAIN' | 'STG' | 'PROD' | 'UNKNOWN';

const ENVIRONMENT_URLS = {
  MAIN: 'hfjyowydvpqjbtbbzoeu.supabase.co',
  STG: 'jpksnvuiaptymrwnwnhn.supabase.co',
  PROD: 'jpksnvuiaptymrwnwnhn.supabase.co', // Same as STG for now
};

function detectEnvironment(url: string): Environment {
  if (!url) return 'UNKNOWN';

  if (url.includes(ENVIRONMENT_URLS.MAIN)) return 'MAIN';
  if (url.includes(ENVIRONMENT_URLS.STG)) return 'STG';

  return 'UNKNOWN';
}

export const currentEnvironment: Environment = detectEnvironment(supabaseUrl);

// Enhanced logging with environment detection
if (import.meta.env.DEV) {
  const envEmoji = currentEnvironment === 'MAIN' ? '🔴' : currentEnvironment === 'STG' ? '🟠' : '🟢';
  console.log('\n' + '='.repeat(60));
  console.log('🔧 Environment Configuration:');
  console.log(`   ${envEmoji} Detected Environment: ${currentEnvironment}`);
  console.log(`   📝 Expected Environment: ${appEnv.toUpperCase()}`);
  console.log(`   🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`   🎯 Mode: ${import.meta.env.MODE}`);

  // Warning if connected to MAIN
  if (currentEnvironment === 'MAIN') {
    console.warn('\n⚠️  WARNING: YOU ARE CONNECTED TO THE MAIN DATABASE!');
    console.warn('   This is the production database. Be careful with your actions.\n');
  }

  // Warning if environment mismatch
  if (appEnv.toUpperCase() !== currentEnvironment && currentEnvironment !== 'UNKNOWN') {
    console.warn(`\n⚠️  Environment mismatch detected!`);
    console.warn(`   Expected: ${appEnv.toUpperCase()}, Got: ${currentEnvironment}\n`);
  }

  console.log('='.repeat(60) + '\n');
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your environment files.');
}

try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});