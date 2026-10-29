import Anthropic from "@anthropic-ai/sdk";
import type { Article } from "./feeds";
import { LANG_NAME, NOT_DISCLOSED, type UiLang } from "./i18n.ts";

export type Gravite = "critique" | "elevee" | "moyenne" | "faible";
export type Statut = "resolu" | "en_cours" | "inconnu";

export interface Summary {
  id: string;
  titre: string;
  gravite: Gravite;
  categorie: string;
  cible: string;
  pays: string;
  resume: string;
  comment: string;
  pourquoi: string;
  resolution: string;
  duree: string;
  statut: Statut;
  cyber: boolean;
}

export type ArticleWithText = Article & { fullText?: string };

const NC = NOT_DISCLOSED.fr;

// Analyse complète, faite une seule fois en français.
const ANALYZE_SYSTEM = `Tu es analyste senior en cybersécurité et tu rédiges une veille pour un public non expert.
Les articles viennent du monde entier (français, anglais, turc, arabe, russe) : lis-les dans leur langue d'origine. Tu rédiges la fiche en français.

Ton travail principal est d'ANALYSER chaque incident pour remplir vraiment trois champs : comment, pourquoi, duree.
1. Lis d'abord le texte complet de l'article quand il est fourni.
2. Si l'article ne suffit pas pour comment / pourquoi / resolution / duree et qu'il s'agit d'un vrai incident (gravité moyenne ou plus), utilise l'outil web_search pour trouver d'autres sources : rapports d'éditeurs de sécurité, communiqués de la victime, autorités (CERT, ANSSI, CISA…), autres médias. Ne cherche pas pour les articles non cyber ou purement informatifs.
3. S'il manque encore une information, donne ton analyse d'expert la plus probable en commençant le texte par "Probable : " (ex. "Probable : rançongiciel déployé après vol d'identifiants VPN, mode opératoire habituel de ce groupe."). Ne présente jamais une hypothèse comme un fait.

Champs :
- titre : titre court et clair (max 12 mots).
- gravite : "critique" (impact massif, infrastructures critiques, exploitation active à grande échelle, millions de victimes), "elevee" (organisation importante touchée, fuite de données sensibles, faille activement exploitée), "moyenne" (incident limité, faille sérieuse corrigée), "faible" (conseils, rapports, faits mineurs).
- categorie : un ou deux mots (Ransomware, Fuite de données, Phishing, Vulnérabilité, Espionnage, DDoS, Malware, Arnaque, Arrestation, Réglementation, Rapport, Autre).
- cible : qui est visé (entreprise, secteur, pays).
- pays : pays ou région concernés (ex. France, Turquie, Russie, Moyen-Orient, Mondial).
- resume : 2 phrases simples maximum.
- comment : comment l'attaque a été menée, expliqué simplement : point d'entrée (phishing, faille, mot de passe volé, prestataire compromis…), ce que les attaquants ont fait ensuite. 2 phrases max. Reste général : pas de détails techniques exploitables.
- pourquoi : motivation des attaquants (argent/rançon, revente de données, espionnage d'État, hacktivisme, sabotage…) et, si connu, qui ils sont (groupe, pays présumé). 1-2 phrases.
- resolution : comment les experts ont réagi : détection, isolation des systèmes, correctif, restauration, plainte, intervention des autorités, saisie de serveurs… 2 phrases max.
- duree : chronologie chiffrée. Donne les dates connues (attaque, découverte, annonce, retour à la normale) et calcule les écarts. Ex. "Attaque le 12/10, détectée le 14/10 (2 jours), services rétablis le 20/10 (8 jours)". Si seule la date de révélation est connue : "Révélé le JJ/MM/AAAA, durée non communiquée".
- statut : "resolu", "en_cours" ou "inconnu".
- cyber : true si l'article traite réellement de cybersécurité (attaque, fuite, faille, arnaque en ligne, cybercriminalité, défense), false sinon (produit, jeu vidéo, matériel, actualité militaire classique…). Si false, remplis les autres champs brièvement avec "${NC}" là où ça ne s'applique pas, sans chercher.
Pour un article qui n'est pas un incident (conseil, rapport, loi), adapte les champs et utilise "${NC}" là où ça ne s'applique pas.
Renvoie une fiche par article, avec l'id fourni.`;

const TRANSLATE_SYSTEM = `Tu traduis des fiches de veille cybersécurité rédigées en français.
Traduis tous les champs texte dans la langue cible, de façon naturelle et simple pour un public non expert. Garde exactement le même sens, les mêmes dates et chiffres, et le préfixe "Probable : " traduit dans la langue cible.
La mention "${NC}" doit être remplacée par la mention fournie dans le message.
Ne modifie pas les champs id, gravite, statut et cyber.`;

const fiche = {
  type: "object",
  additionalProperties: false,
  required: ["id", "titre", "gravite", "categorie", "cible", "pays", "resume", "comment", "pourquoi", "resolution", "duree", "statut", "cyber"],
  properties: {
    id: { type: "string" },
    titre: { type: "string" },
    gravite: { type: "string", enum: ["critique", "elevee", "moyenne", "faible"] },
    categorie: { type: "string" },
    cible: { type: "string" },
    pays: { type: "string" },
    resume: { type: "string" },
    comment: { type: "string" },
    pourquoi: { type: "string" },
    resolution: { type: "string" },
    duree: { type: "string" },
    statut: { type: "string", enum: ["resolu", "en_cours", "inconnu"] },
    cyber: { type: "boolean" },
  },
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fiches"],
  properties: { fiches: { type: "array", items: fiche } },
};

export class SummaryError extends Error {}

// Consommation cumulée, pour suivre le coût de chaque passage de l'automatisation.
export const usage = { input: 0, output: 0, searches: 0, requests: 0 };

function makeClient(apiKey: string, workspaceId: string) {
  // Les clés non rattachées à un workspace exigent l'en-tête anthropic-workspace-id.
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
  });
}

async function callForFiches(
  client: Anthropic,
  system: string,
  userContent: string,
  withSearch: boolean,
): Promise<Summary[]> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userContent }];
  try {
    // Avec la recherche web, l'API peut mettre le tour en pause : on renvoie la réponse pour qu'elle continue.
    for (let turn = 0; turn < 5; turn++) {
      const response = await client.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system,
        output_config: { effort: withSearch ? "medium" : "low", format: { type: "json_schema", schema: SCHEMA } },
        tools: withSearch ? [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }] : undefined,
        messages,
      });

      usage.requests++;
      usage.input += response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0);
      usage.output += response.usage.output_tokens;
      usage.searches += response.usage.server_tool_use?.web_search_requests ?? 0;

      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }
      if (response.stop_reason === "refusal") throw new SummaryError("Analyse refusée par le modèle.");
      if (response.stop_reason === "max_tokens") throw new SummaryError("Réponse tronquée.");

      // Le JSON final suit les éventuels résultats de recherche.
      const lastTool = response.content.findLastIndex((b) => b.type === "web_search_tool_result");
      const text = response.content
        .slice(lastTool + 1)
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
      if (!text) throw new SummaryError("Réponse vide.");
      return (JSON.parse(text) as { fiches: Summary[] }).fiches;
    }
    throw new SummaryError("Analyse trop longue, réessaie.");
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new SummaryError("Clé API invalide.");
    if (error instanceof Anthropic.RateLimitError) throw new SummaryError("Trop de requêtes, réessaie dans une minute.");
    if (error instanceof Anthropic.APIError) throw new SummaryError(`Erreur API ${error.status} : ${error.message}`);
    throw error;
  }
}

export async function analyzeBatch(apiKey: string, articles: ArticleWithText[], workspaceId = ""): Promise<Summary[]> {
  const today = new Date().toISOString().slice(0, 10);
  const input = articles
    .map((a) => {
      const body = a.fullText && a.fullText.length > a.excerpt.length ? `Texte complet :\n${a.fullText}` : `Extrait : ${a.excerpt}`;
      return `<article id="${a.id}" source="${a.source}" langue="${a.lang}" date="${a.date.slice(0, 10)}" url="${a.link}">\nTitre : ${a.title}\n${body}\n</article>`;
    })
    .join("\n\n");
  return callForFiches(makeClient(apiKey, workspaceId), ANALYZE_SYSTEM, `Date du jour : ${today}.\n\n${input}`, true);
}

export async function translateBatch(apiKey: string, fiches: Summary[], lang: UiLang, workspaceId = ""): Promise<Summary[]> {
  const instructions = `Langue cible : ${LANG_NAME[lang]}. Mention à utiliser à la place de "${NC}" : "${NOT_DISCLOSED[lang]}".`;
  return callForFiches(
    makeClient(apiKey, workspaceId),
    TRANSLATE_SYSTEM,
    `${instructions}\n\n${JSON.stringify({ fiches })}`,
    false,
  );
}
