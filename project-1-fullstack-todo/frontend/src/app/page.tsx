'use client'; // This directive is necessary for using React hooks

import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';

// Define the type for a single To-Do item to match the backend
interface Todo {
  id: string;
  task: string;
  completed: boolean;
}

// The base URL of our FastAPI backend
const API_URL = 'http://localhost:8000/api/todos';

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState('');

  // 1. Fetch all todos from the backend when the component mounts
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const response = await axios.get(API_URL);
        setTodos(response.data);
      } catch (error) {
        console.error('Error fetching todos:', error);
      }
    };
    fetchTodos();
  }, []); // Empty dependency array means this runs once on mount

  // 2. Handle form submission to add a new task
  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault(); // Prevent page reload
    if (!newTask.trim()) return; // Don't add empty tasks

    try {
      const response = await axios.post(API_URL, { task: newTask });
      setTodos([...todos, response.data]); // Add new task to the list
      setNewTask(''); // Clear the input field
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  // 3. Handle toggling the completed status of a task
  const handleToggleComplete = async (id: string) => {
    try {
      const response = await axios.patch(`${API_URL}/${id}`);
      setTodos(todos.map(todo => (todo.id === id ? response.data : todo)));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // 4. Handle deleting a task
  const handleDeleteTask = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      setTodos(todos.filter(todo => todo.id !== id)); // Remove task from the list
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // 5. Handle starting edit mode
  const handleStartEdit = (id: string, task: string) => {
    setEditingId(id);
    setEditTask(task);
  };

  // 6. Handle saving edited task
  const handleSaveEdit = async (id: string, e: FormEvent) => {
    e.preventDefault();
    if (!editTask.trim()) return;

    try {
      const response = await axios.put(`${API_URL}/${id}`, { task: editTask });
      setTodos(todos.map(todo => (todo.id === id ? response.data : todo)));
      setEditingId(null);
      setEditTask('');
    } catch (error) {
      console.error('Error editing task:', error);
    }
  };

  // 7. Handle canceling edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTask('');
  };

  // 8. Handle clearing all completed tasks
  const handleClearCompleted = async () => {
    try {
      await axios.delete(`${API_URL}/completed`);
      setTodos(todos.filter(todo => !todo.completed));
    } catch (error) {
      console.error('Error clearing completed tasks:', error);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-cyan-400">
          Full-Stack To-Do List
        </h1>

        {/* Form to add a new task */}
        <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            className="flex-grow p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Add
          </button>
        </form>

        {/* Clear Completed Button */}
        <div className="mb-4">
          <button
            onClick={handleClearCompleted}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Clear Completed
          </button>
        </div>

        {/* List of tasks */}
        <ul className="space-y-3">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center justify-between p-3 bg-gray-700 rounded-md"
            >
              {editingId === todo.id ? (
                <form onSubmit={(e) => handleSaveEdit(todo.id, e)} className="flex w-full gap-2">
                  <input
                    type="text"
                    value={editTask}
                    onChange={(e) => setEditTask(e.target.value)}
                    className="flex-grow p-2 rounded bg-gray-600 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded-full transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span
                    onClick={() => handleToggleComplete(todo.id)}
                    className={`cursor-pointer flex-grow ${todo.completed ? 'line-through text-gray-500' : ''}`}
                  >
                    {todo.task}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit(todo.id, todo.task)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded-full transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(todo.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded-full transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}