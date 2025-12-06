'use client';

import { useState, useEffect, useRef } from 'react';
import TaskList from '@/components/TaskList';
import VoiceInput from '@/components/VoiceInput';
import VoiceSettings from '@/components/VoiceSettings';
import { Task } from '@/types/task';
import { useVoice } from '@/contexts/VoiceContext';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { speak } = useVoice();
  const tasksRef = useRef<Task[]>([]);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Keep tasksRef in sync with tasks state
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = async (text: string, shouldSpeak: boolean = false) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('Failed to add task');
      const newTask = await response.json();
      setTasks(prevTasks => [newTask, ...prevTasks]);

      if (shouldSpeak) {
        await speak(`Added task: ${text}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add task';
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
      if (shouldSpeak) {
        await speak('Failed to add task');
      }
    }
  };

  const toggleTask = async (id: string, shouldSpeak: boolean = false) => {
    const task = tasks.find(t => t._id === id);
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!response.ok) throw new Error('Failed to update task');
      const updatedTask = await response.json();
      setTasks(prevTasks => prevTasks.map(t => t._id === id ? updatedTask : t));

      if (shouldSpeak) {
        const status = !task.completed ? 'Completed' : 'Uncompleted';
        await speak(`${status} task: ${task.text}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
      if (shouldSpeak) {
        await speak('Failed to update task');
      }
    }
  };

  const deleteTask = async (id: string, shouldSpeak: boolean = false) => {
    const task = tasks.find(t => t._id === id);

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete task');
      setTasks(prevTasks => prevTasks.filter(t => t._id !== id));

      if (shouldSpeak && task) {
        await speak(`Deleted task: ${task.text}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
      if (shouldSpeak) {
        await speak('Failed to delete task');
      }
    }
  };

  const handleVoiceCommand = async (command: string, isVoiceInput: boolean) => {
    try {
      // Parse command using OpenAI with task list for better matching
      // Use tasksRef.current to get the latest tasks (avoid stale closure)
      const response = await fetch('/api/parse-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          tasks: tasksRef.current.map(t => ({ _id: t._id, text: t.text, completed: t.completed }))
        }),
      });

      if (!response.ok) throw new Error('Failed to parse command');

      const parsed = await response.json();

      switch (parsed.action) {
        case 'add':
          if (parsed.taskText) {
            await addTask(parsed.taskText, isVoiceInput);
          }
          break;

        case 'addMultiple':
          if (parsed.taskTexts && Array.isArray(parsed.taskTexts)) {
            for (const taskText of parsed.taskTexts) {
              await addTask(taskText, false); // Don't speak for each one
            }
            if (isVoiceInput) {
              await speak(`Added ${parsed.taskTexts.length} tasks`);
            }
          }
          break;

        case 'complete':
          if (parsed.taskId) {
            const taskIds = Array.isArray(parsed.taskId) ? parsed.taskId : [parsed.taskId];
            const foundTasks = taskIds.map(id => tasks.find(t => t._id === id)).filter(Boolean);
            // Only complete tasks that aren't already completed
            const tasksToComplete = foundTasks.filter(task => !task.completed);

            if (tasksToComplete.length > 0) {
              for (const task of tasksToComplete) {
                if (task && task._id) {
                  await toggleTask(task._id, false); // Don't speak for each one
                }
              }
              if (isVoiceInput) {
                if (tasksToComplete.length === 1) {
                  await speak(`Completed task: ${tasksToComplete[0].text}`);
                } else {
                  await speak(`Completed ${tasksToComplete.length} tasks`);
                }
              }
            } else if (foundTasks.length > 0) {
              // All tasks were already completed
              if (isVoiceInput) {
                await speak(foundTasks.length === 1 ? 'That task is already completed' : 'Those tasks are already completed');
              }
            } else {
              const errorMsg = `Could not find that task`;
              setError(errorMsg);
              setTimeout(() => setError(null), 3000);
              if (isVoiceInput) {
                await speak(errorMsg);
              }
            }
          }
          break;

        case 'delete':
          if (parsed.taskId) {
            const taskIds = Array.isArray(parsed.taskId) ? parsed.taskId : [parsed.taskId];
            const foundTasks = taskIds.map(id => tasks.find(t => t._id === id)).filter(Boolean);

            if (foundTasks.length > 0) {
              for (const task of foundTasks) {
                if (task && task._id) {
                  await deleteTask(task._id, false); // Don't speak for each one
                }
              }
              if (isVoiceInput) {
                if (foundTasks.length === 1) {
                  await speak(`Deleted task: ${foundTasks[0].text}`);
                } else {
                  await speak(`Deleted ${foundTasks.length} tasks`);
                }
              }
            } else {
              const errorMsg = `Could not find that task`;
              setError(errorMsg);
              setTimeout(() => setError(null), 3000);
              if (isVoiceInput) {
                await speak(errorMsg);
              }
            }
          }
          break;

        case 'completeAll':
          const pendingTasks = tasks.filter(t => !t.completed);
          for (const task of pendingTasks) {
            if (task._id) {
              await toggleTask(task._id, false); // Don't speak for each one
            }
          }
          if (isVoiceInput) {
            await speak(`Completed ${pendingTasks.length} tasks`);
          }
          break;

        case 'deleteCompleted':
          const completedTasks = tasks.filter(t => t.completed);
          for (const task of completedTasks) {
            if (task._id) {
              await deleteTask(task._id, false); // Don't speak for each one
            }
          }
          if (isVoiceInput) {
            await speak(`Deleted ${completedTasks.length} completed tasks`);
          }
          break;

        case 'clearAll':
          const allTasks = [...tasks];
          for (const task of allTasks) {
            if (task._id) {
              await deleteTask(task._id, false);
            }
          }
          if (isVoiceInput) {
            await speak(`Deleted all ${allTasks.length} tasks`);
          }
          break;

        case 'count':
          const pending = tasks.filter(t => !t.completed).length;
          const completed = tasks.filter(t => t.completed).length;
          if (isVoiceInput) {
            await speak(`You have ${pending} pending tasks and ${completed} completed tasks`);
          }
          break;

        case 'readTasks':
          if (tasks.length === 0) {
            if (isVoiceInput) {
              await speak('You have no tasks');
            }
          } else {
            const taskList = tasks
              .filter(t => !t.completed)
              .map(t => t.text)
              .join(', ');
            if (isVoiceInput) {
              await speak(`Your tasks are: ${taskList}`);
            }
          }
          break;

        case 'list':
          await fetchTasks();
          if (isVoiceInput) {
            await speak(`Showing ${tasks.length} tasks`);
          }
          break;

        case 'help':
          if (isVoiceInput) {
            await speak(
              'You can say: add task, add multiple tasks, complete task, delete task, complete all tasks, delete completed tasks, how many tasks, read my tasks, or show tasks. I can also complete or delete multiple tasks at once based on what you say.'
            );
          }
          break;

        case 'unknown':
          const unknownMsg = parsed.message || 'Command not recognized';
          setError(unknownMsg);
          setTimeout(() => setError(null), 3000);
          if (parsed.message && isVoiceInput) {
            await speak(parsed.message);
          }
          break;

        default:
          // Default to adding as a task
          await addTask(command, isVoiceInput);
          break;
      }
    } catch (err) {
      console.error('Error handling voice command:', err);
      const errorMsg = 'Failed to process voice command';
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
      if (isVoiceInput) {
        await speak('Sorry, I could not process that command');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-500 dark:from-cyan-600 dark:via-blue-600 dark:to-purple-700">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setSettingsOpen(true)}
            className="absolute top-0 right-0 p-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl transition-all shadow-lg cursor-pointer hover:scale-110 z-10"
            aria-label="Open voice settings"
            type="button"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          <h1 className="text-6xl font-bold text-white drop-shadow-lg mb-3">
            VocaList
          </h1>
          <p className="text-xl text-white/90 font-medium drop-shadow">
            Voice-Controlled To-Do List Manager
          </p>
        </header>

        <VoiceSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

        {error && (
          <div className="mb-4 p-4 bg-red-400 border-2 border-red-600 text-white rounded-xl shadow-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-sm underline font-semibold hover:text-red-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-6">
          <VoiceInput onCommand={handleVoiceCommand} onAddTask={addTask} />
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
            <p className="mt-4 text-white text-lg font-medium drop-shadow">Loading tasks...</p>
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        )}
      </div>
    </div>
  );
}
