import { NextRequest, NextResponse } from "next/server";
import { TaskStorage } from "~/lib/task-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;

  if (!taskId) {
    return NextResponse.json(
      { error: "Task ID is required" },
      { status: 400 }
    );
  }

  console.log(`Checking status for task: ${taskId}`);
  console.log(`Available tasks: ${TaskStorage.getAllTaskIds().join(', ')}`);

  const task = TaskStorage.get(taskId);
  
  if (!task) {
    return NextResponse.json(
      { 
        error: "Task not found or expired",
        taskId,
        availableTasks: TaskStorage.getAllTaskIds()
      },
      { status: 404 }
    );
  }

  // Clean up old completed/failed tasks (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (task.startTime < oneHourAgo && (task.status === 'completed' || task.status === 'failed')) {
    TaskStorage.delete(taskId);
    return NextResponse.json(
      { error: "Task expired" },
      { status: 410 }
    );
  }

  return NextResponse.json({
    taskId,
    status: task.status,
    result: task.result,
    error: task.error,
    elapsedTime: Date.now() - task.startTime
  });
}
