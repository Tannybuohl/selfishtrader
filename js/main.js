const nav = document.querySelector(".nav");
const toggle = document.querySelector(".nav__toggle");
const menu = document.querySelector("#menu");

function setMenu(open) {
  nav.classList.toggle("open", open);
  toggle?.setAttribute("aria-expanded", String(open));
  toggle?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

toggle?.addEventListener("click", () => {
  setMenu(!nav.classList.contains("open"));
});

menu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

function nyNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const weekday = get("weekday");
  let hour = Number(get("hour"));
  const minute = Number(get("minute"));
  if (get("dayPeriod") === "PM" && hour < 12) hour += 12;
  if (get("dayPeriod") === "AM" && hour === 12) hour = 0;
  return { weekday, hour, minute, label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} EST` };
}

function sessionState() {
  const { weekday, hour, minute, label } = nyNow();
  const mins = hour * 60 + minute;
  const weekend = weekday === "Sat" || weekday === "Sun";
  let name = "Closed";
  let tone = "off";

  if (weekday === "Sun" && mins >= 19 * 60 && mins < 21 * 60) {
    name = "Huddle live";
    tone = "live";
  } else if (!weekend && mins >= 4 * 60 && mins < 9 * 60 + 30) {
    name = "Pre-market";
    tone = "pre";
  } else if (!weekend && mins >= 9 * 60 + 30 && mins < 16 * 60) {
    name = "Market open";
    tone = "live";
  } else if (!weekend && mins >= 16 * 60 && mins < 20 * 60) {
    name = "After hours";
    tone = "pre";
  }

  return { name, tone, label, weekday };
}

function paintSession() {
  const { name, tone, label, weekday } = sessionState();
  document.querySelectorAll("[data-session]").forEach((el) => {
    el.dataset.tone = tone;
    const nameEl = el.querySelector("[data-session-name]");
    const timeEl = el.querySelector("[data-session-time]");
    if (nameEl) nameEl.textContent = name;
    if (timeEl) timeEl.textContent = label;
  });

  document.querySelectorAll("[data-day]").forEach((el) => {
    el.classList.toggle("is-today", el.dataset.day === weekday);
  });
}

paintSession();
setInterval(paintSession, 30000);

(function loadLiveChart() {
  const mount = document.querySelector("#tv-spy");
  if (!mount) return;

  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/tv.js";
  script.onload = () => {
    if (!window.TradingView) return;
    new window.TradingView.widget({
      autosize: true,
      symbol: "AMEX:SPY",
      interval: "15",
      timezone: "America/New_York",
      theme: "dark",
      style: "1",
      locale: "en",
      toolbar_bg: "#080a08",
      enable_publishing: false,
      hide_top_toolbar: false,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: false,
      details: false,
      studies: ["STD;RSI"],
      container_id: "tv-spy",
    });
  };
  document.body.appendChild(script);
})();
