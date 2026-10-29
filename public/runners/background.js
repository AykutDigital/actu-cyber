// Tâche de fond Android (Capacitor Background Runner) : toutes les ~30 min, regarde si de nouveaux
// incidents « critique » ou « élevée » ont été publiés et envoie une notification pour chacun.
// Environnement sans DOM : seulement fetch, CapacitorKV et CapacitorNotifications.
const DATA_URL = "https://aykutdigital.github.io/actu-cyber/data.json";
const MAX_PER_RUN = 5;
const LABELS = {
  fr: { critique: "Critique", elevee: "Élevée" },
  en: { critique: "Critical", elevee: "High" },
  tr: { critique: "Kritik", elevee: "Yüksek" },
  ar: { critique: "حرجة", elevee: "عالية" },
  ru: { critique: "Критичная", elevee: "Высокая" },
};

function kv(key) {
  const r = CapacitorKV.get(key);
  return r && r.value ? r.value : "";
}

function notificationId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 2000000000;
}

async function checkNews() {
  if (kv("enabled") === "false") return;
  const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
  const data = typeof res.json === "function" ? await res.json() : JSON.parse(await res.text());
  const lang = kv("lang") || "fr";
  const fr = data.summaries.fr || {};
  const store = data.summaries[lang] || fr;

  const important = data.articles.filter((a) => {
    const s = store[a.id];
    return s && s.cyber !== false && fr[a.id]?.cyber !== false && (s.gravite === "critique" || s.gravite === "elevee");
  });

  const seenRaw = kv("seen");
  // Premier passage : on mémorise l'existant sans rien envoyer (pas de rafale de notifications).
  if (seenRaw) {
    const seen = new Set(JSON.parse(seenRaw));
    const fresh = important.filter((a) => !seen.has(a.id)).slice(0, MAX_PER_RUN);
    if (fresh.length) {
      CapacitorNotifications.schedule(
        fresh.map((a) => {
          const s = store[a.id];
          const label = (LABELS[lang] || LABELS.fr)[s.gravite];
          return {
            id: notificationId(a.id),
            title: `${s.gravite === "critique" ? "🔴" : "🟠"} ${label} · ${s.titre}`,
            body: s.resume,
          };
        }),
      );
    }
  }
  CapacitorKV.set("seen", JSON.stringify(important.map((a) => a.id)));
}

addEventListener("checkNews", async (resolve, reject) => {
  try {
    await checkNews();
    resolve();
  } catch (err) {
    reject(err);
  }
});

// Appelé par l'app pour transmettre la langue et l'activation des notifications.
addEventListener("configure", (resolve, reject, args) => {
  try {
    if (args && args.lang) CapacitorKV.set("lang", args.lang);
    if (args && typeof args.enabled === "boolean") CapacitorKV.set("enabled", String(args.enabled));
    resolve();
  } catch (err) {
    reject(err);
  }
});
