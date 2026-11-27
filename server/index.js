// Load variables from .env into process.env (used for local development).
require('dotenv').config();

const path = require('path');
const express = require('express');
const { Pool } = require('pg');

// The app cannot work without a database, so stop early with a clear message.
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not defined');
  console.error('Copy .env.example to .env and set DATABASE_URL, or add it in Render.');
  process.exit(1);
}

// Render's PostgreSQL requires SSL. Local PostgreSQL usually does not.
const useSSL = process.env.NODE_ENV === 'production';

// One connection pool is shared by every request.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

const app = express();
const PORT = process.env.PORT || 3000;

// Let Express read JSON request bodies.
app.use(express.json());

// GET /api/tasks - return every task, oldest first.
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, done, created_at FROM tasks ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/tasks failed:', err.message);
    res.status(500).json({ error: 'Could not load tasks' });
  }
});

// POST /api/tasks - add one task. Body: { "title": "Buy milk" }
app.post('/api/tasks', async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, done, created_at',
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

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.error('DELETE /api/tasks/:id failed:', err.message);
    res.status(500).json({ error: 'Could not delete task' });
  }
});

// PATCH /api/tasks/:id - mark a task done or not done. Body: { "done": true }
app.patch('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { done } = req.body;

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid task id' });
  }

  if (typeof done !== 'boolean') {
    return res.status(400).json({ error: 'done must be true or false' });
  }

  try {
    const result = await pool.query(
      'UPDATE tasks SET done = $1 WHERE id = $2 RETURNING id, title, done, created_at',
      [done, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/tasks/:id failed:', err.message);
    res.status(500).json({ error: 'Could not update task' });
  }
});

// Serve the built React files from client/dist.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// Any other route returns index.html so React can handle it.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Client build not found. Run "npm run build" first.');
    }
  });
});

// Create the table on startup, then start listening for requests.
async function start() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        done BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    // Version 1 databases already have a tasks table, so add the new column.
    // Existing rows get done = false and no data is deleted.
    await pool.query(
      'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS done BOOLEAN NOT NULL DEFAULT FALSE'
    );

    app.listen(PORT, () => {
      console.log(`Task Tracker server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Could not start the server:', err.message);
    process.exit(1);
  }
}

start();
