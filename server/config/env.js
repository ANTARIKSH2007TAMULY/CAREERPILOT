import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env'),
];

for (const envPath of candidatePaths) {
  dotenv.config({ path: envPath });
}

export default {
  port: Number(process.env.PORT) || 5001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careerpilot',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  grokApiKey: process.env.GROK_API_KEY || '',
  adzunaAppId: process.env.ADZUNA_APP_ID || '',
  adzunaAppKey: process.env.ADZUNA_APP_KEY || '',
};
