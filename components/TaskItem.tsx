import { Task } from '@/types/task';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <div className="flex items-center gap-4 p-5 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02] border-2 border-white/50">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => task._id && onToggle(task._id)}
        className="w-6 h-6 rounded-lg border-2 border-purple-400 text-purple-600 focus:ring-4 focus:ring-purple-400 cursor-pointer accent-purple-600"
        aria-label={`Mark "${task.text}" as ${task.completed ? 'incomplete' : 'complete'}`}
      />
      <span
        className={`flex-1 text-lg font-semibold ${
          task.completed
            ? 'line-through text-gray-400'
            : 'text-gray-800'
        }`}
      >
        {task.text.charAt(0).toUpperCase() + task.text.slice(1)}
      </span>
      <button
        onClick={() => task._id && onDelete(task._id)}
        className="p-3 bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
        aria-label={`Delete task "${task.text}"`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
