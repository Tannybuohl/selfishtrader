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

(function fillTape() {
  const seed = document.querySelector("[data-tape-seed]");
  const track = seed?.parentElement;
  if (!seed || !track) return;

  const unit = seed.innerHTML;
  let guard = 0;
  while (seed.getBoundingClientRect().width < window.innerWidth && guard < 24) {
    seed.insertAdjacentHTML("beforeend", unit);
    guard += 1;
  }
  track.appendChild(seed.cloneNode(true));
})();

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

  if (weekday === "Sun" && mins >= 19 * 60 && mins < 20 * 60) {
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

function nyParts(date = new Date()) {
  const map = {};
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .forEach((p) => {
      if (p.type !== "literal") map[p.type] = p.value;
    });
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    weekday: map.weekday,
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function nyWallToUtc(year, month, day, hour, minute, second = 0) {
  const utc = Date.UTC(year, month - 1, day, hour, minute, second);
  const shown = nyParts(new Date(utc));
  const shownUtc = Date.UTC(
    shown.year,
    shown.month - 1,
    shown.day,
    shown.hour,
    shown.minute,
    shown.second
  );
  const wanted = Date.UTC(year, month - 1, day, hour, minute, second);
  return utc + (wanted - shownUtc);
}

function addDays(year, month, day, n) {
  const dt = new Date(Date.UTC(year, month - 1, day + n));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

function nextHuddle() {
  const ny = nyParts();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = days.indexOf(ny.weekday);
  const mins = ny.hour * 60 + ny.minute;
  const start = 19 * 60;
  const end = 20 * 60;

  if (dow === 0 && mins >= start && mins < end) {
    return { live: true, target: nyWallToUtc(ny.year, ny.month, ny.day, 20, 0, 0) };
  }

  let daysAhead = (7 - dow) % 7;
  if (dow === 0 && mins >= end) daysAhead = 7;
  if (dow === 0 && mins < start) daysAhead = 0;

  const targetDay = addDays(ny.year, ny.month, ny.day, daysAhead);
  return {
    live: false,
    target: nyWallToUtc(targetDay.year, targetDay.month, targetDay.day, 19, 0, 0),
  };
}

function paintHuddle() {
  const root = document.querySelector("[data-huddle]");
  if (!root) return;
  const { live, target } = nextHuddle();
  root.classList.toggle("is-live", live);
  const total = Math.max(0, Math.floor((target - Date.now()) / 1000));
  const parts = {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
  Object.entries(parts).forEach(([key, val]) => {
    const el = root.querySelector(`[data-huddle-${key}]`);
    if (!el) return;
    const next = String(val).padStart(2, "0");
    if (el.textContent !== next) {
      el.textContent = next;
      el.classList.remove("is-tick");
      void el.offsetWidth;
      el.classList.add("is-tick");
    }
  });
  const status = root.querySelector("[data-huddle-status]");
  if (status) {
    status.textContent = live
      ? "Huddle is live now — Sunday 7:00 PM ET"
      : "Next huddle · Sunday 7:00 PM ET";
  }
}

paintHuddle();
const huddleTick = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 30000 : 1000;
setInterval(paintHuddle, huddleTick);

(function loadLiveChart() {
  const mount = document.querySelector("#tv-spy");
  if (!mount) return;

  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/tv.js";
  script.onload = () => {
    if (!window.TradingView) return;
    const narrow = window.matchMedia("(max-width: 720px)").matches;
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
      hide_top_toolbar: narrow,
      allow_symbol_change: true,
      withdateranges: !narrow,
      hide_side_toolbar: true,
      details: false,
      studies: ["STD;RSI"],
      container_id: "tv-spy",
    });
  };
document.body.appendChild(script);
})();

(function motion() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nodes = document.querySelectorAll(
    ".huddle, .flow .section-head, .steps li, .tape .section-head, .video, .livechart, .desk .section-head, .blotter, .desk-split, .week, .book, .join .section-head, .plan, .quotes article, .proof, .faq, .contact"
  );

  if (reduce) {
    nodes.forEach((el) => el.classList.add("is-in"));
    return;
  }

  document.querySelectorAll(".steps, .plans, .quotes").forEach((group) => {
    [...group.children].forEach((child, i) => child.style.setProperty("--d", String(i)));
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  nodes.forEach((el) => {
    el.classList.add("reveal");
    io.observe(el);
  });
})();

(function introTape() {
  const video = document.querySelector("#intro-video");
  const trigger = document.querySelector("[data-play-intro]");
  if (!video) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let wantSound = false;

  function playIntro(sound) {
    if (sound) {
      video.muted = false;
      wantSound = true;
    } else if (!wantSound) {
      video.muted = true;
    }
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
  }

  trigger?.addEventListener("click", (event) => {
    event.preventDefault();
    wantSound = true;
    video.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    playIntro(true);
  });

  if (reduce) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          playIntro(wantSound);
        } else if (!entry.isIntersecting) {
          video.pause();
        }
      });
    },
    { threshold: [0, 0.4, 0.65] }
  );

  io.observe(video);
})();
