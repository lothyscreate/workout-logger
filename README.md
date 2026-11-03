# Workout Logger Web

An installable workout logger with gym-specific routines, calendar history, insights, and strength progress.

Live app: https://lothyscreate.github.io/workout-logger/

## Decimal weights and default units (v22)

- Logged weights retain decimals when entering, editing, saving, reloading, and syncing, including independent left/right loads.
- New exercises and routines default to pounds (`lb`), independently of the body-weight unit in Account & settings. Existing exercises and saved routine units are preserved; kg remains selectable.
- Previously rounded values cannot be reconstructed automatically. Correct those entries in Days if needed.

## Gym tracking (v21)

- Select Apartment, University, or Previous gym before starting. The selection is remembered on this device. An active workout keeps its original gym when you browse other gyms.
- Each gym has independent templates. Use **Copy a routine from another gym** to copy and adapt an existing plan; machine labels are cleared and history is never copied.
- Previous-set hints and strength charts match gym, exercise name, machine/setup label, bilateral/unilateral mode, and load unit. Left and right sides have independent charts. Names and labels ignore case and extra spaces.
- Previous hints come from a single preceding session. Editing historical workouts never uses that workout or future sessions as its baseline.
- Existing data is migrated to **Previous gym**, with all original values preserved. Legacy weights keep an unspecified unit rather than assuming lb or kg. Correct a saved workout's gym from **Days → Edit → Workout gym**.
- **Account & settings → Export all workout data** saves a JSON backup. Account sign-in and sync are in the same panel.
- Local storage keys and the Supabase JSON row are unchanged. No SQL migration is needed. Gym/equipment fields travel with the existing synced data.
- v21 edits carry a revision timestamp, so older recovery copies cannot restore deleted sets or undo corrected gym labels. Concurrent edits to the same workout use the latest complete record; this is not collaborative real-time editing.

## Validation

No build step or dependency installation is required. Run `node --test tests/gym-tracking.test.cjs` for isolation, migration, history matching, and recovery tests. For a local preview, run `python -m http.server 8765 --bind 127.0.0.1` and open `http://127.0.0.1:8765/`.

GitHub Pages publishes the repository root from `main`. Keep all versioned asset references in `index.html` and `service-worker.js` aligned when releasing. Existing installs can use **Account & settings → Check update**; service-worker activation waits for the update action or for existing app tabs to close.

## Permanent Setup

The current app uses:

- GitHub Pages for hosting (static hosting such as Cloudflare Pages also works).
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
