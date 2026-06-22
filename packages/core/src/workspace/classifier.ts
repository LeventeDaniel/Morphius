export type RecipeId = 'chat' | 'research' | 'benchmark' | 'prompt-cleanup' | 'tool-debug';

interface ClassifyResult {
  recipeId: RecipeId;
  confidence: number;
  matchedKeywords: string[];
}

const KEYWORD_MAP: Array<{ keywords: string[]; recipeId: RecipeId }> = [
  {
    keywords: ['search', 'find', 'research', 'look up', 'lookup', 'investigate', 'explore', 'discover'],
    recipeId: 'research',
  },
  {
    keywords: ['benchmark', 'compare', 'test model', 'evaluate', 'measure', 'performance test', 'rank'],
    recipeId: 'benchmark',
  },
  {
    keywords: ['clean', 'fix prompt', 'improve prompt', 'rewrite', 'polish', 'refine', 'edit prompt', 'enhance'],
    recipeId: 'prompt-cleanup',
  },
  {
    keywords: ['debug', 'tool', 'run tool', 'inspect', 'diagnose', 'trace', 'check tool', 'test tool'],
    recipeId: 'tool-debug',
  },
];

export function classifyIntent(input: string): ClassifyResult {
  const lower = input.toLowerCase().trim();
  const scores: Map<RecipeId, { score: number; keywords: string[] }> = new Map();

  for (const { keywords, recipeId } of KEYWORD_MAP) {
    const matched: string[] = [];
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        matched.push(kw);
      }
    }
    if (matched.length > 0) {
      const existing = scores.get(recipeId);
      if (existing) {
        existing.score += matched.length;
        existing.keywords.push(...matched);
      } else {
        scores.set(recipeId, { score: matched.length, keywords: matched });
      }
    }
  }

  if (scores.size === 0) {
    return { recipeId: 'chat', confidence: 0.5, matchedKeywords: [] };
  }

  // Find highest score
  let bestId: RecipeId = 'chat';
  let bestScore = 0;
  let bestKeywords: string[] = [];

  for (const [id, { score, keywords }] of scores.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
      bestKeywords = keywords;
    }
  }

  // Confidence: scale score to 0.6-0.95 range
  const confidence = Math.min(0.95, 0.6 + bestScore * 0.1);

  return { recipeId: bestId, confidence, matchedKeywords: bestKeywords };
}
