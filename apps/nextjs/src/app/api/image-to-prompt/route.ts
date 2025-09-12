import { env } from "~/env";
import { NextRequest, NextResponse } from "next/server";

// Configure runtime for extended execution time
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    console.log("Starting image to prompt generation...");
    console.log("Environment check:", {
      hasCozeToken: !!env.COZE_API_TOKEN,
      hasWorkflowId: !!env.COZE_WORKFLOW_ID,
      workflowId: env.COZE_WORKFLOW_ID?.substring(0, 10) + "..." // Log first 10 chars for debugging
    });

    // Check required environment variables
    if (!env.COZE_API_TOKEN || env.COZE_API_TOKEN === "your-coze-api-token-here") {
      console.error("COZE_API_TOKEN not configured properly");
      return NextResponse.json(
        { 
          error: "API configuration missing. Please configure COZE_API_TOKEN in Vercel environment variables.",
          details: "COZE_API_TOKEN is required for image-to-prompt functionality"
        },
        { status: 500 }
      );
    }

    if (!env.COZE_WORKFLOW_ID) {
      console.error("COZE_WORKFLOW_ID not configured");
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
      console.error("No image file provided");
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    console.log("Received file:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    console.log("Style preference:", stylePreference);

    // Step 1: Upload file to Coze
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    console.log("Calling Coze file upload API...");
    const uploadResponse = await fetch("https://api.coze.cn/v1/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.COZE_API_TOKEN}`,
      },
      body: uploadFormData,
    });

    console.log("Upload response status:", uploadResponse.status);
    console.log("Upload response headers:", Object.fromEntries(uploadResponse.headers.entries()));
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Coze file upload failed:", {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });
      return NextResponse.json(
        { 
          error: `File upload failed: ${errorText}`,
          status: uploadResponse.status,
          details: "Check if COZE_API_TOKEN is valid and has file upload permissions"
        },
        { status: 400 }
      );
    }

    const uploadData = await uploadResponse.json();
    console.log("Upload successful, file data:", uploadData);

    const fileId = uploadData.data?.id;
    if (!fileId) {
      console.error("No file ID in upload response");
      return NextResponse.json(
        { error: "No file ID returned from upload" },
        { status: 500 }
      );
    }

    // Use the correct format for file parameter: JSON string with file_id
    const imageParam = JSON.stringify({ file_id: fileId });
    
    console.log("Using image parameter for workflow:", imageParam);

    // Step 2: Call workflow with image and style_preference parameters
    console.log("Calling Coze workflow API...");
    
    // Use the correct format with JSON string containing file_id
    const workflowPayload = {
      workflow_id: env.COZE_WORKFLOW_ID,
      parameters: {
        "image": imageParam,
        "style_preferenc": stylePreference, // Note: Coze workflow expects this exact parameter name (missing 'e')
        "user_query": ""
      }
    };

    console.log("Workflow payload:", JSON.stringify(workflowPayload, null, 2));

    const workflowResponse = await fetch("https://api.coze.cn/v1/workflow/stream_run", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.COZE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workflowPayload),
    });

    console.log("Workflow response status:", workflowResponse.status);
    console.log("Workflow response headers:", Object.fromEntries(workflowResponse.headers.entries()));

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      console.error("Coze workflow failed:", {
        status: workflowResponse.status,
        statusText: workflowResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(workflowResponse.headers.entries()),
        payload: workflowPayload
      });
      return NextResponse.json(
        { 
          error: `Workflow execution failed: ${errorText}`,
          status: workflowResponse.status,
          workflowId: env.COZE_WORKFLOW_ID,
          details: "Check if COZE_WORKFLOW_ID is correct and workflow is published"
        },
        { status: 400 }
      );
    }

    // Handle Server-Sent Events (SSE) streaming response
    const responseText = await workflowResponse.text();
    console.log("Workflow response text:", responseText);

    // Parse SSE format response
    let generatedPrompt = "Generated prompt not found in response";
    let hasError = false;
    let errorMessage = "";
    
    try {
      // Split by lines and process SSE format
      const lines = responseText.split('\n');
      let currentEvent = "";
      let currentData = "";
      
      for (const line of lines) {
        if (line.startsWith('id:')) {
          // New event starting
          currentEvent = "";
          currentData = "";
        } else if (line.startsWith('event:')) {
          currentEvent = line.substring(6).trim();
        } else if (line.startsWith('data:')) {
          currentData = line.substring(5).trim();
          
          try {
            const data = JSON.parse(currentData);
            console.log(`SSE Event: ${currentEvent}, Data:`, JSON.stringify(data, null, 2));
            
            // Check for errors
            if (currentEvent === 'Error' && data.error_message) {
              hasError = true;
              errorMessage = data.error_message;
              console.error("Workflow execution failed:", data.error_message);
              break;
            }
            
            // Check for successful output in various possible locations
            if (data.output) {
              generatedPrompt = data.output;
              console.log("Found output in data.output:", generatedPrompt);
            }
            
            // Check for result field
            if (data.result) {
              generatedPrompt = data.result;
              console.log("Found output in data.result:", generatedPrompt);
            }
            
            // Check for workflow_result
            if (data.workflow_result) {
              generatedPrompt = data.workflow_result;
              console.log("Found output in data.workflow_result:", generatedPrompt);
            }
            
            // Check for content field (which may contain JSON string)
            if (data.content) {
              console.log("Found content field:", data.content);
              try {
                // Try to parse content as JSON
                const contentData = JSON.parse(data.content);
                if (contentData.output) {
                  generatedPrompt = contentData.output;
                  console.log("Found output in parsed content:", generatedPrompt);
                }
              } catch (parseError) {
                // If not JSON, use content directly
                generatedPrompt = data.content;
                console.log("Using content directly:", generatedPrompt);
              }
            }
            
            // Check for node outputs in workflow data
            if (data.node_outputs && Array.isArray(data.node_outputs)) {
              for (const nodeOutput of data.node_outputs) {
                if (nodeOutput.output) {
                  generatedPrompt = nodeOutput.output;
                  console.log("Found output in node_outputs:", generatedPrompt);
                }
                if (nodeOutput.result) {
                  generatedPrompt = nodeOutput.result;
                  console.log("Found result in node_outputs:", generatedPrompt);
                }
              }
            }
            
            // Check for outputs array
            if (data.outputs && Array.isArray(data.outputs)) {
              for (const output of data.outputs) {
                if (output.value || output.content || output.text) {
                  generatedPrompt = output.value || output.content || output.text;
                  console.log("Found output in outputs array:", generatedPrompt);
                }
              }
            }
            
            // Check for any text-like content
            if (typeof data === 'string' && data.trim().length > 0) {
              generatedPrompt = data;
              console.log("Found string data:", generatedPrompt);
            }
            
          } catch (parseError) {
            // Skip invalid JSON data
            continue;
          }
        }
      }
      
      if (hasError) {
        return NextResponse.json(
          { error: `Workflow execution failed: ${errorMessage}` },
          { status: 400 }
        );
      }
      
    } catch (error) {
      console.error("Error parsing SSE response:", error);
      // Fallback: use the raw response text if parsing fails
      generatedPrompt = responseText;
    }

    console.log("Final generated prompt:", generatedPrompt);

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
      fileId: fileId,
    });

  } catch (error) {
    console.error("Error in image-to-prompt API:", error);
    
    // Provide more detailed error information
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}