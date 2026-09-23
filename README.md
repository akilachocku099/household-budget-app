# Household Budget React + Cloud Storage

A React/Vite household budget dashboard designed for Netlify. It keeps the existing workbook-derived UI and calculations, but stores changes in Supabase so they survive refreshes, redeployments, and browser restarts.

## 1. Install

```bash
npm install
npm run dev
```

## 2. Create the Supabase table

Open the Supabase SQL Editor and run `supabase.sql`.

Then enable **Anonymous Sign-Ins** under Authentication providers. The app does not show a login screen; Supabase creates an anonymous user in the background and the database row is protected by RLS.

## 3. Add Netlify environment variables

Create these in Netlify Site configuration > Environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use your project's Supabase URL and publishable/anon key. Do not put a Supabase service-role key in a Vite `VITE_` variable or in browser code.

Netlify makes build environment variables available to the build, and Supabase's publishable/anon key is intended for client use when Row Level Security is correctly configured.

## 4. Deploy

Build command:

```bash
npm run build
```

Publish directory:

```text
dist
```

## Data behavior

- Changes are saved locally immediately as a backup.
- Changes are also synced to Supabase after edits.
- Reloading the app loads the cloud copy.
- There is no visible login.
- An anonymous Supabase user is tied to that browser session. Clearing browser data or changing device/browser creates a different anonymous user, so it is not a cross-device identity.
