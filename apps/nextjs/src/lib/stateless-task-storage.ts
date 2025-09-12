// Stateless task storage using encoded task IDs
// This avoids the need for shared memory or database in Serverless environments

export interface TaskData {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime: number;
}

// Simple encryption for task data (in production, use proper encryption)
function encodeTaskData(data: TaskData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString('base64url');
}

function decodeTaskData(encoded: string): TaskData | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Generate task ID that includes encoded data
export function generateTaskId(initialData: TaskData): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const encodedData = encodeTaskData(initialData);
  return `task_${timestamp}_${random}_${encodedData}`;
}

// Extract data from task ID
export function parseTaskId(taskId: string): TaskData | null {
  try {
    const parts = taskId.split('_');
    if (parts.length !== 4 || parts[0] !== 'task') {
      return null;
    }
    
    const encodedData = parts[3];
    return decodeTaskData(encodedData);
  } catch {
    return null;
  }
}

// Update task data by generating new task ID
export function updateTaskData(oldTaskId: string, updates: Partial<TaskData>): string | null {
  const currentData = parseTaskId(oldTaskId);
  if (!currentData) return null;
  
  const newData = { ...currentData, ...updates };
  return generateTaskId(newData);
}

export const StatelessTaskStorage = {
  create: (data: TaskData) => {
    return generateTaskId(data);
  },

  get: (taskId: string): TaskData | null => {
    const data = parseTaskId(taskId);
    
    // Check if task is expired (older than 1 hour)
    if (data && data.startTime < Date.now() - (60 * 60 * 1000)) {
      return null;
    }
    
    return data;
  },

  // For stateless storage, we return a new task ID with updated data
  update: (taskId: string, updates: Partial<TaskData>): string | null => {
    return updateTaskData(taskId, updates);
  },

  has: (taskId: string): boolean => {
    return parseTaskId(taskId) !== null;
  },

  isExpired: (taskId: string): boolean => {
    const data = parseTaskId(taskId);
    if (!data) return true;
    
    return data.startTime < Date.now() - (60 * 60 * 1000);
  }
};
