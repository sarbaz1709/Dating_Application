/// <reference types="expo/types" />

// Typed public env vars (inlined by Expo at build time). Keep in sync with .env.example.
declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_SUPABASE_URL?: string;
    readonly EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  }
}
