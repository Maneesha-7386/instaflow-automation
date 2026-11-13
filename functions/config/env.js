/**
 * Backend Environment Configuration Loader
 * Reads strictly from functions/.env on the server. Never exposes raw secrets to clients.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const isPlaceholder = (val) =>
  !val ||
  val.startsWith('YOUR_') ||
  val.includes('your-app-id');

const envConfig = {
  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    redirectUri: process.env.META_REDIRECT_URI || 'http://localhost:5173/auth/meta/callback',
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
    graphApiVersion: process.env.META_GRAPH_API_VERSION || 'v19.0',
  },
  security: {
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    imageApiKey: process.env.AI_IMAGE_API_KEY || '',
    ttsApiKey: process.env.AI_TTS_API_KEY || '',
  },
  cors: {
    allowedOrigin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  },
};

function getSafeEnvDiagnostics() {
  return {
    hasMetaAppId: !isPlaceholder(envConfig.meta.appId),
    hasMetaAppSecret: !isPlaceholder(envConfig.meta.appSecret),
    hasMetaWebhookVerifyToken: !isPlaceholder(envConfig.meta.webhookVerifyToken),
    hasTokenEncryptionKey: !isPlaceholder(envConfig.security.tokenEncryptionKey),
    hasGeminiKey: !isPlaceholder(envConfig.ai.geminiApiKey),
    hasImageAiKey: !isPlaceholder(envConfig.ai.imageApiKey),
    hasTtsKey: !isPlaceholder(envConfig.ai.ttsApiKey),
    graphApiVersion: envConfig.meta.graphApiVersion,
  };
}

module.exports = {
  envConfig,
  getSafeEnvDiagnostics,
};

