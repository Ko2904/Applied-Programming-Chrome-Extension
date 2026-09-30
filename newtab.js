function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent =
    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
updateClock();
setInterval(updateClock, 1000);

async function showDailyQuote() {
  try {
    const res = await fetch("quotes.json");
    const quotes = await res.json();

    // Day of the year (1-366), so the quote changes once per day
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);

    const quote = quotes[dayOfYear % quotes.length];
    document.getElementById("quote-text").textContent = quote.text;
    document.getElementById("quote-author").textContent = quote.author;
  } catch (err) {
    console.error("Could not load quote:", err);
  }
}
showDailyQuote();

const PRESETS = [
  "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  "linear-gradient(135deg, #42275a, #734b6d)",
  "linear-gradient(135deg, #134e5e, #71b280)",
  "linear-gradient(135deg, #232526, #414345)",
  "linear-gradient(135deg, #614385, #516395)",
  "linear-gradient(135deg, #b24592, #f15f79)"
];

async function applyBackground() {
  const { background } = await chrome.storage.local.get("background");
  document.body.style.backgroundImage = background || "";
}

async function saveBackground(cssValue) {
  await chrome.storage.local.set({ background: cssValue });
  applyBackground();
}

// Shrink uploaded images so storage stays small and loading stays fast
function resizeImage(file, maxSize = 1920) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function setupSettings() {
  const panel = document.getElementById("settings-panel");
  const presetsEl = document.getElementById("presets");

  document.getElementById("settings-btn").addEventListener("click", () => {
    panel.hidden = !panel.hidden;
  });

  PRESETS.forEach((gradient) => {
    const btn = document.createElement("button");
    btn.className = "preset";
    btn.style.backgroundImage = gradient;
    btn.addEventListener("click", () => saveBackground(gradient));
    presetsEl.appendChild(btn);
  });

  document.getElementById("upload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      saveBackground(`url("${dataUrl}")`);
    } catch (err) {
      console.error("Could not load image:", err);
    }
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    saveBackground("");
  });
}

applyBackground();
setupSettings();

const NEWS_URL = "https://raw.githubusercontent.com/Ko2904/Applied-Programming-Chrome-Extension/main/news.json";

function renderNews(data) {
  const list = document.getElementById("news-list");
  list.replaceChildren();
  data.items.forEach((item) => {
    const wrap = document.createElement("div");
    wrap.className = "news-item";

    const link = document.createElement("a");
    link.href = item.url;
    link.textContent = item.headline;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const summary = document.createElement("p");
    summary.textContent = item.summary;

    const source = document.createElement("small");
    source.textContent = item.source;

    wrap.append(link, summary, source);
    list.appendChild(wrap);
  });
}

async function showNews() {
  const list = document.getElementById("news-list");
  const today = new Date().toISOString().slice(0, 10);
  const { newsCache } = await chrome.storage.local.get("newsCache");

  // Use the cache if it was already fetched today
  if (newsCache && newsCache.fetchedOn === today) {
    renderNews(newsCache.data);
    return;
  }

  try {
    const res = await fetch(NEWS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    await chrome.storage.local.set({ newsCache: { fetchedOn: today, data } });
    renderNews(data);
  } catch (err) {
    console.error("Could not load news:", err);
    // Fall back to the last cached news, even if it is old
    if (newsCache) renderNews(newsCache.data);
    else list.textContent = "News is not available right now.";
  }
}
showNews();