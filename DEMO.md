# Two intentional deployment errors (live demo)

These two failures are **made on purpose** during the presentation. Each one
teaches a different lesson:

| Demo | Broken thing | Lesson |
| ---- | ------------ | ------ |
| **A** | `DATABASE_URL` removed from Render | A deployment can build fine and still crash: configuration is part of the release. |
| **B** | `pg` removed from `package.json` | The build does not test the server code; a missing dependency only shows up when Node starts. |

> Run both on the deployed service, but keep a known-good branch so you can
> restore it quickly. The fastest reset is **Render → Deploys → Redeploy** on the
> last good deploy.

---

## Where to look in Render

1. Open the service → **Logs** (or **Events → Deploy → Logs**).
2. The build output and the start output are in **the same log stream**.
3. Scroll to the **bottom**: the last lines are the crash.
4. Use the log search box and type `not defined` or `Cannot find module`.
5. The line `==> Exited with status 1` is added by Render, not by our code. It
   means the process stopped with a non-zero exit code, so the deploy failed.

A successful start always contains these two lines from `server/index.js`:

```text
Connected to PostgreSQL; table "tasks" is ready.
Task Tracker server running on http://localhost:10000
```

(`10000` is Render's `PORT`; locally it is `3000`. The URL text is just a log
message — Render serves it on the public `onrender.com` address.)

---

# Demo A — missing `DATABASE_URL`

## What to change (Render dashboard only, no code)

1. Service → **Environment**.
2. Find `DATABASE_URL` and delete it (the trash / × button).
3. Click **Save, rebuild, and deploy** (or save, then **Manual Deploy → Deploy
   latest commit**).

## Expected log text

The **build** finishes normally:

```text
==> Running build command 'npm install && npm run build'...
...
✓ built in 623ms
==> Build successful 🎉
==> Running 'npm start'
```

Then the **start** step stops immediately:

```text
DATABASE_URL is not defined
Set it in .env locally, or in the Render Environment tab.
==> Exited with status 1
```

The first line is printed by the guard at the top of `server/index.js`
(`console.error`), the third line is Render reporting the exit status. The
message is short and specific on purpose: whoever reads the log should know what
to fix without opening the code.

**Why the build passed:** `npm run build` only installs packages and compiles
React. It never connects to the database, so a missing URL cannot fail the
build. The app only needs the database when it starts.

## How to fix it

1. **Environment** → **Add Environment Variable**.
2. Key: `DATABASE_URL`.
3. Value: paste the **Internal Database URL** from the Render PostgreSQL
   database (the same one used before).
4. **Save and deploy**.

## Expected result after the fix

```text
Connected to PostgreSQL; table "tasks" is ready.
Task Tracker server running on http://localhost:10000
==> Your service is live 🎉
```

Open the public URL: the old tasks are still listed, because the database was
never deleted — only the web service's configuration was broken.

## Rehearse it locally (no Render needed)

```bash
mv .env .env.backup      # hide the local database URL
npm start
# -> DATABASE_URL is not defined
# -> exit code 1
mv .env.backup .env      # restore
```

---

# Demo B — missing `pg` dependency

## What to change (code)

In `package.json`, delete the `pg` line from `dependencies`:

```diff
   "dependencies": {
     "dotenv": "^16.4.7",
     "express": "^4.21.2",
-    "pg": "^8.13.1"
   }
```

Commit and push:

```bash
git add package.json
git commit -m "Demo: remove pg dependency"
git push
```

You do **not** need to edit `package-lock.json` by hand. `npm install` on Render
reads `package.json` and will not install `pg`.

## Expected log text

Build:

```text
==> Running build command 'npm install && npm run build'...
...
✓ built in 623ms
==> Build successful 🎉
==> Running 'npm start'
```

Start (this is the important part):

```text
node:internal/modules/cjs/loader:1573
  throw err;
  ^

Error: Cannot find module 'pg'
Require stack:
- /opt/render/project/src/server/index.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1569:15)
    at Module._load (node:internal/modules/cjs/loader:1346:5)
    at Module.require (node:internal/modules/cjs/loader:1679:12)
    at require (node:internal/modules/helpers:196:16)
    at Object.<anonymous> (/opt/render/project/src/server/index.js:15:18)
    ...

Node.js v22.x.x
==> Exited with status 1
```

Two details worth saying out loud:

- `Cannot find module 'pg'` is the exact problem: the package is not installed.
- `server/index.js:15` is the line `const { Pool } = require('pg');`.

> The `at ...` stack frames and the loader line numbers change between Node
> versions (`Node.js v20.x`, `v22.x`, ...). The two lines that matter —
> `Error: Cannot find module 'pg'` and `Exited with status 1` — do not change.

## How to fix it

```bash
npm install pg
git add package.json package-lock.json
git commit -m "Restore pg dependency"
git push
```

`npm install pg` adds the package back **and** updates `package-lock.json` so
the exact version is recorded. Render runs `npm install` again, finds `pg`, and
the server starts.

Alternative if you are in a hurry: add `"pg": "^8.13.1"` back into
`package.json`, run `npm install` locally to update the lock file, commit both
files, and push.

## Expected result after the fix

```text
Connected to PostgreSQL; table "tasks" is ready.
Task Tracker server running on http://localhost:10000
```

The task list still contains the tasks added earlier — the database was never
touched.

## Rehearse it locally (no Render needed)

```bash
mv node_modules/pg /tmp/pg-backup   # pretend pg was never installed
npm start
# -> Error: Cannot find module 'pg'
# -> exit code 1
mv /tmp/pg-backup node_modules/pg   # restore
```

---

# Reset after the demo

1. Render → **Environment** → confirm `DATABASE_URL` exists.
2. `package.json` → confirm `"pg": "^8.13.1"` is back.
3. `git status` → the working tree should be clean.
4. Render → **Deploys** → the newest deploy must be **Live**.
5. Reload the public URL and check that tasks are still there.

# Quick reference

| Log line | Meaning | Fix |
| -------- | ------- | --- |
| `DATABASE_URL is not defined` + `Exited with status 1` | Environment variable missing | Add `DATABASE_URL` in Render → Environment |
| `Cannot find module 'pg'` + `Exited with status 1` | Dependency missing from `package.json` | `npm install pg`, commit, push |
| `Could not connect to PostgreSQL: ...` | URL is wrong, database is asleep, or SSL mismatch | Check the Internal URL; try `DATABASE_SSL=true` (or `false` if the log says SSL is not supported) |
| Build fails at `vite build` | React code error | Read the file/line above the error |
| Deploy is stuck in "In progress" | Free instance waking up | Wait 1–2 minutes |
