"use client";

import { useState } from "react";
import { Button } from "@saasfly/ui/button";

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug");
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      setDebugInfo({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Debug Information</h1>
      
      <div className="mb-6">
        <Button onClick={runDebug} disabled={loading}>
          {loading ? "Running Debug..." : "Run Debug Check"}
        </Button>
      </div>

      {debugInfo && (
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">
        <h3 className="font-semibold mb-2">Troubleshooting Steps:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Check if COZE_API_TOKEN is configured in Vercel environment variables</li>
          <li>Verify COZE_WORKFLOW_ID is set correctly</li>
          <li>Test Coze API connectivity</li>
          <li>Check Vercel function logs for detailed error messages</li>
        </ol>
      </div>
    </div>
  );
}
