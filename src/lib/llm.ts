import OpenAI from 'openai';

export const MODELS = {
  fast: 'gpt-4o-mini',   // researcher — speed + cost
  main: 'gpt-4o',        // writer, repair, refine
} as const;

const DEFAULT_MAX_TOKENS = 8096;

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not set. Copy .env.example to .env and add your token.');
    _client = new OpenAI({
      baseURL: 'https://api.githubcopilot.com',
      apiKey: process.env.GITHUB_TOKEN,
    });
  }
  return _client;
}

export async function llmCall(
  system: string,
  user: string,
  options: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  const { model = MODELS.main, maxTokens = DEFAULT_MAX_TOKENS } = options;
  const response = await getClient().chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from model');
  return content;
}
