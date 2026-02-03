export interface TranslateOptions {
  source?: string; 
  endpoint?: string;
  apiKey?: string;
  ttlMs?: number;
}

const DEFAULT_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days

function cacheKey(text: string, target: string, source?: string) {
  const raw = `${source || 'auto'}::${target}::${text}`;
  // Simple hash to avoid huge keys
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h << 5) - h + raw.charCodeAt(i);
    h |= 0;
  }
  return `lt_cache_${h}`;
}

export async function translateText(text: string, target: string, opts: TranslateOptions = {}): Promise<string> {
  try {
    const source = opts.source ?? 'auto';
    const endpoint = opts.endpoint ?? (import.meta?.env?.VITE_TRANSLATE_ENDPOINT as string) ?? '/api/translate';
    const apiKey = opts.apiKey ?? (import.meta?.env?.VITE_TRANSLATE_API_KEY as string) ?? undefined;
    const ttlMs = opts.ttlMs ?? DEFAULT_TTL;

    if (!text || !target) return text;

    const key = cacheKey(text, target, source);
    const now = Date.now();
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { v, exp } = JSON.parse(cached);
        if (!exp || exp > now) return v as string;
      }
    } catch (e) {
      console.debug('translate cache read failed');
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text', api_key: apiKey })
    });

    if (!res.ok) {
      // On failure, return original text
      return text;
    }
    const data = await res.json();
    const translated: string = data?.translatedText ?? text;

    try {
      localStorage.setItem(key, JSON.stringify({ v: translated, exp: now + ttlMs }));
    } catch (e) {
      console.debug('translate cache write failed');
    }

    return translated;
  } catch (e) {
    return text;
  }
}
