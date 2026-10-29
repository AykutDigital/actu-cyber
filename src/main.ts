import "./style.css";
import { Capacitor } from "@capacitor/core";
import { BackgroundRunner } from "@capacitor/background-runner";
import type { Article } from "./feeds";
import type { Gravite, Summary } from "./summarize";
import { NOT_DISCLOSED, T, UI_LANGS, type UiLang } from "./i18n";

// Les fiches sont produites toutes les 3 h par l'automatisation (scripts/update.ts)
// et publiées avec le site. L'app Android lit le même fichier en ligne.
const NATIVE = Capacitor.isNativePlatform();
const RUNNER = "fr.alertis.actucyber.check"; // label de capacitor.config.json
const DATA_URL = NATIVE ? "https://aykutdigital.github.io/actu-cyber/data.json" : "./data.json";
const GRAVITES: Gravite[] = ["critique", "elevee", "moyenne", "faible"];
// Préfixe que l'analyse met devant une hypothèse, dans chaque langue.
const HYPOTHESIS = /(Probable|Likely|Muhtemel(?:en)?|محتمل|Вероятно)\s*[:：]\s*/u;

const ICON = {
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  bellOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>`,
  how: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`,
  why: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  state: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h4l3-7 4 14 3-7h2"/></svg>`,
};

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
let notifEnabled: boolean = load("notifEnabled", true);
let flash = ""; // message temporaire dans la ligne d'état
let animateNext = true; // cascade d'entrée uniquement au premier affichage des données

const app = document.querySelector<HTMLDivElement>("#app")!;
const $ = <T extends HTMLElement>(sel: string) => app.querySelector(sel) as T;
const t = () => T[uiLang];

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Relatif sur une semaine, date absolue au-delà (cf. ui-cheatsheet).
function relDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.round(ms / 3.6e6);
  if (h < 1) return t().now;
  if (h < 24) return t().hoursAgo(h);
  const d = Math.round(h / 24);
  if (d === 1) return t().yesterday;
  if (d < 7) return t().daysAgo(d);
  return new Intl.DateTimeFormat(uiLang, { day: "numeric", month: "short" }).format(new Date(iso));
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(date)) / 86400e3);
  if (diff === 0) return t().today;
  if (diff === 1) return t().yesterday;
  return new Intl.DateTimeFormat(uiLang, { weekday: "long", day: "numeric", month: "long" }).format(date);
}

// Sépare les faits de l'hypothèse « Probable : … » pour l'afficher à part.
function withHypothesis(text: string): string {
  const m = HYPOTHESIS.exec(text);
  if (!m) return esc(text);
  const before = text.slice(0, m.index).trim();
  const after = text.slice(m.index + m[0].length).trim();
  return `${before ? `${esc(before)} ` : ""}<span class="hypo">${t().hypothesis}</span><span class="hypo-text">${esc(after)}</span>`;
}

// --- squelette : construit une fois, textes mis à jour au changement de langue ---
function buildShell() {
  app.innerHTML = `
    <div class="shell">
      <header>
        <div class="top">
          <div class="brand">
            <h1 data-t="title"></h1>
            <p class="tagline" data-t="tagline"></p>
            ${NATIVE ? "" : `<a class="download" href="./VeilleCyber.apk" download>${ICON.download}<span data-t="download"></span></a>`}
          </div>
          ${NATIVE ? `<button class="icon-btn" id="notif"></button>` : ""}
          <button class="icon-btn" id="refresh">${ICON.refresh}</button>
        </div>
        <div class="segmented" id="langs" role="group">
          <span class="pill" aria-hidden="true"></span>
          ${UI_LANGS.map((l) => `<button data-l="${l.code}" lang="${l.code}">${l.label}</button>`).join("")}
        </div>
        <label class="search">
          ${ICON.search}
          <input id="search" type="search" enterkeyhint="search" autocomplete="off" />
        </label>
        <div class="chips" id="filters" role="group"></div>
        <p class="status" id="status" aria-live="polite"></p>
      </header>
      <main class="list" id="list"></main>
    </div>
  `;
  bindEvents();
}

function applyLanguage() {
  const s = t();
  document.documentElement.lang = uiLang;
  document.documentElement.dir = uiLang === "ar" ? "rtl" : "ltr";
  document.title = s.title;
  app.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => {
    el.textContent = s[el.dataset.t as "title" | "tagline" | "download"];
  });
  $<HTMLInputElement>("#search").placeholder = s.search;
  $("#refresh").setAttribute("aria-label", s.fetching);
  const index = UI_LANGS.findIndex((l) => l.code === uiLang);
  $("#langs").style.setProperty("--i", String(index));
  app.querySelectorAll<HTMLButtonElement>("#langs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.l === uiLang)));
}

function renderStatus() {
  const s = t();
  const parts: string[] = [];
  if (loading && !data.updatedAt) parts.push(s.fetching);
  if (data.updatedAt) parts.push(`${s.updated} ${relDate(data.updatedAt)}`);
  if (failed) parts.push(s.offline);
  if (flash) parts.push(flash);
  $("#status").textContent = parts.join(" · ");
  $("#refresh").classList.toggle("loading", loading);
}

function visibleItems(): { a: Article; s: Summary }[] {
  const fr = data.summaries.fr ?? {};
  const current = data.summaries[uiLang] ?? {};
  const q = query.trim().toLocaleLowerCase();
  const items: { a: Article; s: Summary }[] = [];
  for (const a of data.articles) {
    // Seuls les articles analysés comme cyber et traduits dans la langue choisie sont affichés.
    const s = current[a.id];
    if (!s || fr[a.id]?.cyber === false || s.cyber === false) continue;
    if (q) {
      const hay = [a.title, a.source, s.titre, s.resume, s.cible, s.pays, s.categorie].join(" ").toLocaleLowerCase();
      if (!hay.includes(q)) continue;
    }
    items.push({ a, s });
  }
  return items;
}

function renderFilters(items: { s: Summary }[]) {
  const s = t();
  const count = (g: Gravite) => items.filter((i) => i.s.gravite === g).length;
  const chip = (key: Gravite | "all", label: string, n: number) =>
    `<button class="chip ${key === "all" ? "" : `sev-${key}`}" data-f="${key}" aria-pressed="${filter === key}">
      ${key === "all" ? "" : `<span class="dot"></span>`}${label}<span class="count">${n}</span>
    </button>`;
  $("#filters").innerHTML = chip("all", s.all, items.length) + GRAVITES.map((g) => chip(g, s[g], count(g))).join("");
}

function card({ a, s }: { a: Article; s: Summary }, n: number): string {
  const tr = t();
  const pays =
    s.pays && s.pays !== NOT_DISCLOSED[uiLang] ? `<span class="place sep">${ICON.pin}${esc(s.pays)}</span>` : "";
  const fact = (icon: string, label: string, value: string, extra = "") =>
    `<div class="fact ${extra}">${icon}<dt>${label}</dt><dd>${value}</dd></div>`;
  return `<article class="card sev-${s.gravite}" style="--n:${n}">
    <div class="meta">
      <span class="sev-label"><span class="dot"></span>${tr[s.gravite]}</span>
      <span class="sep">${esc(s.categorie)}</span>
      ${pays}
    </div>
    <h3>${esc(s.titre)}</h3>
    <p class="resume">${esc(s.resume)}</p>
    <div class="foot">
      <span class="tag">${(a.lang ?? "en").toUpperCase()}</span>
      <span class="src">${esc(a.source)} · ${relDate(a.date)}</span>
    </div>
    <details>
      <summary>${tr.analysis}${ICON.chevron}</summary>
      <dl class="facts">
        ${fact(ICON.target, tr.cible, esc(s.cible))}
        ${fact(ICON.how, tr.comment, withHypothesis(s.comment))}
        ${fact(ICON.why, tr.pourquoi, withHypothesis(s.pourquoi))}
        ${fact(ICON.shield, tr.resolution, withHypothesis(s.resolution))}
        ${fact(ICON.clock, tr.duree, withHypothesis(s.duree), "highlight")}
        ${fact(ICON.state, tr.statut, `<span class="state state-${s.statut}"><span class="dot"></span>${tr[s.statut] ?? s.statut}</span>`)}
      </dl>
      <a class="source-link" href="${esc(a.link)}" target="_blank" rel="noopener">${tr.source}${ICON.arrow}</a>
    </details>
  </article>`;
}

function render() {
  const all = visibleItems();
  renderFilters(all);
  const items = filter === "all" ? all : all.filter((i) => i.s.gravite === filter);
  const list = $("#list");

  if (!items.length) {
    list.classList.remove("enter");
    list.innerHTML =
      loading && !data.articles.length
        ? `<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`
        : `<p class="empty">${data.articles.length ? t().emptyFilter : t().empty}</p>`;
    return;
  }

  // Regroupement par jour de publication.
  let html = "";
  let lastDay = "";
  let n = 0;
  const perDay = new Map<string, number>();
  for (const { a } of items) {
    const key = new Date(a.date).toDateString();
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  for (const item of items) {
    const key = new Date(item.a.date).toDateString();
    if (key !== lastDay) {
      lastDay = key;
      html += `<h2 class="day" style="--n:${n++}">${esc(dayLabel(item.a.date))} <span class="n">· ${t().incidents(perDay.get(key)!)}</span></h2>`;
    }
    html += card(item, n++);
  }
  list.classList.toggle("enter", animateNext);
  animateNext = false;
  list.innerHTML = html;
}

// --- notifications (app Android uniquement) ---
function renderNotifButton() {
  const btn = $("#notif");
  if (!btn) return;
  btn.innerHTML = notifEnabled ? ICON.bell : ICON.bellOff;
  btn.setAttribute("aria-pressed", String(notifEnabled));
  btn.setAttribute("aria-label", notifEnabled ? t().notifOn : t().notifOff);
}

function showFlash(message: string) {
  flash = message;
  renderStatus();
  setTimeout(() => {
    if (flash === message) {
      flash = "";
      renderStatus();
    }
  }, 4000);
}

async function configureRunner() {
  await BackgroundRunner.dispatchEvent({ label: RUNNER, event: "configure", details: { lang: uiLang, enabled: notifEnabled } });
}

async function enableNotifications(): Promise<boolean> {
  const result = await BackgroundRunner.requestPermissions({ apis: ["notifications"] });
  return result.notifications !== "denied";
}

async function setupNotifications() {
  if (!NATIVE) return;
  try {
    if (notifEnabled && !(await enableNotifications())) {
      notifEnabled = false;
      save("notifEnabled", false);
    }
    renderNotifButton();
    await configureRunner();
    // Premier passage tout de suite : mémorise les incidents déjà publiés.
    await BackgroundRunner.dispatchEvent({ label: RUNNER, event: "checkNews", details: {} });
  } catch {
    /* tâche de fond indisponible : l'app reste utilisable */
  }
}

async function toggleNotifications() {
  const next = !notifEnabled;
  if (next && !(await enableNotifications())) {
    showFlash(t().notifDenied);
    return;
  }
  notifEnabled = next;
  save("notifEnabled", notifEnabled);
  renderNotifButton();
  showFlash(notifEnabled ? t().notifOn : t().notifOff);
  await configureRunner().catch(() => {});
}

async function refresh() {
  if (loading) return;
  loading = true;
  renderStatus();
  if (!data.articles.length) render();
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fresh: Data = await res.json();
    if (fresh.updatedAt !== data.updatedAt) animateNext = true;
    data = fresh;
    save("data", data);
    failed = false;
  } catch {
    failed = true;
  } finally {
    loading = false;
    renderStatus();
    render();
  }
}

function bindEvents() {
  $("#refresh").addEventListener("click", refresh);
  $("#notif")?.addEventListener("click", toggleNotifications);
  $("#search").addEventListener("input", (e) => {
    query = (e.target as HTMLInputElement).value;
    render();
  });
  $("#filters").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-f]");
    if (!btn) return;
    filter = btn.dataset.f as typeof filter;
    render();
  });
  $("#langs").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-l]");
    if (!btn || btn.dataset.l === uiLang) return;
    uiLang = btn.dataset.l as UiLang;
    save("uiLang", uiLang);
    applyLanguage();
    renderNotifButton();
    renderStatus();
    render();
    if (NATIVE) configureRunner().catch(() => {});
  });
}

buildShell();
applyLanguage();
renderNotifButton();
renderStatus();
render();
refresh();
setupNotifications();
