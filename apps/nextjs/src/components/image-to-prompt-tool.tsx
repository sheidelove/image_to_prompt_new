"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Card, CardContent } from "@saasfly/ui/card";
import { Button } from "@saasfly/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@saasfly/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@saasfly/ui/select";
import { Input } from "@saasfly/ui/input";
import { Label } from "@saasfly/ui/label";
import * as Icons from "@saasfly/ui/icons";

interface ImageToPromptToolProps {
  lang: string;
}

type AIModel = {
  id: string;
  name: string;
  description: string;
};

export function ImageToPromptTool({ lang }: ImageToPromptToolProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedModel, setSelectedModel] = useState("general");
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI 模型选项
  const aiModels: AIModel[] = [
    {
      id: "general",
      name: lang === 'zh' ? "通用图像提示词" : "General Image Prompt",
      description: lang === 'zh' ? "图像的自然语言描述" : "Natural language description of the image"
    },
    {
      id: "flux",
      name: "Flux",
      description: lang === 'zh' ? "为最先进的 Flux AI 模型优化，简洁自然的语言" : "Optimized for state-of-the-art Flux AI models, concise natural language"
    },
    {
      id: "midjourney", 
      name: "Midjourney",
      description: lang === 'zh' ? "专为 Midjourney 生成定制，带有 Midjourney 参数" : "Tailored for Midjourney generation with Midjourney parameters"
    },
    {
      id: "stable-diffusion",
      name: "Stable Diffusion", 
      description: lang === 'zh' ? "为 Stable Diffusion 模型格式化" : "Formatted for Stable Diffusion models"
    }
  ];

  // 语言选项 - 目前只支持英文输出
  const languageOptions = [
    { value: "english", label: "English" }
  ];

  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleUrlSubmit = async () => {
    if (imageUrl) {
      try {
        // Use a proxy to fetch the image to avoid CORS issues
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(imageUrl)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        const blob = await response.blob();
        const file = new File([blob], "image_from_url.jpg", { type: blob.type });
        handleFileUpload(file);
        setImageUrl("");
      } catch (error) {
        console.error("Error fetching image from URL:", error);
        // You might want to show an error message to the user here
      }
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    const maxAttempts = 120; // 2 minutes max (2 seconds * 120)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/image-to-prompt-status/${taskId}`);
        
        if (!response.ok) {
          throw new Error("Failed to check task status");
        }

        const data = await response.json();
        
        if (data.status === 'completed') {
          setGeneratedPrompt(data.result.prompt);
          return;
        } else if (data.status === 'failed') {
          throw new Error(data.error || "Task failed");
        }
        
        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        
      } catch (error) {
        console.error("Error polling task status:", error);
        throw error;
      }
    }
    
    throw new Error("Task timed out");
  };

  const handleGeneratePrompt = async () => {
    if (!imageFile) return;
    
    setIsGenerating(true);
    setGeneratedPrompt("");

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("style_preference", selectedModel);

      // Try async version first
      const response = await fetch("/api/image-to-prompt-async", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // If async fails, fall back to original API
        console.log("Async API failed, falling back to sync...");
        const syncResponse = await fetch("/api/image-to-prompt", {
          method: "POST",
          body: formData,
        });

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json();
          throw new Error(errorData.error || "Failed to generate prompt");
        }

        const syncData = await syncResponse.json();
        setGeneratedPrompt(syncData.prompt);
        return;
      }

      const data = await response.json();
      
      if (data.taskId) {
        // Async processing started, poll for results
        setGeneratedPrompt(lang === 'zh' ? "正在生成提示词，请稍候..." : "Generating prompt, please wait...");
        await pollTaskStatus(data.taskId);
      } else {
        throw new Error("No task ID returned");
      }

    } catch (error) {
      console.error("Failed to generate prompt:", error);
      setGeneratedPrompt(lang === 'zh' ? "生成失败，请重试。" : "Failed to generate prompt. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Tabs defaultValue="image-to-prompt" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
          <TabsTrigger value="image-to-prompt" className="flex items-center gap-2">
            <Icons.Page className="w-4 h-4" />
            {lang === 'zh' ? "图像转提示词" : "Image to Prompt"}
          </TabsTrigger>
          <TabsTrigger value="text-to-prompt" className="flex items-center gap-2">
            <Icons.Post className="w-4 h-4" />
            {lang === 'zh' ? "文本转提示词" : "Text to Prompt"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image-to-prompt" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：图像上传区域 */}
            <div className="space-y-6">
              {/* 上传按钮和URL输入 */}
              <div className="flex gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Icons.Add className="w-4 h-4 mr-2" />
                  {lang === 'zh' ? "上传图像" : "Upload Image"}
                </Button>
                
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder={lang === 'zh' ? "输入图像URL" : "Input Image URL"}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUrlSubmit}
                    variant="outline"
                    disabled={!imageUrl}
                  >
                    {lang === 'zh' ? "确认" : "Submit"}
                  </Button>
                </div>
              </div>

              {/* 拖拽上传区域 */}
              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-2 border-dashed border-purple-300 dark:border-purple-600">
                <CardContent className="p-0">
                  <div
                    className={`relative h-64 flex flex-col items-center justify-center text-center p-6 transition-all duration-200 ${
                      isDragOver ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500' : ''
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Icons.Page className="w-12 h-12 text-purple-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {lang === 'zh' ? "上传照片或拖拽放置" : "Upload a photo or drag and drop"}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lang === 'zh' ? "PNG, JPG, 或 WEBP 最大 4MB" : "PNG, JPG, or WEBP up to 4MB"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* 右侧：图像预览区域 */}
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-medium text-gray-900 dark:text-white">
                  {lang === 'zh' ? "图像预览" : "Image Preview"}
                </Label>
              </div>
              
              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                    {selectedImage ? (
                      <img
                        src={selectedImage}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    ) : (
                      <div className="text-center">
                        <Icons.Page className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">
                          {lang === 'zh' ? "你的图像将显示在这里" : "Your image will show here"}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AI 模型选择 */}
          <div className="space-y-4">
            <Label className="text-lg font-medium text-gray-900 dark:text-white">
              {lang === 'zh' ? "选择 AI 模型" : "Select AI Model"}
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {aiModels.map((model) => (
                <Card 
                  key={model.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedModel === model.id
                      ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-800'
                  } backdrop-blur-sm`}
                  onClick={() => setSelectedModel(model.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        selectedModel === model.id 
                          ? 'border-purple-500 bg-purple-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedModel === model.id && (
                          <Icons.Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                          {model.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {model.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 语言选择和生成按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                {lang === 'zh' ? "提示词语言" : "Prompt Language"}
              </Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={handleGeneratePrompt}
              disabled={!imageFile || isGenerating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 font-semibold"
            >
              {isGenerating ? (
                <>
                  <Icons.Settings className="w-4 h-4 mr-2 animate-spin" />
                  {lang === 'zh' ? "生成中..." : "Generating..."}
                </>
              ) : (
                <>
                  <Icons.Settings className="w-4 h-4 mr-2" />
                  {lang === 'zh' ? "生成提示词" : "Generate Prompt"}
                </>
              )}
            </Button>
          </div>

          {/* 生成的提示词结果 */}
          {generatedPrompt && (
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Label className="text-lg font-medium text-gray-900 dark:text-white">
                    {lang === 'zh' ? "生成的提示词" : "Generated Prompt"}
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                  >
                    <Icons.Copy className="w-4 h-4 mr-2" />
                    {lang === 'zh' ? "复制" : "Copy"}
                  </Button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[100px]">
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    {generatedPrompt}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="text-to-prompt" className="space-y-6">
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Icons.Settings className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                {lang === 'zh' ? "文本转提示词功能" : "Text to Prompt Feature"}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {lang === 'zh' ? "此功能正在开发中，敬请期待！" : "This feature is under development. Coming soon!"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
