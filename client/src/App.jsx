import { useEffect, useState } from 'react';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  // Load the task list from the API.
  async function loadTasks() {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Could not load tasks');
      setTasks(await response.json());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  // Run once when the page first opens.
  useEffect(() => {
    loadTasks();
  }, []);

  // Send a new task to the server.
  async function addTask(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!response.ok) throw new Error('Could not add task');

      const newTask = await response.json();
      setTasks((current) => [...current, newTask]);
      setTitle('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  // Remove a task, then remove it from the list on screen.
  async function deleteTask(id) {
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete task');
      setTasks((current) => current.filter((task) => task.id !== id));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app">
      <h1>Task Tracker</h1>
      <p className="subtitle">A tiny full-stack demo app.</p>

      <form className="add-form" onSubmit={addTask}>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to be done?"
          aria-label="New task title"
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      {tasks.length === 0 ? (
        <p className="empty">No tasks yet. Add your first one above.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id}>
              <span>{task.title}</span>
              <button
                className="delete"
                onClick={() => deleteTask(task.id)}
                aria-label={`Delete ${task.title}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
