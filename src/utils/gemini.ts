import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";

// Cache for GenAI instances to avoid recreating them unnecessarily
const instances: Record<string, GoogleGenAI> = {};

function getKeys(): string[] {
  const keys: string[] = [];
  
  // Scan all process.env variables for any variation of gemini_api_key / gemini_api_keys case-insensitively
  for (const [k, v] of Object.entries(process.env)) {
    if (v && typeof v === 'string' && k.toLowerCase().startsWith('gemini_api_key')) {
      const splitKeys = v.split(',').map(x => x.trim()).filter(x => x.length > 0);
      for (const item of splitKeys) {
        if (!keys.includes(item)) {
          keys.push(item);
        }
      }
    }
  }
  
  return keys;
}

function getGenAIInstance(apiKey: string): GoogleGenAI {
  if (!instances[apiKey]) {
    instances[apiKey] = new GoogleGenAI({ apiKey });
  }
  return instances[apiKey];
}

/**
 * Attempts to generate content by rotating through available API keys on failure.
 */
export async function generateContentWithRotation(
  params: GenerateContentParameters
): Promise<GenerateContentResponse> {
  const keys = getKeys();
  
  if (keys.length === 0) {
    throw new Error("No Gemini API keys found. Please set GEMINI_API_KEY or GEMINI_API_KEYS in your environment.");
  }
  
  let lastError: any = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const ai = getGenAIInstance(key);
    
    try {
      console.log(`[Gemini API] Attempting request using key index ${i + 1}/${keys.length}...`);
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      console.warn(`[Gemini API] Request failed for key index ${i + 1}/${keys.length}. Error: ${error.message}`);
      lastError = error;
      
      // If it's a 429 Too Many Requests, or a 403 quota limit error, we try the next key.
      // If it's a 400 Bad Request (invalid schema, malformed prompt), we should probably fail immediately, 
      // but to be safe, we'll try the next key in case it's a flaky 500 error.
      continue;
    }
  }
  
  throw new Error(`All available Gemini API keys failed. Last error: ${lastError?.message}`);
}
