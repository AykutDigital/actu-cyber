// Automatisation : récupère les actus, analyse les nouvelles (en français, avec recherche web),
// traduit dans les 4 autres langues, puis écrit public/data.json pour le site et l'app.
// Lancé toutes les 3 h par GitHub Actions (.github/workflows/update.yml).
import { DOMParser } from "linkedom";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

(globalThis as any).DOMParser = DOMParser;

const { fetchAllFeeds, fetchArticleText } = await import("../src/feeds.ts");
const { analyzeBatch, translateBatch, usage } = await import("../src/summarize.ts");
import type { Article } from "../src/feeds.ts";
import type { Summary } from "../src/summarize.ts";
import type { UiLang } from "../src/i18n.ts";

const OUT = "public/data.json";
const KEEP_DAYS = 10;
const MAX_ANALYSES_PER_RUN = Number(process.env.MAX_ANALYSES ?? 40);
const ANALYZE_BATCH = 4;
const TRANSLATE_BATCH = 10;
const CONCURRENCY = 3;
const OTHER_LANGS: UiLang[] = ["en", "tr", "ar", "ru"];

interface Data {
  updatedAt: string;
  articles: Article[];
  summaries: Partial<Record<UiLang, Record<string, Summary>>>;
}

const apiKey = process.env.ANTHROPIC_API_KEY;
const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID ?? "";
if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");

const started = Date.now();
const data: Data = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf-8"))
  : { updatedAt: "", articles: [], summaries: {} };

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}
const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));
const errors: string[] = [];

// 1. Flux RSS
const { articles: fresh, errors: feedErrors } = await fetchAllFeeds();
errors.push(...feedErrors);
const cutoff = Date.now() - KEEP_DAYS * 86400e3;
const byId = new Map(data.articles.map((a) => [a.id, a]));
for (const a of fresh) if (!byId.has(a.id)) byId.set(a.id, a);
data.articles = [...byId.values()]
  .filter((a) => new Date(a.date).getTime() > cutoff)
  .sort((x, y) => y.date.localeCompare(x.date));
const kept = new Set(data.articles.map((a) => a.id));
for (const lang of Object.keys(data.summaries) as UiLang[]) {
  data.summaries[lang] = Object.fromEntries(Object.entries(data.summaries[lang]!).filter(([id]) => kept.has(id)));
}

// Après le nettoyage ci-dessus (qui remplace les objets), on récupère la référence française.
const fr = (data.summaries.fr ??= {});

// 2. Analyse approfondie (française) des nouveaux articles, les plus récents d'abord
const toAnalyze = data.articles.filter((a) => !fr[a.id]).slice(0, MAX_ANALYSES_PER_RUN);
let analyzed = 0;
await pool(chunk(toAnalyze, ANALYZE_BATCH), CONCURRENCY, async (batch) => {
  try {
    const withText = await Promise.all(batch.map(async (a) => ({ ...a, fullText: await fetchArticleText(a.link) })));
    for (const s of await analyzeBatch(apiKey, withText, workspaceId)) fr[s.id] = s;
    analyzed += batch.length;
  } catch (e) {
    errors.push(`analyse : ${(e as Error).message}`);
  }
});

// 3. Traductions des fiches cyber manquantes
let translated = 0;
for (const lang of OTHER_LANGS) {
  const store = (data.summaries[lang] ??= {});
  const todo = Object.values(fr).filter((s) => s.cyber && !store[s.id]);
  await pool(chunk(todo, TRANSLATE_BATCH), CONCURRENCY, async (batch) => {
    try {
      for (const s of await translateBatch(apiKey, batch, lang, workspaceId)) store[s.id] = s;
      translated += batch.length;
    } catch (e) {
      errors.push(`traduction ${lang} : ${(e as Error).message}`);
    }
  });
}

data.updatedAt = new Date().toISOString();
writeFileSync(OUT, JSON.stringify(data));

// Opus 5.5 : 4 $ / M tokens en entrée, 20 $ / M en sortie ; recherche web : 10 $ / 1000.
const cost = (usage.input * 4 + usage.output * 20) / 1e6 + usage.searches * 0.01;
const cyberCount = Object.values(fr).filter((s) => s.cyber).length;
console.log(`Articles conservés : ${data.articles.length} (dont ${cyberCount} cyber analysés)`);
console.log(`Nouveaux analysés : ${analyzed}/${toAnalyze.length} · fiches traduites : ${translated}`);
console.log(`Requêtes : ${usage.requests} · recherches web : ${usage.searches} · tokens entrée ${usage.input} / sortie ${usage.output}`);
console.log(`Coût estimé de ce passage : ${cost.toFixed(2)} $ · durée ${Math.round((Date.now() - started) / 1000)} s`);
if (errors.length) console.log(`Avertissements (${errors.length}) :\n- ${errors.join("\n- ")}`);
