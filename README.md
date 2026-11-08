# Dialed

**Talk first. Text if it clicks.**

Dialed is a voice-first dating app for iOS and Android. Two people match, hop on a 5-minute voice
call, and texting unlocks only if both of them want it. No endless small talk with strangers.

> "Dialed" is a working name. It lives in `src/constants/brand.ts` and `app.json`. Run a trademark
> check before launch.

## MVP progress

| #   | Feature                                        | Status     |
| --- | ---------------------------------------------- | ---------- |
| 1   | Auth (email sign-up/login, 18+ check, log out) | ✅ Done    |
| 2   | Profile                                        | ⏭️ Next    |
| 3   | Mini questionnaire                             | ⬜ Planned |
| 4   | Discovery                                      | ⬜ Planned |
| 5   | Match                                          | ⬜ Planned |
| 6   | Matches list                                   | ⬜ Planned |
| 7   | Call                                           | ⬜ Planned |
| 8   | Chat                                           | ⬜ Planned |
| 9   | Safety basics                                  | ⬜ Planned |

### What Auth includes

- **Sign up** with email and password, plus a single "I'm 18 or older" checkbox.
- **Email confirmation with a 6-digit code** typed into the app. There are no magic links, so no
  deep-link setup is needed and it works in Expo Go.
- **Log in** and **log out**. Log out is local to the device and works offline.
- **Forgot password**: a code is emailed, then the user sets a new password in-app.
- **Session persistence** in the device keychain/keystore (Expo SecureStore), refreshed while the
  app is in the foreground.
- **Protected navigation**: signed-out users can only reach the auth screens, signed-in users
  only the app.
- **Server-side 18+ enforcement**: a database trigger rejects any sign-up without the
  attestation (even from a modified client) and records it in `user_consents`.

### The feel

The app is designed to reward every step. A live voice waveform runs on the welcome screen. Each
press gets haptic feedback and a little squish. The password meter fills up as you type, and the
18+ checkbox springs when you tick it. Code boxes pop as each digit lands and shake on a wrong
code. A brand-new account gets a confetti burst and a "Road to your first call" progress card on
arrival. All motion respects the OS "reduce motion" setting.

## Tech stack

TypeScript (strict) · React Native 0.88 · Expo SDK 58 · Expo Router · TanStack Query · Zustand ·
React Hook Form · Zod · Supabase (Auth, Postgres) · Expo SecureStore · Reanimated 4 · Jest ·
pgTAP. See the full technical specification for the roadmap (storage, realtime, Edge Functions,
OpenAI, pgvector).

## Project structure

```text
src/
  app/                      Expo Router routes (screens only)
    _layout.tsx             Providers, fonts, session restore, protected routing
    (auth)/                 Welcome, register, login, verify-email, forgot/reset password
    (app)/                  Signed-in area (home for now)
  components/               Shared UI: Button, TextField, Screen, SoundWave, ConfettiBurst…
  features/authentication/  Auth service, hooks, session store, schemas, errors, components
  lib/                      Supabase client, env validation, secure storage, haptics
  constants/  theme/  hooks/  types/
supabase/
  config.toml               Local Supabase config (auth settings, email templates)
  migrations/               SQL migrations (the only way the schema changes)
  templates/                Branded confirmation and recovery emails with the 6-digit code
  tests/database/           pgTAP tests for triggers and row-level security
```

## Getting started (local)

Prerequisites: Node 22+, Docker (for local Supabase), and the Expo Go app on your phone (or an
iOS simulator or Android emulator).

```bash
npm install
```

```bash
npm run db:start
```

`db:start` boots Postgres, Auth, the API gateway and a local email inbox, and applies the
migrations. It prints an **API URL** and a **Publishable key**.

```bash
cp .env.example .env.local
```

Put the API URL and publishable key into `.env.local`. On a physical phone, use your computer's
LAN IP instead of `127.0.0.1` (for example `http://192.168.1.20:54321`).

```bash
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

Sign-up and password-reset emails don't leave your machine locally. Open the inbox at
<http://127.0.0.1:54324> to read the 6-digit codes.

## Hosted Supabase setup (when you're ready)

1. Create a project at [supabase.com](https://supabase.com) (separate projects for development
   and production).
2. Link it and push the migrations:

   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

   ```bash
   npx supabase db push
   ```

3. In **Authentication → Sign In / Providers → Email**: keep **Confirm email** on, set the
   **email OTP length** to 6 and the **expiry** to 900 seconds. Under password settings, set the
   minimum length to 8 and require **letters and digits**.
4. In **Authentication → Email Templates**, paste `supabase/templates/confirmation.html` into
   "Confirm signup" and `supabase/templates/recovery.html` into "Reset password".
5. Configure **custom SMTP** before inviting real users. Supabase's built-in mailer is heavily
   rate-limited and meant for testing only.
6. Put the project URL and **publishable** key in `.env.local` (or EAS environment variables).
   Never put a secret or service-role key in an `EXPO_PUBLIC_` variable.

## Scripts

| Command             | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm start`         | Expo dev server                             |
| `npm run typecheck` | TypeScript, strict                          |
| `npm run lint`      | ESLint (Expo config + React Compiler rules) |
| `npm run format`    | Prettier                                    |
| `npm test`          | Jest unit tests                             |
| `npm run check`     | All of the above (read-only)                |
| `npm run db:start`  | Start local Supabase                        |
| `npm run db:reset`  | Recreate the local database from migrations |
| `npm run db:test`   | pgTAP database tests (trigger + RLS)        |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check and unit tests, and applies
the migrations to a real Postgres to run the database tests.

## Notes and known limits

- **18+ is a self-attestation**, enforced and recorded server-side. It is not age verification;
  review age-assurance options before launch.
- **Accounts created outside the app** (dashboard, admin API, future Google/Apple sign-in) must
  include `age_attested_18_plus: true` in user metadata, or the trigger rejects them.
- **Phone sign-up** is deferred (it needs an SMS provider). The auth layer is written so it can
  slot in later.
- **Web** is used only for development previews. iOS and Android are the targets.
