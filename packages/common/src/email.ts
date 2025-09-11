import { Resend } from "resend";

import { env } from "./env.mjs";

// 在构建时如果环境变量缺失，使用一个虚拟的 API 密钥
const resendApiKey = process.env.SKIP_ENV_VALIDATION 
  ? "re_dummy_key_for_build" 
  : env.RESEND_API_KEY;

export const resend = new Resend(resendApiKey);
