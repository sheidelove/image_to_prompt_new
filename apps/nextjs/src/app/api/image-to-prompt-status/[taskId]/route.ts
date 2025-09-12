import { NextRequest, NextResponse } from "next/server";

// This should match the storage used in the async API
// In production, use Redis or database
const taskStorage = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime: number;
}>();

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

  const task = taskStorage.get(taskId);
  
  if (!task) {
    return NextResponse.json(
      { error: "Task not found or expired" },
      { status: 404 }
    );
  }

  // Clean up old completed/failed tasks (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (task.startTime < oneHourAgo && (task.status === 'completed' || task.status === 'failed')) {
    taskStorage.delete(taskId);
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
