// =====================================================================
// Task Tracker - backend (Version 1.0)
// Node.js + Express + PostgreSQL.
// This one file does two jobs:
//   1. answers the /api/tasks requests
//   2. serves the built React files from client/dist
// =====================================================================

// Read variables from .env into process.env. This is for local
// development only; on Render we add the same variable in the dashboard.
require('dotenv').config();

const path = require('path');
const express = require('express');
const { Pool } = require('pg');

// ---------------------------------------------------------------------
// 1. Stop early if the database address is missing
// ---------------------------------------------------------------------
// A missing DATABASE_URL is a configuration problem, not a code problem.
// Print one clear line and exit with status 1, so the deployment log says
// exactly what is wrong instead of failing later with a confusing error.
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not defined');
  console.error('Set it in .env locally, or in the Render Environment tab.');
  process.exit(1);
}

// ---------------------------------------------------------------------
// 2. Create one connection pool for the whole app
// ---------------------------------------------------------------------
// Render's PostgreSQL requires SSL. Local PostgreSQL usually does not.
// SSL turns on when NODE_ENV=production, or when DATABASE_SSL=true.
// Do not assume Render sets NODE_ENV: open the Render Environment tab and
// check. If it is not there, add DATABASE_SSL=true yourself.
// DATABASE_SSL=false forces SSL off (some internal Render URLs need that).
const useSSL = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === 'true'
  : process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // rejectUnauthorized:false means "encrypt the connection, but do not
  // require a local copy of Render's certificate". That is the usual
  // setting for a hosted database.
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

const app = express();

// Render gives the app a port through PORT. Locally we fall back to 3000.
const PORT = process.env.PORT || 3000;

// Let Express read JSON bodies, so req.body works in POST requests.
app.use(express.json());

// ---------------------------------------------------------------------
// 3. API routes
// ---------------------------------------------------------------------

// GET /api/tasks - return every task, oldest first.
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, created_at FROM tasks ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    // Log the real error for the developer, send a short message to the page.
    console.error('GET /api/tasks failed:', err.message);
    res.status(500).json({ error: 'Could not load tasks' });
  }
});

// POST /api/tasks - add one task. Body: { "title": "Buy milk" }
app.post('/api/tasks', async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';

  // Validate before touching the database.
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    // $1 is filled by the value in the array below. This prevents SQL injection.
    const result = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, created_at',
      [title]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/tasks failed:', err.message);
    res.status(500).json({ error: 'Could not add task' });
  }
});

// DELETE /api/tasks/:id - remove one task by id.
app.delete('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid task id' });
  }

  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    // rowCount is 0 when no row matched, so the task does not exist.
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 204 = success, nothing to send back.
    res.sendStatus(204);
  } catch (err) {
    console.error('DELETE /api/tasks/:id failed:', err.message);
    res.status(500).json({ error: 'Could not delete task' });
  }
});

// ---------------------------------------------------------------------
// 4. Serve the built React app
// ---------------------------------------------------------------------
// "npm run build" puts the static files in client/dist.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// Any other URL returns index.html so React can show the page.
// Keep this route LAST, after all the API routes.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Client build not found. Run "npm run build" first.');
    }
  });
});

// ---------------------------------------------------------------------
// 5. Prepare the database, then start the web server
// ---------------------------------------------------------------------
async function start() {
  try {
    // Create the table only if it does not exist yet. That is why a brand
    // new local database and a brand new Render database both just work.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Connected to PostgreSQL; table "tasks" is ready.');

    // PORT is the port Render tells us to use. Locally it is 3000.
    app.listen(PORT, () => {
      console.log(`Task Tracker server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    // A wrong DATABASE_URL or disabled SSL lands here.
    console.error('Could not connect to PostgreSQL:', err.message);
    process.exit(1);
  }
}

start();
