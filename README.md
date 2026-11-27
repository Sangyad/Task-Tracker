# Task Tracker

A small full-stack task tracker built for a school demo about deploying web
applications. Version 1.0 stores tasks in PostgreSQL, so the list is still there
after a page refresh.

## Tech stack

- **Frontend:** React + Vite (`client/`)
- **Backend:** Node.js + Express (`server/index.js`)
- **Database:** PostgreSQL with the `pg` package
- **Config:** `dotenv`, reading `DATABASE_URL` from `.env`

## Project structure

```
task-tracker/
  client/            Vite + React app (src/App.jsx is the main page)
  server/index.js    Express API + static file server
  package.json       Root scripts and server dependencies
  .env.example       Example local database connection string
  .gitignore         node_modules, .env, client/dist
  README.md
  DEMO.md            Two intentional break demos for the presentation
  V2.md              Version 2.0 changes and database migration
```

## Version 1.0 features

- See a list of tasks
- Add a task with the text box and **Add** button
- Delete a task with its **Delete** button
- Tasks are saved in PostgreSQL (not just in the browser)
- The server creates the `tasks` table on startup if it does not exist

### API

| Method | Path               | Body                    | Purpose                    |
| ------ | ------------------ | ----------------------- | -------------------------- |
| GET    | `/api/tasks`       | none                    | List all tasks             |
| POST   | `/api/tasks`       | `{ "title": "Buy milk" }` | Add a task                 |
| DELETE | `/api/tasks/:id`   | none                    | Delete one task            |
| PATCH  | `/api/tasks/:id`   | `{ "done": true }`      | Mark a task done/not done (v2.0) |

> Version 2.0 (branch `v2`) adds the `done` column, the PATCH route above, and
> the **Mark as done** button. See [V2.md](V2.md) for details and the migration.

## Run it locally

### 1. Requirements

- Node.js 18 or newer
- PostgreSQL installed and running

### 2. Clone and install the server dependencies

```bash
git clone git@github.com:Sangyad/Task-Tracker.git
cd task-tracker
npm install
```

### 3. Create the local database

```bash
createdb tasktracker
```

If `createdb` is not on your PATH, use psql instead:

```bash
psql -U postgres -c "CREATE DATABASE tasktracker;"
```

### 4. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and change the values to match your PostgreSQL user and password:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tasktracker
```

### 5. Run in development (two terminals)

Terminal 1 - Express API on <http://localhost:3000>:

```bash
npm run dev
```

Terminal 2 - Vite dev server on <http://localhost:5173>:

```bash
npm install --prefix client   # first time only
npm run dev:client
```

Open <http://localhost:5173>. Vite forwards `/api` requests to the Express
server, so both servers work together.

### 6. Build and run the production version locally

```bash
npm run build
npm start
```

- `npm run build` installs the client dependencies and builds React into
  `client/dist`.
- `npm start` runs `node server/index.js`, which serves `client/dist` and the
  API on <http://localhost:3000>.

## Deploy to Render

### 1. Create the database

In the Render Dashboard, click **New > Postgres**, create a database, and copy
its **Internal Database URL**. Keep the web service and the database in the same
region.

### 2. Create the web service

Click **New > Web Service** and connect this GitHub repository. Use these
settings:

| Setting            | Value                          |
| ------------------ | ------------------------------ |
| **Language**       | Node                           |
| **Build Command**  | `npm install && npm run build` |
| **Start Command**  | `npm start`                    |
| **Environment variable** | `DATABASE_URL` = your Render **Internal Database URL** |

`npm run build` installs the client dependencies and builds React into
`client/dist`. `npm start` runs `node server/index.js`.

### 3. Environment variables

Add this variable under **Environment**:

```
DATABASE_URL=postgres://...   (paste the Internal Database URL from Render)
```

You do **not** need to add `PORT`: Render sets it automatically. Render also
sets `NODE_ENV=production` at runtime, which turns on SSL for the `pg`
connection (Render's PostgreSQL requires SSL).

### 4. Deploy

Click **Create Web Service**. When the deploy finishes, open the `onrender.com`
URL. The server creates the `tasks` table on its first start.

> Never commit `.env` or paste a real database URL into a file. Secrets belong
> in the Render Environment settings.

## Version 2.0

See [V2.md](V2.md) for the `done` column, the `PATCH /api/tasks/:id` endpoint,
the "Mark as done" button, and the safe database migration.

## Demo scripts

See [DEMO.md](DEMO.md) for two intentional break examples:

1. Removing `DATABASE_URL`
2. Removing the `pg` package from `package.json`
