import Link from "next/link";
import Image from "next/image";
import { getDictionary } from "~/lib/get-dictionary";

import { Button } from "@saasfly/ui/button";
import * as Icons from "@saasfly/ui/icons";
import { Card, CardContent } from "@saasfly/ui/card";

import type { Locale } from "~/config/i18n-config";

// Feature data matching ImagePrompt.org structure
const getFeatures = (lang: string) => [
  {
    id: 1,
    icon: Icons.Page,
    title: lang === 'zh' ? "图像转提示词" : "Image to Prompt",
    description: lang === 'zh' ? "将图像转换为提示词来生成你自己的图像" : "Convert Image to Prompt to generate your own image",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    id: 2,
    icon: Icons.Settings,
    title: lang === 'zh' ? "魔法增强" : "Magic Enhance", 
    description: lang === 'zh' ? "将简单文本转换为详细的、描述性的图像提示词" : "Transform simple text into detailed, descriptive image prompt",
    gradient: "from-blue-500 to-purple-500"
  },
  {
    id: 3,
    icon: Icons.Search,
    title: lang === 'zh' ? "AI 图像描述" : "AI Describe Image",
    description: lang === 'zh' ? "让 AI 帮助你理解和详细分析任何图像" : "Let AI help you understand and analyze any image in detail",
    gradient: "from-green-500 to-blue-500"
  },
  {
    id: 4,
    icon: Icons.Blocks,
    title: lang === 'zh' ? "AI 图像生成器" : "AI Image Generator",
    description: lang === 'zh' ? "使用 AI 驱动的生成将你的图像提示词转换为令人惊叹的视觉效果" : "Transform your image prompt into stunning visuals with AI-powered generation",
    gradient: "from-orange-500 to-red-500"
  },
];

export default async function IndexPage({
  params: { lang },
}: {
  params: {
    lang: Locale;
  };
}) {
  const dict = await getDictionary(lang);
  const features = getFeatures(lang);

  // 动态生成多语言标题和描述，匹配 ImagePrompt.org 风格
  const heroTitle = lang === 'zh' 
    ? "创建更好的 AI 艺术"
    : "Create Better AI Art";
  
  const heroSubtitle = lang === 'zh'
    ? "使用 Image Prompt"
    : "with Image Prompt";
  
  const heroDescription = lang === 'zh'
    ? "激发创意，增强图像提示词，创造杰作"
    : "Inspire ideas, Enhance image prompt, Create masterpieces";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-blue-50 dark:from-purple-950 dark:via-purple-900 dark:to-gray-900 relative overflow-hidden">
      {/* 简化的背景装饰元素，更接近 ImagePrompt.org 风格 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30"></div>
      </div>

      {/* 主要内容区域 */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-20 pb-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
              {heroTitle}{" "}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {heroSubtitle}
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              {heroDescription}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link href={`/${lang}/image-to-prompt`}>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                  {lang === 'zh' ? "立即试用 !" : "Try it now !"}
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="px-8 py-4 text-lg font-semibold rounded-full border-2 border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-950 transition-all duration-200"
              >
                {lang === 'zh' ? "教程" : "Tutorials"}
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              const isImageToPrompt = feature.id === 1;
              
              const cardContent = (
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );

              return (
                <div key={feature.id}>
                  {isImageToPrompt ? (
                    <Link href={`/${lang}/image-to-prompt`} className="block">
                      {cardContent}
                    </Link>
                  ) : (
                    cardContent
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Call to Action */}
        <section className="container mx-auto px-4 pb-20 text-center">
          <div className="max-w-2xl mx-auto">
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              <span className="text-gray-500">
                {lang === 'zh' ? "您可能感兴趣：" : "You may be interested in: "}
              </span>
              <Link 
                href="#" 
                className="text-purple-600 hover:text-purple-700 underline decoration-2 underline-offset-4 hover:decoration-purple-700 transition-colors"
              >
                {lang === 'zh' ? "什么是图像提示词？" : "What is an Image Prompt?"}
              </Link>
              <span className="mx-4 text-gray-400">|</span>
              <Link 
                href="#" 
                className="text-purple-600 hover:text-purple-700 underline decoration-2 underline-offset-4 hover:decoration-purple-700 transition-colors"
              >
                {lang === 'zh' ? "如何编写有效的图像提示词？" : "How to Write Effective Image Prompt?"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
