# Intentional break demos

These two changes are meant to be made on purpose during the presentation. Each
one shows a different kind of deployment failure and how to fix it.

Run them on a branch (for example `demo-break-db-url`) so `main` stays healthy.
Push the branch and set the Render service to deploy that branch, or use a
separate test service.

---

## Demo A: remove `DATABASE_URL`

### What to change

In the Render Dashboard, open the service, go to **Environment**, and delete the
`DATABASE_URL` variable. Choose **Save, rebuild, and deploy** (or save and then
restart the service).

### What the Render log shows

The deploy starts, then the server stops immediately with:

```text
DATABASE_URL is not defined
Copy .env.example to .env and set DATABASE_URL, or add it in Render.
==> Exited with status 1
```

This comes from the top of `server/index.js`, before Express starts listening.
The app refuses to run because it cannot reach a database.

### How to fix it

1. Go back to **Environment**.
2. Add `DATABASE_URL` again and paste the **Internal Database URL** from your
   Render PostgreSQL database.
3. Choose **Save and deploy**.

No code change is needed. The next deploy starts normally.

---

## Demo B: remove the `pg` package

### What to change

In `package.json`, delete this line from `dependencies`:

```diff
   "dependencies": {
     "dotenv": "^16.4.7",
     "express": "^4.21.2",
-    "pg": "^8.13.1"
   }
```

Commit and push. Do not edit `package-lock.json` by hand; Render's
`npm install` step updates it.

### What the Render log shows

The build succeeds because the server code is not compiled. The **start** step
then crashes:

```text
Error: Cannot find module 'pg'
Require stack:
- /opt/render/project/src/server/index.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:...)
    at Module._load (node:internal/modules/cjs/loader:...)
    at Module.require (node:internal/modules/cjs/loader:...)
    at require (node:internal/modules/helpers:...)
    at Object.<anonymous> (/opt/render/project/src/server/index.js:6:17)
    ...
Node.js v22.x.x
==> Exited with status 1
```

`server/index.js` line 6 is `const { Pool } = require('pg');`. The package is
listed nowhere in `dependencies`, so `npm install` did not install it.

### How to fix it

Restore the dependency and redeploy:

```bash
npm install pg
git add package.json package-lock.json
git commit -m "Restore pg dependency"
git push
```

Or add the line back by hand:

```json
"pg": "^8.13.1"
```

Then run `npm install` locally to update `package-lock.json`, commit both files,
and push. Render installs the package again and the service starts.

### Local version of the same demo

If you want to show it without Render:

```bash
npm uninstall pg
npm start
```

The terminal prints the same `Cannot find module 'pg'` error. Restore it with:

```bash
npm install pg
```
