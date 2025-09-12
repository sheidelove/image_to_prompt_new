import { db } from "@saasfly/db";

export interface TaskData {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime: number;
}

export const DbTaskStorage = {
  async create(taskId: string, data: TaskData): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      await db
        .insertInto('AsyncTask')
        .values({
          taskId,
          status: data.status.toUpperCase() as any,
          result: data.result ? JSON.stringify(data.result) : null,
          error: data.error || null,
          metadata: JSON.stringify({ startTime: data.startTime }),
          expiresAt,
        })
        .execute();
        
      console.log(`Task ${taskId} created in database`);
    } catch (error) {
      console.error(`Failed to create task ${taskId}:`, error);
      throw error;
    }
  },

  async update(taskId: string, data: Partial<TaskData>): Promise<void> {
    try {
      const updateData: any = {};
      
      if (data.status) {
        updateData.status = data.status.toUpperCase();
      }
      
      if (data.result !== undefined) {
        updateData.result = data.result ? JSON.stringify(data.result) : null;
      }
      
      if (data.error !== undefined) {
        updateData.error = data.error || null;
      }

      await db
        .updateTable('AsyncTask')
        .set(updateData)
        .where('taskId', '=', taskId)
        .execute();
        
      console.log(`Task ${taskId} updated in database`);
    } catch (error) {
      console.error(`Failed to update task ${taskId}:`, error);
      throw error;
    }
  },

  async get(taskId: string): Promise<TaskData | null> {
    try {
      const task = await db
        .selectFrom('AsyncTask')
        .selectAll()
        .where('taskId', '=', taskId)
        .executeTakeFirst();

      if (!task) {
        console.log(`Task ${taskId} not found in database`);
        return null;
      }

      // Check if task is expired
      if (task.expiresAt < new Date()) {
        console.log(`Task ${taskId} has expired, deleting...`);
        await this.delete(taskId);
        return null;
      }

      const metadata = task.metadata ? JSON.parse(task.metadata) : {};
      
      return {
        status: task.status.toLowerCase() as any,
        result: task.result ? JSON.parse(task.result) : undefined,
        error: task.error || undefined,
        startTime: metadata.startTime || Date.now(),
      };
    } catch (error) {
      console.error(`Failed to get task ${taskId}:`, error);
      return null;
    }
  },

  async delete(taskId: string): Promise<boolean> {
    try {
      const result = await db
        .deleteFrom('AsyncTask')
        .where('taskId', '=', taskId)
        .execute();
        
      console.log(`Task ${taskId} deleted from database`);
      return result.length > 0;
    } catch (error) {
      console.error(`Failed to delete task ${taskId}:`, error);
      return false;
    }
  },

  async has(taskId: string): Promise<boolean> {
    try {
      const task = await db
        .selectFrom('AsyncTask')
        .select('taskId')
        .where('taskId', '=', taskId)
        .executeTakeFirst();
        
      return !!task;
    } catch (error) {
      console.error(`Failed to check task ${taskId}:`, error);
      return false;
    }
  },

  async cleanup(): Promise<void> {
    try {
      const result = await db
        .deleteFrom('AsyncTask')
        .where('expiresAt', '<', new Date())
        .execute();
        
      console.log(`Cleaned up ${result.length} expired tasks`);
    } catch (error) {
      console.error('Failed to cleanup expired tasks:', error);
    }
  },

  async getAllTaskIds(): Promise<string[]> {
    try {
      const tasks = await db
        .selectFrom('AsyncTask')
        .select('taskId')
        .where('expiresAt', '>', new Date())
        .execute();
        
      return tasks.map(task => task.taskId);
    } catch (error) {
      console.error('Failed to get all task IDs:', error);
      return [];
    }
  }
};
