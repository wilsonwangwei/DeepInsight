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
      const res = await client.messages.create({
        model: options.model || model,
        max_tokens: options.maxTokens || 8192,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
      return {
        text,
        usage: { input: res.usage.input_tokens, output: res.usage.output_tokens },
      };
    },
  };
}

export function createProvider(name = 'claude') {
  const factory = providers[name];
  if (!factory) throw new Error(`Unknown LLM provider: ${name}. Available: ${Object.keys(providers).join(', ')}`);
  return factory();
}
