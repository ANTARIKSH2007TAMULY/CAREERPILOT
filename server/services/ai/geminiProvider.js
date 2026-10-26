import env from '../../config/env.js';
import { requestJson } from '../../utils/httpClient.js';
import { safeErrorMessage } from '../../utils/redact.js';
import GeminiKeyManager from './geminiKeyManager.js';
import {
  extractJson,
  truncateInput,
  validateCoachReply,
  validateInterviewPrep,
  validateJobMatch,
  validateResumeAnalysis,
  validateRoadmap,
} from './aiSchemas.js';

class GeminiProvider {
  constructor(
    apiKey = env.geminiApiKey,
    {
      apiKey2 = apiKey === env.geminiApiKey ? env.geminiApiKey2 : '',
      model = env.geminiModel || 'gemini-3.5-flash-lite',
      keyManager = null,
    } = {}
  ) {
    this.keyManager = keyManager || new GeminiKeyManager({ primaryKey: apiKey, secondaryKey: apiKey2 });
    this.model = model;
    this.name = 'gemini';
  }

  isConfigured() {
    return this.keyManager.isConfigured();
  }

  hasDualKeys() {
    return this.keyManager.hasDualKeys();
  }

  async generateJson(prompt, validator) {
    if (!this.isConfigured()) return null;
    const started = Date.now();

    const candidateModels = [
      this.model,
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest',
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    return this.keyManager.executeWithFailover(async (activeKey, keyId) => {
      let lastModelError = null;

      for (const modelToTry of candidateModels) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToTry)}:generateContent`;

        try {
          const response = await requestJson({
            url,
            method: 'POST',
            headers: {
              'x-goog-api-key': activeKey,
            },
            body: {
              contents: [{ role: 'user', parts: [{ text: truncateInput(prompt) }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: env.aiMaxOutputTokens || 2000,
                responseMimeType: 'application/json',
              },
            },
            timeoutMs: 15000,
          });

          const text = response.json?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || '';
          const parsed = extractJson(text);
          const validated = validator(parsed);
          if (!validated) {
            console.warn(`[Gemini:${keyId}] model ${modelToTry} output did not pass schema validation.`);
            continue;
          }

          const usage = response.json?.usageMetadata || {};
          const inputTokens = usage.promptTokenCount || Math.ceil(prompt.length / 4);
          const outputTokens = usage.candidatesTokenCount || Math.ceil(text.length / 4);

          return {
            ...validated,
            provider: this.name,
            meta: {
              provider: this.name,
              model: modelToTry,
              keyUsed: keyId,
              durationMs: Date.now() - started,
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
            },
          };
        } catch (error) {
          lastModelError = error;
          const msg = safeErrorMessage(error);
          console.warn(`[Gemini:${keyId}] model ${modelToTry} failed:`, msg);

          // If quota exceeded or 503, throw to let KeyManager consider key failover
          if (msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('503')) {
            throw error;
          }

          // If permanent auth failure, throw immediately so KeyManager marks key invalid
          if (msg.includes('401') || msg.includes('403') || msg.includes('API key not valid')) {
            throw error;
          }
        }
      }

      if (lastModelError) throw lastModelError;
      return null;
    });
  }

  analyzeJobMatch({ user, job }) {
    const prompt = `You are CareerPilot. Analyze job fit using only the provided candidate profile and target job description. Never invent work history or qualifications. Return JSON with matchScore (number 0-100), strengths[], missingSkills[], recommendations[], summary.
Candidate skills: ${(user?.skills || []).join(', ') || 'none listed'}
Target roles: ${(user?.preferredRoles || []).join(', ') || 'unspecified'}
Job title: ${job?.title || ''}
Company: ${job?.company || ''}
Job skills: ${(job?.skills || []).join(', ') || 'unspecified'}
Description: ${String(job?.description || '').slice(0, 4000)}`;
    return this.generateJson(prompt, validateJobMatch);
  }

  analyzeResume({ user }) {
    const prompt = `You are CareerPilot. Analyze this candidate resume and profile for skill gaps and alignment with early/mid career industry standards. Never invent achievements. Return JSON with strengths[], skillGaps[], suggestions[], summary.
Name: ${user?.name || ''}
Skills: ${(user?.skills || []).join(', ') || 'none listed'}
Experience: ${JSON.stringify(user?.experience || [])}
Education: ${JSON.stringify(user?.education || [])}
Resume text: ${String(user?.resume || '').slice(0, 6000)}`;
    return this.generateJson(prompt, validateResumeAnalysis);
  }

  getCareerRoadmap({ user, goal }) {
    const prompt = `Create a practical learning roadmap for the candidate. Return JSON with title, steps[{title, detail}], summary.
Target Goal: ${goal || user?.preferredRoles?.[0] || 'early-career software role'}
Current skills: ${(user?.skills || []).join(', ') || 'none listed'}`;
    return this.generateJson(prompt, validateRoadmap);
  }

  getInterviewPrep({ user, job, answer }) {
    const prompt = `Prepare technical and behavioral interview practice for this target role. Return JSON with questions[], feedback, focusAreas[].
Target Role: ${job?.title || 'Target Role'}
Company: ${job?.company || ''}
Candidate skills: ${(user?.skills || []).join(', ') || 'none listed'}
Candidate answer: ${answer || 'none yet'}`;
    return this.generateJson(prompt, validateInterviewPrep);
  }

  async getCoachAdvice({ user, message, history = [] }) {
    const formattedHistory = Array.isArray(history) && history.length > 0
      ? `\nRecent conversation:\n${history.slice(-6).map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.text}`).join('\n')}\n`
      : '';

    const prompt = `You are CareerPilot's expert AI career coach. Offer tailored, actionable guidance based exclusively on the candidate's verified profile context. Return JSON with { "answer": "..." }.
Profile skills: ${(user?.skills || []).join(', ') || 'none listed'}
Preferred roles: ${(user?.preferredRoles || []).join(', ') || 'unspecified'}${formattedHistory}
Candidate question: ${message}`;

    return this.generateJson(prompt, validateCoachReply);
  }
}

export default GeminiProvider;
