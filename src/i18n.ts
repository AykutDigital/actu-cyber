export type UiLang = "fr" | "en" | "tr" | "ar" | "ru";

export const UI_LANGS: { code: UiLang; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "tr", label: "TR" },
  { code: "ar", label: "AR" },
  { code: "ru", label: "RU" },
];

// Nom de la langue tel qu'on le donne au modèle.
export const LANG_NAME: Record<UiLang, string> = {
  fr: "français",
  en: "anglais",
  tr: "turc",
  ar: "arabe (arabe standard moderne)",
  ru: "russe",
};

// Ce que le modèle écrit quand l'info manque, dans chaque langue.
export const NOT_DISCLOSED: Record<UiLang, string> = {
  fr: "Non communiqué",
  en: "Not disclosed",
  tr: "Açıklanmadı",
  ar: "غير معلن",
  ru: "Не сообщается",
};

type Strings = {
  title: string;
  search: string;
  all: string;
  critique: string;
  elevee: string;
  moyenne: string;
  faible: string;
  details: string;
  cible: string;
  comment: string;
  pourquoi: string;
  resolution: string;
  duree: string;
  statut: string;
  resolu: string;
  en_cours: string;
  inconnu: string;
  source: string;
  readSource: string;
  empty: string;
  emptyFilter: string;
  settings: string;
  apiKey: string;
  workspace: string;
  hint: string;
  cancel: string;
  save: string;
  reset: string;
  fetching: string;
  articles: (n: number) => string;
  summarizing: (done: number, total: number) => string;
  toSummarize: (n: number) => string;
  needKey: string;
  unavailable: (n: number) => string;
  error: string;
  cleared: string;
  cached: (n: number) => string;
  now: string;
  updated: string;
  offline: string;
  hoursAgo: (h: number) => string;
  yesterday: string;
  daysAgo: (d: number) => string;
};

export const T: Record<UiLang, Strings> = {
  fr: {
    title: "Veille Cyber",
    search: "Rechercher (ransomware, France, Microsoft…)",
    all: "Tout",
    critique: "Critique",
    elevee: "Élevée",
    moyenne: "Moyenne",
    faible: "Faible",
    details: "Détails",
    cible: "Cible",
    comment: "Comment",
    pourquoi: "Pourquoi",
    resolution: "Réponse des experts",
    duree: "Délai",
    statut: "Statut",
    resolu: "Résolu",
    en_cours: "En cours",
    inconnu: "Inconnu",
    source: "Article original",
    readSource: "Lire la source →",
    empty: "Les actus arrivent bientôt. Réessaie dans quelques minutes.",
    emptyFilter: "Aucun article pour ce filtre.",
    settings: "Réglages",
    apiKey: "Clé API Anthropic (Claude)",
    workspace: "ID workspace (optionnel)",
    hint: "La clé reste sur cet appareil et sert à rédiger les fiches. L'ID workspace n'est utile que si ta clé n'est rattachée à aucun workspace.",
    cancel: "Annuler",
    save: "Enregistrer",
    reset: "Effacer le cache des articles",
    fetching: "Récupération des flux…",
    articles: (n) => `${n} articles`,
    summarizing: (d, t) => `Rédaction des fiches : ${d}/${t}`,
    toSummarize: (n) => `${n} à rédiger (↻ pour continuer)`,
    needKey: "Ajoute ta clé API dans ⚙ pour obtenir les fiches.",
    unavailable: (n) => `${n} source(s) indisponible(s)`,
    error: "Erreur",
    cleared: "Cache effacé.",
    cached: (n) => `${n} articles en cache.`,
    updated: "Mis à jour",
    offline: "Hors ligne : dernières données enregistrées",
    now: "à l'instant",
    hoursAgo: (h) => `il y a ${h} h`,
    yesterday: "hier",
    daysAgo: (d) => `il y a ${d} j`,
  },
  en: {
    title: "Cyber Watch",
    search: "Search (ransomware, France, Microsoft…)",
    all: "All",
    critique: "Critical",
    elevee: "High",
    moyenne: "Medium",
    faible: "Low",
    details: "Details",
    cible: "Target",
    comment: "How",
    pourquoi: "Why",
    resolution: "Expert response",
    duree: "Time to fix",
    statut: "Status",
    resolu: "Resolved",
    en_cours: "Ongoing",
    inconnu: "Unknown",
    source: "Original article",
    readSource: "Read the source →",
    empty: "News is on its way. Try again in a few minutes.",
    emptyFilter: "No articles for this filter.",
    settings: "Settings",
    apiKey: "Anthropic API key (Claude)",
    workspace: "Workspace ID (optional)",
    hint: "The key stays on this device and is used to write the summaries. The workspace ID is only needed if your key isn't tied to a workspace.",
    cancel: "Cancel",
    save: "Save",
    reset: "Clear article cache",
    fetching: "Fetching feeds…",
    articles: (n) => `${n} articles`,
    summarizing: (d, t) => `Writing summaries: ${d}/${t}`,
    toSummarize: (n) => `${n} left (↻ to continue)`,
    needKey: "Add your API key in ⚙ to get summaries.",
    unavailable: (n) => `${n} source(s) unavailable`,
    error: "Error",
    cleared: "Cache cleared.",
    cached: (n) => `${n} cached articles.`,
    updated: "Updated",
    offline: "Offline: showing saved data",
    now: "just now",
    hoursAgo: (h) => `${h} h ago`,
    yesterday: "yesterday",
    daysAgo: (d) => `${d} d ago`,
  },
  tr: {
    title: "Siber Gündem",
    search: "Ara (fidye yazılımı, Türkiye, Microsoft…)",
    all: "Tümü",
    critique: "Kritik",
    elevee: "Yüksek",
    moyenne: "Orta",
    faible: "Düşük",
    details: "Ayrıntılar",
    cible: "Hedef",
    comment: "Nasıl",
    pourquoi: "Neden",
    resolution: "Uzmanların müdahalesi",
    duree: "Süre",
    statut: "Durum",
    resolu: "Çözüldü",
    en_cours: "Devam ediyor",
    inconnu: "Bilinmiyor",
    source: "Orijinal makale",
    readSource: "Kaynağı oku →",
    empty: "Haberler yakında gelecek. Birkaç dakika sonra tekrar deneyin.",
    emptyFilter: "Bu filtre için makale yok.",
    settings: "Ayarlar",
    apiKey: "Anthropic API anahtarı (Claude)",
    workspace: "Workspace kimliği (isteğe bağlı)",
    hint: "Anahtar bu cihazda kalır ve özetleri yazmak için kullanılır. Workspace kimliği yalnızca anahtarınız bir workspace'e bağlı değilse gereklidir.",
    cancel: "İptal",
    save: "Kaydet",
    reset: "Makale önbelleğini temizle",
    fetching: "Kaynaklar alınıyor…",
    articles: (n) => `${n} makale`,
    summarizing: (d, t) => `Özetler yazılıyor: ${d}/${t}`,
    toSummarize: (n) => `${n} kaldı (devam için ↻)`,
    needKey: "Özetler için ⚙ bölümüne API anahtarınızı ekleyin.",
    unavailable: (n) => `${n} kaynak kullanılamıyor`,
    error: "Hata",
    cleared: "Önbellek temizlendi.",
    cached: (n) => `Önbellekte ${n} makale.`,
    updated: "Güncellendi",
    offline: "Çevrimdışı: kayıtlı veriler gösteriliyor",
    now: "az önce",
    hoursAgo: (h) => `${h} sa önce`,
    yesterday: "dün",
    daysAgo: (d) => `${d} gün önce`,
  },
  ar: {
    title: "رصد سيبراني",
    search: "ابحث (فدية، فرنسا، مايكروسوفت…)",
    all: "الكل",
    critique: "حرجة",
    elevee: "عالية",
    moyenne: "متوسطة",
    faible: "منخفضة",
    details: "التفاصيل",
    cible: "الهدف",
    comment: "كيف",
    pourquoi: "لماذا",
    resolution: "استجابة الخبراء",
    duree: "المدة",
    statut: "الحالة",
    resolu: "تم الحل",
    en_cours: "جارٍ",
    inconnu: "غير معروف",
    source: "المقال الأصلي",
    readSource: "اقرأ المصدر ←",
    empty: "الأخبار قادمة قريبًا. أعد المحاولة بعد بضع دقائق.",
    emptyFilter: "لا توجد مقالات لهذا الفلتر.",
    settings: "الإعدادات",
    apiKey: "مفتاح Anthropic API (Claude)",
    workspace: "معرّف مساحة العمل (اختياري)",
    hint: "يبقى المفتاح على هذا الجهاز ويُستخدم لكتابة الملخصات. معرّف مساحة العمل مطلوب فقط إذا لم يكن مفتاحك مرتبطًا بمساحة عمل.",
    cancel: "إلغاء",
    save: "حفظ",
    reset: "مسح ذاكرة المقالات",
    fetching: "جارٍ جلب المصادر…",
    articles: (n) => `${n} مقالة`,
    summarizing: (d, t) => `كتابة الملخصات: ${d}/${t}`,
    toSummarize: (n) => `${n} متبقية (↻ للمتابعة)`,
    needKey: "أضف مفتاح API في ⚙ للحصول على الملخصات.",
    unavailable: (n) => `${n} مصدر غير متاح`,
    error: "خطأ",
    cleared: "تم مسح الذاكرة.",
    cached: (n) => `${n} مقالة محفوظة.`,
    updated: "آخر تحديث",
    offline: "غير متصل: عرض البيانات المحفوظة",
    now: "الآن",
    hoursAgo: (h) => `منذ ${h} ساعة`,
    yesterday: "أمس",
    daysAgo: (d) => `منذ ${d} يوم`,
  },
  ru: {
    title: "Кибер-обзор",
    search: "Поиск (вымогатели, Франция, Microsoft…)",
    all: "Все",
    critique: "Критичная",
    elevee: "Высокая",
    moyenne: "Средняя",
    faible: "Низкая",
    details: "Подробнее",
    cible: "Цель",
    comment: "Как",
    pourquoi: "Зачем",
    resolution: "Ответ экспертов",
    duree: "Срок",
    statut: "Статус",
    resolu: "Устранено",
    en_cours: "Продолжается",
    inconnu: "Неизвестно",
    source: "Оригинал статьи",
    readSource: "Читать источник →",
    empty: "Новости скоро появятся. Повторите через несколько минут.",
    emptyFilter: "Нет статей для этого фильтра.",
    settings: "Настройки",
    apiKey: "API-ключ Anthropic (Claude)",
    workspace: "ID рабочего пространства (необязательно)",
    hint: "Ключ хранится только на этом устройстве и используется для написания сводок. ID рабочего пространства нужен, только если ключ не привязан к нему.",
    cancel: "Отмена",
    save: "Сохранить",
    reset: "Очистить кэш статей",
    fetching: "Загрузка лент…",
    articles: (n) => `Статей: ${n}`,
    summarizing: (d, t) => `Пишем сводки: ${d}/${t}`,
    toSummarize: (n) => `Осталось: ${n} (↻ чтобы продолжить)`,
    needKey: "Добавьте API-ключ в ⚙, чтобы получить сводки.",
    unavailable: (n) => `Недоступно источников: ${n}`,
    error: "Ошибка",
    cleared: "Кэш очищен.",
    cached: (n) => `В кэше статей: ${n}.`,
    updated: "Обновлено",
    offline: "Нет сети: показаны сохранённые данные",
    now: "только что",
    hoursAgo: (h) => `${h} ч назад`,
    yesterday: "вчера",
    daysAgo: (d) => `${d} дн. назад`,
  },
};
