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