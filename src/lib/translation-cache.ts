import crypto from 'crypto';
import { cacheGet, cacheSet, CACHE_TTL } from './redis';

const TRANSLATION_TTL = 30 * 24 * 60 * 60; // 30 days

export interface CachedTranslation {
  translation: string;
  sourceLang: string;
  targetLang: string;
  cachedAt: string;
  tokensUsed?: number;
}

/**
 * Generate cache key for translation
 */
export function generateTranslationCacheKey(
  text: string,
  sourceLang: string,
  targetLang: string
): string {
  const normalized = text.trim().toLowerCase();
  const hash = crypto
    .createHash('md5')
    .update(normalized)
    .digest('hex')
    .substring(0, 16);
  
  return `translation:${sourceLang}:${targetLang}:${hash}`;
}

/**
 * Get cached translation
 */
export async function getCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<CachedTranslation | null> {
  try {
    const key = generateTranslationCacheKey(text, sourceLang, targetLang);
    const cached = await cacheGet<CachedTranslation>(key);
    
    if (cached) {
      console.log(`[CACHE HIT] Translation: ${sourceLang} → ${targetLang}`);
    }
    
    return cached;
  } catch (error) {
    console.error('[CACHE ERROR] Failed to get cached translation:', error);
    return null;
  }
}

/**
 * Cache translation
 */
export async function setCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  translation: string,
  tokensUsed?: number
): Promise<boolean> {
  try {
    const key = generateTranslationCacheKey(text, sourceLang, targetLang);
    
    const cacheData: CachedTranslation = {
      translation,
      sourceLang,
      targetLang,
      cachedAt: new Date().toISOString(),
      tokensUsed,
    };
    
    const success = await cacheSet(key, cacheData, TRANSLATION_TTL);
    
    if (success) {
      console.log(`[CACHE SET] Translation: ${sourceLang} → ${targetLang} (30 days TTL)`);
    }
    
    return success;
  } catch (error) {
    console.error('[CACHE ERROR] Failed to cache translation:', error);
    return false;
  }
}