import { getDictionary } from "~/lib/get-dictionary";
import { ImageToPromptTool } from "~/components/image-to-prompt-tool";

import type { Locale } from "~/config/i18n-config";

export default async function ImageToPromptPage({
  params: { lang },
}: {
  params: {
    lang: Locale;
  };
}) {
  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-blue-50 dark:from-purple-950 dark:via-purple-900 dark:to-gray-900 relative overflow-hidden">
      {/* 简化的背景装饰元素 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30"></div>
      </div>

      {/* 主要内容区域 */}
      <div className="relative z-10">
        {/* Header Section */}
        <section className="container mx-auto px-4 pt-20 pb-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
              {lang === 'zh' ? (
                <>
                  免费图像转提示词生成器
                </>
              ) : (
                <>
                  Free Image to Prompt Generator
                </>
              )}
            </h1>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              {lang === 'zh' 
                ? "将图像转换为提示词，生成你自己的图像"
                : "Convert Image to Prompt to generate your own image"
              }
            </p>
          </div>
        </section>

        {/* Tool Section */}
        <section className="container mx-auto px-4 pb-20">
          <ImageToPromptTool lang={lang} />
        </section>
      </div>
    </div>
  );
}
