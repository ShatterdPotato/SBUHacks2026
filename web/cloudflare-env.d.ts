declare namespace Cloudflare {
  interface Env {
    AI_PROVIDER?: 'gemini' | 'openai';
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    GEMINI_FALLBACK_MODEL?: string;
    GEMINI_DATA_POLICY?: 'unpaid' | 'paid';
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    OPENAI_TRANSCRIBE_MODEL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
