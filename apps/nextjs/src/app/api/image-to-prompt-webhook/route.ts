import { env } from "~/env";
import { NextRequest, NextResponse } from "next/server";

// This endpoint will be called by external webhook to process tasks
export async function POST(request: NextRequest) {
  try {
    console.log("Webhook called for background processing");
    
    const body = await request.json();
    const { taskId, fileId, stylePreference } = body;
    
    if (!taskId || !fileId || !stylePreference) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log(`Processing webhook task: ${taskId} with file: ${fileId}`);

    // Process the workflow
    const imageParam = JSON.stringify({ file_id: fileId });
    const workflowPayload = {
      workflow_id: env.COZE_WORKFLOW_ID,
      parameters: {
        "image": imageParam,
        "style_preferenc": stylePreference,
        "user_query": ""
      }
    };

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
      console.error("Workflow failed:", errorText);
      return NextResponse.json(
        { error: `Workflow failed: ${errorText}` },
        { status: 400 }
      );
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
      console.error(`Workflow execution failed: ${errorMessage}`);
      return NextResponse.json(
        { error: `Workflow execution failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    console.log(`Task ${taskId} completed successfully`);
    
    return NextResponse.json({
      success: true,
      taskId,
      prompt: generatedPrompt
    });

  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
