// Shared task storage for async image-to-prompt processing
// In production, this should be replaced with Redis or a database

export interface TaskData {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime: number;
}

// Global task storage
const taskStorage = new Map<string, TaskData>();

export const TaskStorage = {
  set: (taskId: string, data: TaskData) => {
    taskStorage.set(taskId, data);
  },

  get: (taskId: string): TaskData | undefined => {
    return taskStorage.get(taskId);
  },

  delete: (taskId: string): boolean => {
    return taskStorage.delete(taskId);
  },

  has: (taskId: string): boolean => {
    return taskStorage.has(taskId);
  },

  // Clean up old tasks (older than 1 hour)
  cleanup: () => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [taskId, task] of taskStorage.entries()) {
      if (task.startTime < oneHourAgo && (task.status === 'completed' || task.status === 'failed')) {
        taskStorage.delete(taskId);
      }
    }
  },

  // Get all task IDs (for debugging)
  getAllTaskIds: (): string[] => {
    return Array.from(taskStorage.keys());
  }
};
