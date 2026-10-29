export type Lang = "fr" | "en" | "tr" | "ar" | "ru";

export interface Article {
  id: string;
  title: string;
  link: string;
  source: string;
  lang: Lang;
  date: string; // ISO
  excerpt: string;
}

interface Feed {
  name: string;
  url: string;
  lang: Lang;
  // Site tech généraliste : on ne garde que les articles qui parlent de cybersécurité.
  filter?: boolean;
}

export const FEEDS: Feed[] = [
  // Français
  { name: "CERT-FR", url: "https://www.cert.ssi.gouv.fr/feed/", lang: "fr" },
  { name: "ZATAZ", url: "https://www.zataz.com/feed/", lang: "fr" },
  { name: "Cybermalveillance", url: "https://www.cybermalveillance.gouv.fr/feed/atom-flux-actualites", lang: "fr" },
  { name: "IT-Connect", url: "https://www.it-connect.fr/actualites/actu-securite/feed/", lang: "fr" },
  { name: "LeMondeInformatique", url: "https://www.lemondeinformatique.fr/flux-rss/thematique/securite/rss.xml", lang: "fr" },
  { name: "UnderNews", url: "https://www.undernews.fr/feed", lang: "fr" },
  { name: "01net", url: "https://www.01net.com/actualites/securite/feed/", lang: "fr" },
  // Anglais
  { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", lang: "en" },
  { name: "The Record", url: "https://therecord.media/feed", lang: "en" },
  { name: "Dark Reading", url: "https://www.darkreading.com/rss.xml", lang: "en" },
  { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", lang: "en" },
  { name: "DataBreaches.net", url: "https://www.databreaches.net/feed/", lang: "en" },
  { name: "The Register", url: "https://www.theregister.com/security/headlines.atom", lang: "en" },
  { name: "Help Net Security", url: "https://www.helpnetsecurity.com/feed/", lang: "en" },
  { name: "Infosecurity Magazine", url: "https://www.infosecurity-magazine.com/rss/news/", lang: "en" },
  { name: "Security Affairs", url: "https://securityaffairs.com/feed", lang: "en" },
  { name: "Cybernews", url: "https://cybernews.com/feed/", lang: "en", filter: true },
  // Turc
  { name: "ShiftDelete Güvenlik", url: "https://shiftdelete.net/guvenlik/feed", lang: "tr" },
  { name: "Webtekno", url: "https://www.webtekno.com/rss.xml", lang: "tr", filter: true },
  { name: "DonanımHaber", url: "https://www.donanimhaber.com/rss/tum/", lang: "tr", filter: true },
  { name: "BThaber", url: "https://www.bthaber.com/feed/", lang: "tr", filter: true },
  // Russe
  { name: "SecurityLab.ru", url: "https://www.securitylab.ru/_services/export/rss/", lang: "ru" },
  { name: "Anti-Malware.ru", url: "https://www.anti-malware.ru/news/feed", lang: "ru" },
  { name: "Xakep", url: "https://xakep.ru/feed/", lang: "ru" },
  { name: "Habr Infosec", url: "https://habr.com/ru/rss/hub/infosecurity/all/", lang: "ru" },
  { name: "CNews Safe", url: "https://safe.cnews.ru/inc/rss/news.xml", lang: "ru" },
  // Arabe
  { name: "AIT News", url: "https://www.aitnews.com/feed/", lang: "ar", filter: true },
  { name: "Tech-WD", url: "https://www.tech-wd.com/wd/feed/", lang: "ar", filter: true },
  { name: "Arab Hardware", url: "https://arabhardware.net/feed", lang: "ar", filter: true },
  { name: "Al Jazeera", url: "https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9", lang: "ar", filter: true },
];

const PER_FEED = 15;

const CYBER_KEYWORDS = [
  // international
  "ransomware", "malware", "phishing", "ddos", "hacker", "hack", "botnet", "spyware", "exploit", "zero-day", "cve-",
  // anglais
  "cybersecurity", "cyberattack", "cyber attack", "cyber-attack", "cybercrim", "data breach", "vulnerability", "stolen data", "scam",
  // turc
  "siber güvenlik", "siber saldırı", "siber suç", "fidye yazılım", "veri sızıntısı", "verileri sızdırıldı", "zararlı yazılım",
  "kötü amaçlı yazılım", "güvenlik açığı", "oltalama", "dolandırıc", "bilgisayar korsan", "hacklendi",
  // arabe
  "الأمن السيبراني", "هجوم سيبراني", "هجمات سيبرانية", "هجوم إلكتروني", "هجمات إلكترونية", "اختراق", "قرصن", "برمجيات خبيثة",
  "برمجية خبيثة", "برامج الفدية", "فدية", "تسريب بيانات", "ثغرة", "تصيد", "احتيال إلكتروني", "هاكر", "أمن المعلومات",
];

function isCyber(a: Article): boolean {
  const hay = `${a.title} ${a.excerpt.slice(0, 400)}`.toLocaleLowerCase("tr");
  return CYBER_KEYWORDS.some((k) => hay.includes(k));
}

// Exécuté côté serveur (GitHub Actions) : pas de contrainte CORS.
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ActuCyber/1.0; +https://aykutdigital.github.io/actu-cyber/)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function stripHtml(html: string): string {
  // Document complet : le parseur côté serveur (linkedom) n'accepte pas un fragment seul.
  const doc = new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");
  return (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
}

// Récupère le texte principal de la page de l'article (pour une analyse plus complète que l'extrait RSS).
export async function fetchArticleText(url: string): Promise<string> {
  try {
    const doc = new DOMParser().parseFromString(await fetchText(url), "text/html");
    doc.querySelectorAll("script, style, noscript, nav, header, footer, aside, form, iframe, svg").forEach((el) => el.remove());
    const root = doc.querySelector("article") ?? doc.querySelector("main") ?? doc.body;
    const paragraphs = [...root.querySelectorAll("p, h2, h3, li")]
      .map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 40);
    return paragraphs.join("\n").slice(0, 8000);
  } catch {
    return "";
  }
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function text(el: Element, selector: string): string {
  return el.getElementsByTagName(selector)[0]?.textContent?.trim() ?? "";
}

function parseFeed(xml: string, feed: Feed): Article[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items = [...doc.getElementsByTagName("item"), ...doc.getElementsByTagName("entry")];
  return items.map((item) => {
    const linkEl = item.getElementsByTagName("link")[0];
    const link = linkEl?.getAttribute("href") || linkEl?.textContent?.trim() || "";
    const rawDate = text(item, "pubDate") || text(item, "published") || text(item, "updated") || text(item, "dc:date");
    const parsed = new Date(rawDate);
    const body = text(item, "content:encoded") || text(item, "description") || text(item, "summary") || text(item, "content");
    return {
      id: hash(link || text(item, "title")),
      title: stripHtml(text(item, "title")),
      link,
      source: feed.name,
      lang: feed.lang,
      date: isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString(),
      excerpt: stripHtml(body).slice(0, 1500),
    };
  });
}

export async function fetchAllFeeds(): Promise<{ articles: Article[]; errors: string[] }> {
  const errors: string[] = [];
  const results = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const items = parseFeed(await fetchText(f.url), f);
        return (f.filter ? items.filter(isCyber) : items)
          .sort((x, y) => y.date.localeCompare(x.date))
          .slice(0, PER_FEED);
      } catch (e) {
        errors.push(`${f.name} : ${(e as Error).message}`);
        return [];
      }
    }),
  );
  return { articles: results.flat(), errors };
}
