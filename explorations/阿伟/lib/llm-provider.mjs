import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const providers = {
  claude: createClaudeProvider,
};

function createClaudeProvider() {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

  if (!apiKey) throw new Error('未找到 API Key。请在 explorations/阿伟/.env 中设置 ANTHROPIC_AUTH_TOKEN。');

  const opts = { apiKey };
  if (baseURL) opts.baseURL = baseURL;
  const client = new Anthropic(opts);

  return {
    name: 'claude',
    async generate(prompt, options = {}) {
      const maxRetries = options.maxRetries || 3;
      const timeout = options.timeout || 120000; // 2 分钟
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const res = await client.messages.create({
            model: options.model || model,
            max_tokens: options.maxTokens || 8192,
            messages: [{ role: 'user', content: prompt }],
          }, { signal: controller.signal });

          clearTimeout(timeoutId);

          const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
          return {
            text,
            usage: { input: res.usage.input_tokens, output: res.usage.output_tokens },
          };
        } catch (err) {
          lastError = err;
          const isRetryable = err.name === 'AbortError' ||
                              err.status === 429 ||
                              err.status === 500 ||
                              err.status === 503 ||
                              err.code === 'ECONNRESET';

          if (!isRetryable || attempt === maxRetries) {
            throw new Error(`LLM 调用失败 (尝试 ${attempt}/${maxRetries}): ${err.message || err}`);
          }

          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000); // 指数退避，最大 8s
          console.log(`  重试 ${attempt}/${maxRetries}，等待 ${delay}ms ...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    },
  };
}

export function createProvider(name = 'claude') {
  const factory = providers[name];
  if (!factory) throw new Error(`Unknown LLM provider: ${name}. Available: ${Object.keys(providers).join(', ')}`);
  return factory();
}
