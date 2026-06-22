import { Hono } from 'hono';
import { classifyIntent } from '@morphius/core';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import type { WorkspaceRecipe } from '@morphius/core';

const app = new Hono();

const RECIPES_DIR = resolve(process.cwd(), '../../recipes');

function loadRecipes(): WorkspaceRecipe[] {
  const recipes: WorkspaceRecipe[] = [];
  if (!existsSync(RECIPES_DIR)) return recipes;

  try {
    const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.recipe.json'));
    for (const file of files) {
      try {
        const raw = JSON.parse(readFileSync(join(RECIPES_DIR, file), 'utf-8'));
        recipes.push(raw as WorkspaceRecipe);
      } catch (err) {
        console.warn(`[Workspace] Failed to load recipe ${file}:`, err);
      }
    }
  } catch (err) {
    console.warn('[Workspace] Failed to read recipes dir:', err);
  }
  return recipes;
}

// GET /api/workspace/recipes
app.get('/recipes', (c) => {
  const recipes = loadRecipes();
  return c.json({ recipes, total: recipes.length });
});

// GET /api/workspace/recipe/:id
app.get('/recipe/:id', (c) => {
  const id = c.req.param('id');
  const recipes = loadRecipes();
  const recipe = recipes.find((r) => r.id === id);
  if (!recipe) {
    return c.json({ error: `Recipe "${id}" not found` }, 404);
  }
  return c.json(recipe);
});

// POST /api/workspace/classify
app.post('/classify', async (c) => {
  let body: { input?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const input = body.input?.trim();
  if (!input) {
    return c.json({ error: 'Missing "input" field' }, 400);
  }

  const result = classifyIntent(input);
  return c.json(result);
});

export default app;
