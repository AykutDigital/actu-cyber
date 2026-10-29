import "./style.css";
import { Capacitor } from "@capacitor/core";
import type { Article } from "./feeds";
import type { Gravite, Summary } from "./summarize";
import { NOT_DISCLOSED, T, UI_LANGS, type UiLang } from "./i18n";

// Les fiches sont produites toutes les 3 h par l'automatisation (scripts/update.ts)
// et publiées avec le site. L'app Android lit le même fichier en ligne.
const DATA_URL = Capacitor.isNativePlatform() ? "https://aykutdigital.github.io/actu-cyber/data.json" : "./data.json";
const GRAVITES: Gravite[] = ["critique", "elevee", "moyenne", "faible"];

interface Data {
  updatedAt: string;
  articles: Article[];
  summaries: Partial<Record<UiLang, Record<string, Summary>>>;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage plein ou indisponible */
  }
}

let data: Data = load("data", { updatedAt: "", articles: [], summaries: {} });
let uiLang: UiLang = load("uiLang", "fr");
let filter: Gravite | "all" = "all";
let query = "";
let loading = false;
let failed = false;

const app = document.querySelector<HTMLDivElement>("#app")!;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => T[uiLang];

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function relDate(iso: string): string {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3.6e6);
  if (h < 1) return t().now;
  if (h < 24) return t().hoursAgo(h);
  const d = Math.round(h / 24);
  return d === 1 ? t().yesterday : t().daysAgo(d);
}

function renderStatus() {
  const s = t();
  const parts: string[] = [];
  if (loading) parts.push(s.fetching);
  if (data.updatedAt) parts.push(`${s.updated} ${relDate(data.updatedAt)}`);
  if (failed) parts.push(s.offline);
  $("status").textContent = parts.join(" · ");
}

function renderShell() {
  const s = t();
  document.documentElement.lang = uiLang;
  document.documentElement.dir = uiLang === "ar" ? "rtl" : "ltr";
  document.title = s.title;
  app.innerHTML = `
    <header>
      <div class="top">
        <h1>${s.title}</h1>
        <div class="actions">
          <button id="refresh" aria-label="↻" class="${loading ? "spin" : ""}">↻</button>
        </div>
      </div>
      <nav id="langs">
        ${UI_LANGS.map((l) => `<button data-l="${l.code}" class="${l.code === uiLang ? "on" : ""}">${l.label}</button>`).join("")}
      </nav>
      <input id="search" type="search" placeholder="${esc(s.search)}" value="${esc(query)}" />
      <nav id="filters">
        <button data-f="all" class="${filter === "all" ? "on" : ""}">${s.all}</button>
        ${GRAVITES.map((g) => `<button data-f="${g}" class="${filter === g ? "on" : ""}">${s[g]}</button>`).join("")}
      </nav>
      <p id="status"></p>
    </header>
    <main id="list"></main>
  `;
  bindEvents();
  renderStatus();
}

function card(a: Article, s: Summary): string {
  const tr = t();
  const meta = `<span class="lang">${(a.lang ?? "en").toUpperCase()}</span><span>${esc(a.source)}</span><span>${relDate(a.date)}</span>`;
  const row = (label: string, value: string) => `<div class="row-d"><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
  const pays = s.pays && s.pays !== NOT_DISCLOSED[uiLang] ? `<span class="pays">📍 ${esc(s.pays)}</span>` : "";
  return `<article class="card g-${s.gravite}">
    <div class="meta"><span class="badge">${tr[s.gravite]}</span><span class="cat">${esc(s.categorie)}</span>${pays}${meta}</div>
    <h3>${esc(s.titre)}</h3>
    <p class="resume">${esc(s.resume)}</p>
    <details>
      <summary>${tr.details}</summary>
      <dl>
        ${row(tr.cible, s.cible)}
        ${row(tr.comment, s.comment)}
        ${row(tr.pourquoi, s.pourquoi)}
        ${row(tr.resolution, s.resolution)}
        ${row(tr.duree, s.duree)}
        ${row(tr.statut, tr[s.statut] ?? s.statut)}
      </dl>
      <a href="${esc(a.link)}" target="_blank" rel="noopener">${tr.source} (${esc(a.source)}) →</a>
    </details>
  </article>`;
}

function render() {
  const q = query.toLocaleLowerCase();
  const fr = data.summaries.fr ?? {};
  const current = data.summaries[uiLang] ?? {};
  const visible: string[] = [];
  for (const a of data.articles) {
    // Seuls les articles analysés comme cyber et traduits dans la langue choisie sont affichés.
    const s = current[a.id];
    if (!s || fr[a.id]?.cyber === false || s.cyber === false) continue;
    if (filter !== "all" && s.gravite !== filter) continue;
    if (q) {
      const hay = [a.title, a.source, s.titre, s.resume, s.cible, s.pays, s.categorie].join(" ").toLocaleLowerCase();
      if (!hay.includes(q)) continue;
    }
    visible.push(card(a, s));
  }
  $("list").innerHTML = visible.length
    ? visible.join("")
    : `<p class="empty">${data.articles.length ? t().emptyFilter : t().empty}</p>`;
}

async function refresh() {
  if (loading) return;
  loading = true;
  $("refresh").classList.add("spin");
  renderStatus();
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    save("data", data);
    failed = false;
  } catch {
    failed = true;
  } finally {
    loading = false;
    $("refresh").classList.remove("spin");
    renderStatus();
    render();
  }
}

function bindEvents() {
  $("refresh").onclick = refresh;
  $("search").oninput = (e) => {
    query = (e.target as HTMLInputElement).value;
    render();
  };
  $("filters").onclick = (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-f]");
    if (!btn) return;
    filter = btn.dataset.f as typeof filter;
    document.querySelectorAll("#filters button").forEach((b) => b.classList.toggle("on", b === btn));
    render();
  };
  $("langs").onclick = (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-l]");
    if (!btn || btn.dataset.l === uiLang) return;
    uiLang = btn.dataset.l as UiLang;
    save("uiLang", uiLang);
    renderShell();
    render();
  };
}

renderShell();
render();
refresh();
