import { env } from "~/env";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Debug API called");
    
    // Check environment variables (without exposing sensitive data)
    const envCheck = {
      NODE_ENV: env.NODE_ENV,
      hasCozeToken: !!env.COZE_API_TOKEN,
      cozeTokenLength: env.COZE_API_TOKEN?.length || 0,
      hasWorkflowId: !!env.COZE_WORKFLOW_ID,
      workflowId: env.COZE_WORKFLOW_ID?.substring(0, 10) + "..." || "not set",
      hasAppUrl: !!env.NEXT_PUBLIC_APP_URL,
      appUrl: env.NEXT_PUBLIC_APP_URL || "not set"
    };
    
    console.log("Environment check:", envCheck);
    
    // Test basic Coze API connectivity (without uploading files)
    let cozeApiTest = { available: false, error: null };
    
    if (env.COZE_API_TOKEN) {
      try {
        console.log("Testing Coze API connectivity...");
        const testResponse = await fetch("https://api.coze.cn/v1/workspace/list", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${env.COZE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        });
        
        console.log("Coze API test response status:", testResponse.status);
        
        if (testResponse.ok) {
          cozeApiTest.available = true;
        } else {
          const errorText = await testResponse.text();
          cozeApiTest.error = `HTTP ${testResponse.status}: ${errorText}`;
        }
      } catch (error) {
        cozeApiTest.error = error instanceof Error ? error.message : String(error);
      }
    } else {
      cozeApiTest.error = "COZE_API_TOKEN not configured";
    }
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      cozeApi: cozeApiTest,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
