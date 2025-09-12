import { env } from "~/env";
import { NextRequest, NextResponse } from "next/server";

// In-memory storage for task status (in production, use Redis or database)
const taskStorage = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime: number;
}>();

export async function POST(request: NextRequest) {
  try {
    console.log("Starting async image to prompt generation...");

    // Check required environment variables
    if (!env.COZE_API_TOKEN || env.COZE_API_TOKEN === "your-coze-api-token-here") {
      return NextResponse.json(
        { 
          error: "API configuration missing. Please configure COZE_API_TOKEN in Vercel environment variables.",
          details: "COZE_API_TOKEN is required for image-to-prompt functionality"
        },
        { status: 500 }
      );
    }

    if (!env.COZE_WORKFLOW_ID) {
      return NextResponse.json(
        { 
          error: "API configuration missing. Please configure COZE_WORKFLOW_ID in Vercel environment variables.",
          details: "COZE_WORKFLOW_ID is required for workflow execution"
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;
    const stylePreference = formData.get("style_preference") as string || "detailed";

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Generate a unique task ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log("Created task:", taskId);

    // Initialize task status
    taskStorage.set(taskId, {
      status: 'pending',
      startTime: Date.now()
    });

    // Start async processing (don't await)
    processImageAsync(taskId, file, stylePreference).catch(error => {
      console.error("Async processing failed:", error);
      taskStorage.set(taskId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        startTime: Date.now()
      });
    });

    // Return task ID immediately
    return NextResponse.json({
      success: true,
      taskId,
      message: "Task started. Use the taskId to check status.",
      statusUrl: `/api/image-to-prompt-status/${taskId}`
    });

  } catch (error) {
    console.error("Error in async image-to-prompt API:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : String(error),
        details: "Failed to start async task"
      },
      { status: 500 }
    );
  }
}

async function processImageAsync(taskId: string, file: File, stylePreference: string) {
  try {
    console.log(`Processing task ${taskId} - Starting file upload...`);
    
    // Update status to processing
    taskStorage.set(taskId, {
      status: 'processing',
      startTime: Date.now()
    });

    // Step 1: Upload file to Coze
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    const uploadResponse = await fetch("https://api.coze.cn/v1/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.COZE_API_TOKEN}`,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`File upload failed: ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.data?.id;
    
    if (!fileId) {
      throw new Error("No file ID returned from upload");
    }

    console.log(`Task ${taskId} - File uploaded, ID: ${fileId}`);

    // Step 2: Call workflow
    const imageParam = JSON.stringify({ file_id: fileId });
    const workflowPayload = {
      workflow_id: env.COZE_WORKFLOW_ID,
      parameters: {
        "image": imageParam,
        "style_preferenc": stylePreference, // Note: Coze workflow expects this exact parameter name
        "user_query": ""
      }
    };

    console.log(`Task ${taskId} - Calling workflow...`);

    const workflowResponse = await fetch("https://api.coze.cn/v1/workflow/stream_run", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.COZE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workflowPayload),
    });

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      throw new Error(`Workflow execution failed: ${errorText}`);
    }

    // Process SSE response
    const responseText = await workflowResponse.text();
    let generatedPrompt = "Generated prompt not found in response";
    let hasError = false;
    let errorMessage = "";
    
    const lines = responseText.split('\n');
    let currentEvent = "";
    let currentData = "";
    
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        currentData = line.substring(5).trim();
        
        try {
          const data = JSON.parse(currentData);
          
          if (currentEvent === 'Error' && data.error_message) {
            hasError = true;
            errorMessage = data.error_message;
            break;
          }
          
          // Extract prompt from various possible fields
          if (data.output) {
            generatedPrompt = data.output;
          } else if (data.result) {
            generatedPrompt = data.result;
          } else if (data.content) {
            try {
              const contentData = JSON.parse(data.content);
              if (contentData.output) {
                generatedPrompt = contentData.output;
              }
            } catch {
              generatedPrompt = data.content;
            }
          }
        } catch {
          continue;
        }
      }
    }
    
    if (hasError) {
      throw new Error(`Workflow execution failed: ${errorMessage}`);
    }

    console.log(`Task ${taskId} - Completed successfully`);

    // Update task with result
    taskStorage.set(taskId, {
      status: 'completed',
      result: {
        prompt: generatedPrompt,
        fileId: fileId
      },
      startTime: Date.now()
    });

  } catch (error) {
    console.error(`Task ${taskId} failed:`, error);
    taskStorage.set(taskId, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      startTime: Date.now()
    });
  }
}

// GET endpoint to check task status
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const taskId = url.searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json(
      { error: "Task ID is required" },
      { status: 400 }
    );
  }

  const task = taskStorage.get(taskId);
  
  if (!task) {
    return NextResponse.json(
      { error: "Task not found" },
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
