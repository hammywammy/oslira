import { logger } from './logger.js';
export async function fetchJson<T>(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    const responseText = await response.text();
    if (!responseText.trim()) {
      return {} as T;
    }

    return JSON.parse(responseText);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callWithRetry<T>(
  url: string,
  options: RequestInit,
  retries: number = 3,
  delay: number = 1000,
  timeoutMs: number = 30000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return {} as T;
        }

        const responseText = await res.text();
        if (!responseText.trim()) {
          return {} as T;
        }

        return JSON.parse(responseText);
      } catch (error: any) {
        if (attempt === retries || error.name === 'AbortError') {
          throw error;
        }
        
        logger('warn', `Retry attempt ${attempt}/${retries} failed`, { url, error: error.message });
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }
  
  throw new Error(`All ${retries} attempts failed for ${url}`);
}

export function extractPostThemes(posts: PostData[]): string {
  if (!posts || posts.length === 0) return 'content themes not available';
  
  const allHashtags = posts.flatMap(post => post.hashtags || []);
  const hashtagCounts = allHashtags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topHashtags = Object.entries(hashtagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([tag]) => tag.replace('#', ''));
    
  return topHashtags.length > 0 ? topHashtags.join(', ') : 'content themes not available';
}
