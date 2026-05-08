# Workout Logger Web

This is an installable web app for logging workouts, templates, calendar history, advice, and strength progress.

## Permanent Setup

Use this stack:

- Cloudflare Pages for permanent hosting.
- Supabase for email/password accounts and cloud workout storage.

## Supabase

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase-schema.sql`.
4. Go to Project Settings, then API.
5. Copy the Project URL and anon public key.
6. Paste them into `cloud-config.js`.

```js
window.WORKOUT_LOGGER_CLOUD = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_PUBLIC_KEY"
};
```

The anon key is designed to be public when Row Level Security is enabled. The schema enables RLS so each signed-in user can only access their own workout row.

## Cloudflare Pages

Deploy the contents of this folder as a static site. No build command is needed.

After it is live:

- iPhone: open the HTTPS link in Safari, tap Share, then Add to Home Screen.
- Android: open the HTTPS link in Chrome, tap the menu, then Install app or Add to Home screen.

## Local Use

Opening `index.html` directly still works, but without Supabase keys the app stores data only in this browser's local storage.
