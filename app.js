/* stem.connect — app logic. Listings live in data.json, daily facts in facts.json. */

// Set to an email address to let "Suggest a listing" open a pre-filled email.
const SUBMIT_EMAIL = "";
const V = "16"; // bump with the ?v= in index.html when data changes

const app = document.getElementById("app");
const drawer = document.getElementById("drawer");
const drawerPanel = drawer.querySelector(".drawer-panel");

let DB;
try {
  DB = await fetch(`data.json?v=${V}`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
} catch {
  app.innerHTML = `<div class="container"><div class="empty" style="margin-top:48px"><b>The listings didn't load.</b>Refresh the page. If you opened index.html straight from your files, run <code>python3 -m http.server 5174</code> in this folder and open http://localhost:5174 instead.</div></div>`;
  throw new Error("data.json failed to load");
}
const { CHECKED, WV_CHECKED, NICHES, TYPES, SCOPES, COSTS, OPPORTUNITIES } = DB;
const byId = Object.fromEntries(OPPORTUNITIES.map((o) => [o.id, o]));

// Field pages, careers and stories live in explore.json and load the first time a page needs them.
let EX = null, exLoading = null;
const loadExplore = () => (exLoading ||= fetch(`explore.json?v=${V}`).then((r) => r.json()).then((d) => (EX = d)));

// Saved on this device only.
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(`stemconnect.${k}`)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`stemconnect.${k}`, JSON.stringify(v)); } catch {} },
};

/* ---------- the "try it" ladder: how big a step each listing is ---------- */
const STEPS = [
  { key: "try", label: "30 minutes", short: "30-minute start", hint: "No application. You can start today." },
  { key: "weekend", label: "A weekend", short: "Weekend step", hint: "A one-day event, a short class or a small project." },
  { key: "semester", label: "A semester", short: "Semester step", hint: "A club, course, competition or certification." },
  { key: "summer", label: "A summer", short: "Summer step", hint: "A summer program, research spot or internship." },
];
const STEP_I = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));
const STEP = Object.fromEntries(STEPS.map((s) => [s.key, s]));
function stepOf(o) {
  if (o.step) return o.step;
  if (o.type === "summer" || o.type === "research") return "summer";
  if (o.type === "event") return "weekend";
  if ((o.type === "course" || o.type === "volunteer") && o.scope === "online") return "try";
  return "semester";
}

// Each tab shows one slice of the database.
const CATS = [
  { slug: "internships", tab: "Internships", title: "Internships & Research", types: ["research"], blurb: "Research spots and internships in labs, museums and companies." },
  { slug: "programs", tab: "Programs", title: "Programs & Camps", types: ["summer", "program", "event"], blurb: "Summer programs, camps, year-round programs and one-day events." },
  { slug: "competitions", tab: "Competitions", title: "Competitions", types: ["competition"], blurb: "Contests, olympiads and science fairs." },
  { slug: "clubs", tab: "Clubs", title: "Clubs & Organizations", types: ["club"], blurb: "Teams, clubs and memberships, including clubs at WV." },
  { slug: "volunteering", tab: "Volunteering", title: "Volunteering", types: ["volunteer"], blurb: "Volunteer roles and citizen science projects." },
  { slug: "courses", tab: "Courses", title: "Courses", types: ["course"], blurb: "Online and college courses you can take now." },
  { slug: "certifications", tab: "Certifications", title: "Certifications", types: ["cert"], blurb: "Licenses and certifications you can earn in high school." },
];
const catOf = (o) => CATS.find((c) => c.types.includes(o.type));
// Clubs at Waubonsie Valley come from Mosaic. Outside listings with `wv` name the WV club that already does it.
const atWV = (o) => o.school === "wv";
const WV_CLUBS = OPPORTUNITIES.filter(atWV);

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const parse = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const fmt = (iso, opts = { month: "short", day: "numeric", year: "numeric" }) => parse(iso).toLocaleDateString("en-US", opts);
const short = (iso) => fmt(iso, { month: "short", day: "numeric" });
const daysUntil = (iso) => Math.round((parse(iso) - today) / 86400000);
function rel(iso) {
  const n = daysUntil(iso);
  if (n < 0) return "passed";
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n < 60) return `in ${n} days`;
  return `in ${Math.round(n / 30)} months`;
}
const SOON = 21;
const soon = (iso) => { const n = daysUntil(iso); return n >= 0 && n <= SOON; };
const openTo9 = (o) => o.grades.includes(9);
const gradeText = (g) => (g.length === 1 ? `${g[0]}th` : g.length === 4 ? "9–12" : `${Math.min(...g)}–${Math.max(...g)}`);
const nextDate = (o) => o.dates.filter((d) => daysUntil(d.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0];
const SEASONS = { summer: "Summer", "school-year": "School year", "year-round": "Year-round" };
const count = (fn) => OPPORTUNITIES.filter(fn).length;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const ICON = {
  search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.6-4.6"/></svg>`,
  mark: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/></svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  ext: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>`,
  left: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>`,
  right: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>`,
};

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

document.getElementById("checked-note").textContent =
  `Every listing was checked against its official website on ${fmt(CHECKED, { month: "long", day: "numeric", year: "numeric" })}. Programs change, so confirm on the official site before you apply.`;

/* ---------- tabs (extra tabs fold into "More" when they don't fit) ---------- */
// p = priority: higher numbers fold into "More" first.
const TABS = [
  { href: "#/fields", label: "Fields", key: "fields", p: 0 },
  ...CATS.map((c, i) => ({ href: `#/${c.slug}`, label: c.tab, key: c.slug, p: i < 4 ? 2 : 3 })),
  { href: "#/deadlines", label: "Deadlines", key: "deadlines", p: 1 },
  { href: "#/quiz", label: "Quiz", key: "quiz", p: 1 },
];
const tabList = document.getElementById("tabs");
const moreWrap = document.getElementById("more");
const moreBtn = document.getElementById("more-btn");
const moreMenu = document.getElementById("more-menu");
tabList.innerHTML = TABS.map((t) => `<a class="tab" href="${t.href}" data-key="${t.key}" data-p="${t.p}">${esc(t.label)}</a>`).join("");
function fitTabs() {
  const tabs = [...tabList.children];
  tabs.forEach((t) => (t.hidden = false));
  moreWrap.hidden = true;
  if (tabList.scrollWidth <= tabList.clientWidth + 1) { moreMenu.innerHTML = ""; markTabs(); return; }
  moreWrap.hidden = false;
  const order = [...tabs].sort((a, b) => b.dataset.p - a.dataset.p || tabs.indexOf(b) - tabs.indexOf(a));
  for (const t of order) {
    if (tabList.scrollWidth <= tabList.clientWidth + 1) break;
    if (t.dataset.p === "0") break;
    t.hidden = true;
  }
  moreMenu.innerHTML = tabs.filter((t) => t.hidden).map((t) => `<a href="${t.getAttribute("href")}" data-key="${t.dataset.key}" role="menuitem">${esc(t.textContent)}</a>`).join("");
  markTabs();
}
function markTabs() {
  const r = route()[0];
  document.querySelectorAll(".tab, #more-menu a").forEach((a) => a.classList.toggle("active", a.dataset.key === r));
  const inMore = !!moreMenu.querySelector(".active");
  moreBtn.classList.toggle("active", inMore);
}
const closeMore = () => { moreMenu.hidden = true; moreBtn.setAttribute("aria-expanded", "false"); };
moreBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = moreMenu.hidden;
  moreMenu.hidden = !open;
  moreBtn.setAttribute("aria-expanded", open);
  if (open) moreMenu.querySelector("a")?.focus();
});
document.addEventListener("click", (e) => { if (!e.target.closest("#more")) closeMore(); });

document.getElementById("top-search").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("top-q").value.trim();
  location.hash = `#/all${q ? `?q=${encodeURIComponent(q)}` : ""}`;
});

/* ---------- dashboard bookmarks (saved on this device) ---------- */
const STATUSES = [["interested", "Interested"], ["applying", "Applying"], ["applied", "Applied"], ["done", "Done"]];
let saved = new Set(), status = {}, savedAt = {};
try {
  saved = new Set(JSON.parse(localStorage.getItem("stemconnect.saved") || "[]").filter((id) => byId[id]));
  status = JSON.parse(localStorage.getItem("stemconnect.status") || "{}");
  savedAt = JSON.parse(localStorage.getItem("stemconnect.savedAt") || "{}");
} catch {}
function persist() {
  try {
    localStorage.setItem("stemconnect.saved", JSON.stringify([...saved]));
    localStorage.setItem("stemconnect.status", JSON.stringify(status));
    localStorage.setItem("stemconnect.savedAt", JSON.stringify(savedAt));
  } catch {}
  document.getElementById("saved-count").textContent = saved.size || "";
  const dueSoon = [...saved].map((id) => byId[id]).filter((o) => { const nd = o && nextDate(o); return nd && daysUntil(nd.date) <= 7; });
  const dash = document.querySelector(".top-dash");
  dash.classList.toggle("alert", dueSoon.length > 0);
  dash.title = dueSoon.length ? `${dueSoon.length} saved listing${dueSoon.length > 1 ? "s have dates" : " has a date"} in the next 7 days` : "";
}
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function toggleSave(id) {
  if (saved.has(id)) { saved.delete(id); delete status[id]; delete savedAt[id]; toast("Removed from your dashboard"); }
  else { saved.add(id); status[id] = "interested"; savedAt[id] = todayISO(); toast("Saved to your dashboard"); }
  persist();
  document.querySelectorAll(`[data-save="${id}"]`).forEach((b) => {
    b.setAttribute("aria-pressed", saved.has(id));
    const t = b.querySelector("[data-t]");
    if (t) t.textContent = saved.has(id) ? "On your dashboard" : "Save to dashboard";
  });
  if (route()[0] === "dashboard" || route()[0] === "saved") render();
}

/* ---------- daily "Did you know?" facts (facts.json loads after the page) ---------- */
const FIELD_KEYS = Object.keys(NICHES);
const dayNum = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };
let FACTS = null, factsLoading = null;
const loadFacts = () => (factsLoading ||= fetch(`facts.json?v=${V}`).then((r) => r.json()).then((d) => (FACTS = d)).catch(() => null));
function factFor(n) {
  const list = FACTS?.FIELD_FACTS?.[n] || [];
  return list.length ? list[(dayNum() + FIELD_KEYS.indexOf(n) * 5) % list.length] : null;
}
// A slot that fills in once facts.json arrives. keys = fields it can step through.
const factSlot = (keys, start = 0) => `<div class="fact-slot" data-facts="${keys.join(",")}" data-i="${start}" aria-live="polite"><p class="fact-wait">Loading today's fact…</p></div>`;
function fillFact(slot) {
  const keys = slot.dataset.facts.split(",");
  const i = ((+slot.dataset.i % keys.length) + keys.length) % keys.length;
  const n = keys[i], f = factFor(n);
  if (!f) { slot.innerHTML = ""; return; }
  slot.innerHTML = `
    ${keys.length > 1 ? `<div class="fact-nav">
      <button class="icon-btn" data-step="-1" aria-label="Fact for the previous field">${ICON.left}</button>
      <span class="fact-field">${esc(NICHES[n].label)}</span>
      <span class="mono fact-pos">${i + 1} of ${keys.length}</span>
      <button class="icon-btn" data-step="1" aria-label="Fact for the next field">${ICON.right}</button>
    </div>` : ""}
    <a class="fact" href="${esc(f.url)}" target="_blank" rel="noopener">
      <p class="fact-text">${esc(f.fact)}</p>
      <span class="fact-src"><span class="mono">${esc(FACTS.FACTS_SOURCE.name)}</span> ${esc(f.title)} ${ICON.ext}</span>
    </a>`;
  slot.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
    slot.dataset.i = i + +b.dataset.step;
    fillFact(slot);
    slot.querySelector(`[data-step="${b.dataset.step}"]`).focus();
  }));
}
function mountFacts() {
  const slots = app.querySelectorAll("[data-facts]");
  if (slots.length) loadFacts().then(() => slots.forEach((s) => s.isConnected && fillFact(s)));
}

/* ---------- listing displays ---------- */
// Color only where it means something: free or paid-to-you is green, everything else plain.
function cost(o) {
  if (o.cost === "varies") return `<a class="c-link" href="${esc(o.url)}" target="_blank" rel="noopener">Cost on site ${ICON.ext}</a>`;
  const good = o.cost === "free" || o.cost === "stipend";
  return `<span class="${good ? "c-free" : ""}">${esc(COSTS[o.cost].label)}${o.aid ? " + aid" : ""}</span>`;
}
const markBtn = (o) => `<button class="save" data-save="${o.id}" aria-pressed="${saved.has(o.id)}" aria-label="Save ${esc(o.name)} to your dashboard" title="Save to dashboard">${ICON.mark}</button>`;
const due = (o) => {
  const nd = nextDate(o);
  if (!nd) return `<span class="due none">No date posted yet</span>`;
  return `<span class="due ${soon(nd.date) ? "soon" : ""}"><b>${esc(short(nd.date))}</b> ${esc(nd.label)}${soon(nd.date) ? ` · ${rel(nd.date)}` : ""}</span>`;
};
const TILT = [-0.9, 0.5, -0.3, 0.8, -0.6, 0.2, 0.6, -0.4];
function card(o, i = 0, showType = true) {
  return `<article class="card ${i % 5 === 0 ? "taped" : ""}" data-open="${o.id}" tabindex="0" style="--tilt:${TILT[i % TILT.length]}deg">
    <div class="card-top">${due(o)}${markBtn(o)}</div>
    <h3>${esc(o.name)}</h3>
    <div class="org">${esc(o.org)}</div>
    <p>${esc(o.summary)}</p>
    <div class="meta">
      <span class="step-tag s-${stepOf(o)}">${STEP[stepOf(o)].short}</span>
      ${atWV(o) ? `<span class="aud">At WV</span>` : ""}
      ${o.wv && byId[o.wv] ? `<span class="aud">WV has it: ${esc(byId[o.wv].name)}</span>` : ""}
      ${o.audience ? `<span class="aud">${esc(o.audience)}</span>` : ""}
      ${cost(o)}
      <span>Grades ${gradeText(o.grades)}</span>
      <span>${esc(o.scope === "local" || o.scope === "state" ? o.location : SCOPES[o.scope].label)}</span>
      ${showType ? `<span class="muted">${esc(TYPES[o.type].label)}</span>` : ""}
    </div>
  </article>`;
}
function table(items, showType = true) {
  return `<div class="table-wrap"><table class="db">
    <thead><tr><th>Name</th>${showType ? "<th>Type</th>" : ""}<th>Field</th><th>Step</th><th>Grades</th><th>Cost</th><th>Where</th><th>Next date</th><th class="mark-col"><span class="sr">Save</span></th></tr></thead>
    <tbody>${items.map((o) => {
      const nd = nextDate(o);
      return `<tr data-open="${o.id}" tabindex="0">
        <td><div class="nm">${esc(o.name)}</div><div class="org">${esc(o.org)}</div></td>
        ${showType ? `<td>${esc(TYPES[o.type].label)}</td>` : ""}
        <td class="fields">${o.niches.slice(0, 2).map((n) => esc(NICHES[n].label)).join("<br>")}</td>
        <td><span class="step-tag s-${stepOf(o)}">${STEP[stepOf(o)].label}</span></td>
        <td class="mono">${gradeText(o.grades)}</td>
        <td>${cost(o)}</td>
        <td>${esc(SCOPES[o.scope].label)}<div class="org">${esc(o.location)}</div></td>
        <td>${nd ? `<span class="mono nd ${soon(nd.date) ? "soon" : ""}">${esc(short(nd.date))}</span><div class="org">${esc(nd.label)}</div>` : `<span class="none">Not posted</span>`}</td>
        <td>${markBtn(o)}</td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}
const cards = (items, showType = true) => `<div class="cards">${items.map((o, i) => card(o, i, showType)).join("")}</div>`;

let viewPref = "table";
try { viewPref = localStorage.getItem("stemconnect.view") || "table"; } catch {}
const narrow = () => window.innerWidth < 760;

function dlRow(o, d, link = true) {
  return `<div class="dl-row ${daysUntil(d.date) < 0 ? "past" : ""} ${soon(d.date) ? "soon" : ""}" ${link ? `data-open="${o.id}" tabindex="0"` : ""}>
    <time class="dl-date mono" datetime="${d.date}">${esc(fmt(d.date, { month: "short", day: "2-digit" }))}</time>
    <div class="dl-main">${link ? `<span class="dl-name">${esc(o.name)}</span> <span class="dl-sub">${esc(d.label)} · ${esc(o.org)}</span>` : `<span>${esc(d.label)}</span>`}</div>
    <span class="dl-when mono">${rel(d.date)}</span>
  </div>`;
}
const allDates = () => OPPORTUNITIES.flatMap((o) => o.dates.map((d) => ({ o, d }))).sort((a, b) => a.d.date.localeCompare(b.d.date));

/* ---------- drawer ---------- */
let lastFocus = null;
function openDrawer(id) {
  const o = byId[id];
  if (!o) return;
  lastFocus = document.activeElement;
  const on = saved.has(id);
  const dates = [...o.dates].sort((a, b) => a.date.localeCompare(b.date));
  drawerPanel.innerHTML = `
    <div class="d-head"><span class="mono">${esc(catOf(o).title)}</span><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
    <div class="d-body">
      <h2 id="drawer-title">${esc(o.name)}</h2>
      <div class="d-org">${esc(o.org)} · ${esc(o.location)}</div>
      ${o.audience ? `<p class="aud" style="margin-top:8px">${esc(o.audience)}</p>` : ""}
      ${o.wv && byId[o.wv] ? `<p class="wv-note">Waubonsie Valley already has this: <button class="link" data-open="${o.wv}">${esc(byId[o.wv].name)}</button></p>` : ""}
      ${o.partOf && byId[o.partOf] ? `<p class="wv-note">Part of <button class="link" data-open="${o.partOf}">${esc(byId[o.partOf].name)}</button></p>` : ""}
      <p class="d-sum">${esc(o.summary)}</p>
      <dl class="d-grid">
        <div><dt>Type</dt><dd>${esc(TYPES[o.type].label)}</dd></div>
        <div><dt>Step</dt><dd>${STEP[stepOf(o)].label}</dd></div>
        <div><dt>Grades</dt><dd>${gradeText(o.grades)}</dd></div>
        <div><dt>Cost</dt><dd>${cost(o)}</dd></div>
        <div><dt>When</dt><dd>${esc(SEASONS[o.season])}</dd></div>
        <div><dt>Where</dt><dd>${esc(SCOPES[o.scope].label)}</dd></div>
        <div><dt>Fields</dt><dd>${o.niches.map((n) => `<a href="#/fields/${n}">${esc(NICHES[n].label)}</a>`).join(", ")}</dd></div>
      </dl>
      ${o.facts.length ? `<section class="d-sec"><h3>From the official site</h3><ul class="facts">${o.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></section>` : ""}
      ${dates.length ? `<section class="d-sec"><h3>Dates</h3><div class="dl">${dates.map((d) => dlRow(o, d, false)).join("")}</div>${dates.some((d) => daysUntil(d.date) >= 0) ? `<button class="link cal-add" data-ics="${o.id}">Add to my calendar, with reminders</button>` : ""}</section>` : ""}
      <div class="d-actions">
        <a class="btn primary" href="${esc(o.url)}" target="_blank" rel="noopener">${atWV(o) ? "View on Mosaic" : "Official site"} ${ICON.ext}</a>
        <button class="btn save-btn" data-save="${o.id}" aria-pressed="${on}">${ICON.mark}<span data-t>${on ? "On your dashboard" : "Save to dashboard"}</span></button>
      </div>
      <p class="source mono">${atWV(o) ? `From Mosaic, under Waubonsie Valley · checked ${esc(fmt(WV_CHECKED))}` : `Source: ${esc(o.url)} · checked ${esc(fmt(CHECKED))}`}</p>
    </div>`;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  drawerPanel.scrollTop = 0;
  drawerPanel.focus();
}
function closeDrawer() {
  if (!drawer.classList.contains("open")) return;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  lastFocus?.focus?.();
}
document.addEventListener("click", (e) => {
  const s = e.target.closest("[data-save]");
  if (s) { e.stopPropagation(); toggleSave(s.dataset.save); return; }
  if (e.target.closest("[data-close]")) { closeDrawer(); return; }
  const o = e.target.closest("[data-open]");
  const inner = e.target.closest("a, button, select, input, label");
  if (!o || (inner && inner !== o && o.contains(inner))) return;
  openDrawer(o.dataset.open);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeDrawer(); closeMore(); }
  if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-open]")) { e.preventDefault(); openDrawer(e.target.dataset.open); }
});

/* ---------- database view (used by All + every category tab) ---------- */
const PAGE = 24;
const SCOPE_ORDER = { local: 0, state: 1, online: 2, national: 3 };
function sortList(items, how) {
  return [...items].sort((a, b) => {
    if (how === "az") return a.name.localeCompare(b.name);
    if (how === "near") return SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope] || a.name.localeCompare(b.name);
    if (how === "easy") { const d = STEP_I[stepOf(a)] - STEP_I[stepOf(b)] || openTo9(b) - openTo9(a); if (d) return d; }
    const da = nextDate(a)?.date || "9999", db = nextDate(b)?.date || "9999";
    return da.localeCompare(db) || SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope] || a.name.localeCompare(b.name);
  });
}
const hayOf = (o) => (o._hay ||= [o.name, o.org, o.location, o.summary, ...o.facts, ...o.niches.map((n) => NICHES[n].label), TYPES[o.type].label, atWV(o) ? "waubonsie valley wv school" : ""].join(" ").toLowerCase());

function viewDatabase(slug, qs) {
  const cat = CATS.find((c) => c.slug === slug);
  const base = cat ? OPPORTUNITIES.filter((o) => cat.types.includes(o.type)) : OPPORTUNITIES;
  const p = new URLSearchParams(qs);
  const F = { q: p.get("q") || "", field: p.get("field") || "", type: p.get("type") || "", where: p.get("where") || "", grade: p.get("grade") || "", cost: p.get("cost") || "", fresh: p.get("fresh") === "1", step: p.get("step") || "", also: NICHES[p.get("also")] ? p.get("also") : "", fits: p.get("fits") === "1" && !!profile, wv: p.get("wv") === "1", sort: p.get("sort") || "easy" };
  const typeOpts = cat ? cat.types : Object.keys(TYPES);
  const showType = !cat || cat.types.length > 1;
  const sel = (id, label, opts, cur) => `<label class="pick"><span>${label}</span><select id="${id}">${opts.map(([v, t]) => `<option value="${v}" ${cur == v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;

  app.innerHTML = `<div class="container">
    <header class="page-head">
      <div class="crumbs mono"><a href="#/">Home</a> / ${cat ? esc(cat.tab) : "All"}</div>
      <h1>${cat ? esc(cat.title) : "Everything"}</h1>
      <p class="lede">${cat ? esc(cat.blurb) : "Every program, internship, competition, club, volunteer role, course and certification in one list."}</p>
    </header>
    <div class="db-tools">
      <div class="db-search">${ICON.search}<input id="q" type="search" value="${esc(F.q)}" placeholder="Search ${cat ? esc(cat.tab.toLowerCase()) : "everything"}" aria-label="Search" autocomplete="off" /></div>
      <button class="btn filters-btn" id="filters-btn" aria-expanded="false" aria-controls="filters">Filters <span class="badge" id="fcount"></span></button>
    </div>
    <div class="db-filters" id="filters">
      ${sel("field", "Field", [["", "All fields"], ...Object.entries(NICHES).map(([k, n]) => [k, n.label])], F.field)}
      ${typeOpts.length > 1 ? sel("type", "Type", [["", "All types"], ...typeOpts.map((k) => [k, TYPES[k].plural])], F.type) : ""}
      ${sel("step", "Step", [["", "Any size step"], ...STEPS.map((s) => [s.key, s.label])], F.step)}
      ${sel("where", "Where", [["", "Anywhere"], ...Object.entries(SCOPES).map(([k, v]) => [k, v.label])], F.where)}
      ${sel("grade", "Grade", [["", "Any grade"], ...[9, 10, 11, 12].map((g) => [g, `${g}th grade`])], F.grade)}
      ${sel("cost", "Cost", [["", "Any cost"], ["free", "Free or paid to you"], ["aid", "Free, low cost or aid"], ["stipend", "Paid to you"]], F.cost)}
      <label class="check"><input type="checkbox" id="fresh" ${F.fresh ? "checked" : ""}/> Open to 9th graders</label>
      ${base.some(atWV) ? `<label class="check"><input type="checkbox" id="wv" ${F.wv ? "checked" : ""}/> Clubs at WV</label>` : ""}
      ${profile ? `<label class="check"><input type="checkbox" id="fits" ${F.fits ? "checked" : ""}/> Fits my quiz answers</label>` : ""}
    </div>
    ${F.also ? `<p class="also-note mono">Also in ${esc(NICHES[F.also].label)} · <a class="link" href="#/${slug}?field=${F.field}">remove</a></p>` : ""}
    <div class="db-meta">
      <span><b id="count"></b> <button class="link" id="clear" hidden>Clear filters</button></span>
      <span class="db-meta-r">
        <label class="pick inline"><span>Sort</span><select id="sort">
          <option value="easy" ${F.sort === "easy" ? "selected" : ""}>Easiest first</option>
          <option value="deadline" ${F.sort === "deadline" ? "selected" : ""}>Next date</option>
          <option value="az" ${F.sort === "az" ? "selected" : ""}>A–Z</option>
          <option value="near" ${F.sort === "near" ? "selected" : ""}>Closest to Naperville</option>
        </select></label>
        <span class="views no-print"><button data-view="table" aria-pressed="${viewPref === "table"}">List</button><button data-view="cards" aria-pressed="${viewPref === "cards"}">Cards</button></span>
      </span>
    </div>
    <div id="results"></div>
  </div>`;

  let items = [], shown = PAGE;
  const draw = () => {
    const el = document.getElementById("results");
    if (!items.length) { el.innerHTML = `<div class="empty"><b>Nothing matches those filters.</b>Try removing one, or <a class="link" href="#/suggest">suggest a listing</a>.</div>`; return; }
    const page = items.slice(0, shown);
    const left = items.length - page.length;
    el.innerHTML = (viewPref === "cards" || narrow() ? cards(page, showType) : table(page, showType)) +
      (left ? `<div class="more-row"><button class="btn" id="more-results">Show ${Math.min(PAGE, left)} more</button><span class="mono muted">${page.length} of ${items.length}</span></div>` : "");
    document.getElementById("more-results")?.addEventListener("click", () => { shown += PAGE; draw(); });
  };
  const update = () => {
    const words = F.q.toLowerCase().split(/\s+/).filter(Boolean);
    items = sortList(base.filter((o) => {
      if (words.length && !words.every((w) => hayOf(o).includes(w))) return false;
      if (F.field && !o.niches.includes(F.field)) return false;
      if (F.also && !o.niches.includes(F.also)) return false;
      if (F.step && stepOf(o) !== F.step) return false;
      if (F.fits && !fitsLimits(o, profile.limits)) return false;
      if (F.wv && !atWV(o)) return false;
      if (F.type && o.type !== F.type) return false;
      if (F.where && o.scope !== F.where) return false;
      if (F.grade && !o.grades.includes(+F.grade)) return false;
      if (F.fresh && !openTo9(o)) return false;
      if (F.cost === "free" && !(o.cost === "free" || o.cost === "stipend")) return false;
      if (F.cost === "stipend" && o.cost !== "stipend") return false;
      if (F.cost === "aid" && !(["free", "stipend", "low"].includes(o.cost) || o.aid)) return false;
      return true;
    }), F.sort);
    shown = PAGE;
    const nFilters = ["field", "type", "step", "where", "grade", "cost", "fresh", "fits", "wv"].filter((k) => F[k]).length;
    document.getElementById("count").textContent = `${items.length} ${items.length === 1 ? "listing" : "listings"}`;
    document.getElementById("clear").hidden = !(F.q || nFilters);
    document.getElementById("fcount").textContent = nFilters || "";
    draw();
    const out = new URLSearchParams();
    Object.entries(F).forEach(([k, v]) => { if (v && !(k === "sort" && v === "easy")) out.set(k, v === true ? "1" : v); });
    history.replaceState(null, "", `#/${slug}${out.toString() ? "?" + out : ""}`);
  };
  const typed = debounce(update, 160);
  document.getElementById("q").addEventListener("input", (e) => { F.q = e.target.value.trim(); typed(); });
  ["field", "type", "step", "where", "grade", "cost", "sort"].forEach((k) => document.getElementById(k)?.addEventListener("change", (e) => { F[k] = e.target.value; update(); }));
  document.getElementById("fresh").addEventListener("change", (e) => { F.fresh = e.target.checked; update(); });
  document.getElementById("fits")?.addEventListener("change", (e) => { F.fits = e.target.checked; update(); });
  document.getElementById("wv")?.addEventListener("change", (e) => { F.wv = e.target.checked; update(); });
  document.getElementById("clear").addEventListener("click", () => { location.hash = `#/${slug}`; });
  const fb = document.getElementById("filters-btn"), fl = document.getElementById("filters");
  fb.addEventListener("click", () => { const open = !fl.classList.contains("open"); fl.classList.toggle("open", open); fb.setAttribute("aria-expanded", open); });
  app.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    viewPref = b.dataset.view;
    try { localStorage.setItem("stemconnect.view", viewPref); } catch {}
    app.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    draw();
  }));
  update();
}

/* ---------- your path: quiz profile, directions and suggestions ---------- */
// How-you-like-to-work answers that point to a type of listing.
const TRAIT_TYPES = { people: ["club", "volunteer"], competing: ["competition"], research: ["research"] };

let profile = store.get("profile", null);
try { localStorage.removeItem("stemconnect.journal"); } catch {} // the old journal feature, now removed

// Does a listing fit the grade, distance, budget and time the student gave in the quiz?
function fitsLimits(o, L) {
  if (!L) return true;
  if (o.audience && L.girls !== "yes") return false;
  if (L.grade && !o.grades.includes(L.grade)) return false;
  const sc = { near: ["local", "online"], il: ["local", "state", "online"], us: ["local", "state", "national", "online"], online: ["online"] }[L.where];
  if (sc && !sc.includes(o.scope)) return false;
  if (L.budget === "free" && !(o.cost === "free" || o.cost === "stipend")) return false;
  if (L.budget === "low" && o.cost === "paid" && !o.aid) return false;
  const max = { little: 1, some: 2, lots: 3 }[L.time] ?? 3;
  return STEP_I[stepOf(o)] <= max;
}

const fieldScores = () => Object.fromEntries(FIELD_KEYS.map((k) => [k, profile?.scores?.[k] || 0]));
function directions() {
  const s = fieldScores();
  const ranked = FIELD_KEYS.filter((k) => s[k] > 0).sort((a, b) => s[b] - s[a]);
  if (!ranked.length) return [];
  return ranked.filter((k, i) => i < 2 || s[k] >= s[ranked[0]] * 0.45).slice(0, 4);
}
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const topWhys = (k, n) => [...new Set((profile?.reasons?.[k] || []).slice().sort((a, b) => b.w - a.w).map((x) => x.why))].slice(0, n);
function reasonFor(k) {
  const whys = topWhys(k, 2);
  return whys.length ? cap(whys.join(", and ")) + "." : "";
}

// Suggestions: listings in your directions that fit your limits. Things you marked Done
// on the dashboard move that field one step up the ladder.
const doneIn = (f) => [...saved].map((id) => byId[id]).filter((o) => o && status[o.id] === "done" && o.niches.includes(f)).sort((a, b) => STEP_I[stepOf(b)] - STEP_I[stepOf(a)]);
function whyFor(o, f) {
  const done = doneIn(f)[0];
  return done ? `${NICHES[f].label} · next step after ${done.name}` : NICHES[f].label;
}
function suggestions(n = 6) {
  const dirs = directions();
  if (!dirs.length) return [];
  const s = fieldScores();
  const maxStep = { little: 1, some: 2, lots: 3 }[profile?.limits?.time] ?? 3;
  const target = Object.fromEntries(dirs.map((f) => { const d = doneIn(f)[0]; return [f, d ? Math.min(maxStep, STEP_I[stepOf(d)] + 1) : 0]; }));
  const traits = profile?.traits || {};
  const ranked = OPPORTUNITIES.filter((o) => !saved.has(o.id) && fitsLimits(o, profile?.limits)).map((o) => {
    const fs = o.niches.filter((f) => dirs.includes(f)).sort((a, b) => s[b] - s[a]);
    if (!fs.length) return null;
    const f = fs[0], gap = STEP_I[stepOf(o)] - target[f];
    let sc = s[f] + (gap === 0 ? 5 : gap === 1 ? 2 : gap < 0 ? -1 : -3 * gap);
    Object.entries(TRAIT_TYPES).forEach(([t, types]) => { if (traits[t] && types.includes(o.type)) sc += traits[t]; });
    const nd = nextDate(o);
    if (nd && daysUntil(nd.date) <= 60) sc += 1;
    if (openTo9(o)) sc += 0.5;
    return { o, f, sc };
  }).filter(Boolean).sort((a, b) => b.sc - a.sc || a.o.name.localeCompare(b.o.name));
  // Take turns across directions so one field doesn't fill the list.
  const queues = dirs.map((f) => ranked.filter((x) => x.f === f));
  const out = [];
  for (let round = 0; out.length < n && queues.some((q) => q.length > round); round++)
    queues.forEach((q) => { if (q[round] && out.length < n) out.push({ ...q[round], why: whyFor(q[round].o, q[round].f) }); });
  return out;
}
const sugRow = (x) => `<div class="sug" data-open="${x.o.id}" tabindex="0">
  <div class="sug-main"><span class="step-tag s-${stepOf(x.o)}">${STEP[stepOf(x.o)].short}</span><b>${esc(x.o.name)}</b> <span class="muted">${esc(x.o.org)}</span><p class="sug-why">${esc(x.why)}</p></div>
  ${markBtn(x.o)}
</div>`;
const miniRow = (o) => `<div class="mini" data-open="${o.id}" tabindex="0"><span class="step-tag s-${stepOf(o)}">${STEP[stepOf(o)].short}</span><span class="mini-name">${esc(o.name)}</span><span class="mini-org">${esc(o.org)}</span></div>`;

/* ---------- calendar file with reminders (3 days and 1 day before) ---------- */
function downloadICS(events, filename) {
  const esc2 = (s) => s.replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const day = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//stem.connect//EN", "CALSCALE:GREGORIAN"];
  events.forEach(({ o, d }) => {
    const start = parse(d.date), end = parse(d.date); end.setDate(end.getDate() + 1);
    L.push("BEGIN:VEVENT", `UID:${o.id}-${d.date}@stem.connect`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day(start)}`, `DTEND;VALUE=DATE:${day(end)}`,
      `SUMMARY:${esc2(`${o.name}: ${d.label}`)}`, `DESCRIPTION:${esc2(`Confirm on the official site: ${o.url}`)}`, `URL:${o.url}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc2(`${o.name}: ${d.label} in 3 days`)}`, "TRIGGER:-P3D", "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc2(`${o.name}: ${d.label} tomorrow`)}`, "TRIGGER:-P1D", "END:VALARM", "END:VEVENT");
  });
  L.push("END:VCALENDAR");
  const url = URL.createObjectURL(new Blob([L.join("\r\n") + "\r\n"], { type: "text/calendar" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const upcomingOf = (list) => list.flatMap((o) => o.dates.map((d) => ({ o, d }))).filter(({ d }) => daysUntil(d.date) >= 0).sort((x, y) => x.d.date.localeCompare(y.d.date));
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ics]");
  if (!b) return;
  e.stopPropagation();
  const list = b.dataset.ics === "saved" ? [...saved].map((id) => byId[id]).filter(Boolean) : [byId[b.dataset.ics]].filter(Boolean);
  const ev = upcomingOf(list);
  if (!ev.length) { toast("No upcoming dates to add"); return; }
  downloadICS(ev, b.dataset.ics === "saved" ? "stem-connect-dates.ics" : `${b.dataset.ics}.ics`);
  toast(`${ev.length} date${ev.length > 1 ? "s" : ""} ready for your calendar`);
}, true);

let calMonth = null;
function calendarHTML(events) {
  const m = calMonth || todayISO().slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  const lead = new Date(y, mo - 1, 1).getDay(), days = new Date(y, mo, 0).getDate(), t = todayISO();
  const by = {};
  events.forEach((x) => { if (x.d.date.startsWith(m)) (by[+x.d.date.slice(8)] ||= []).push(x); });
  let cells = `<div class="cal-day blank"></div>`.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const iso = `${m}-${String(d).padStart(2, "0")}`, ev = by[d] || [];
    cells += `<div class="cal-day ${iso === t ? "today" : ""} ${ev.length ? "has" : ""}"><span class="cal-n mono">${d}</span>${ev.map(({ o, d: dd }) => `<button class="cal-ev ${soon(dd.date) ? "soon" : ""}" data-open="${o.id}" title="${esc(o.name)}: ${esc(dd.label)}"><span>${esc(o.name)}</span></button>`).join("")}</div>`;
  }
  const count = Object.values(by).flat().length;
  return `<div class="cal" id="cal">
    <div class="cal-head"><b>${parse(m + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</b><span class="mono muted">${count} date${count === 1 ? "" : "s"}</span><button class="icon-btn" data-cal="-1" aria-label="Previous month">${ICON.left}</button><button class="icon-btn" data-cal="1" aria-label="Next month">${ICON.right}</button></div>
    <div class="cal-grid">${["S", "M", "T", "W", "T", "F", "S"].map((w) => `<div class="cal-w mono">${w}</div>`).join("")}${cells}</div>
  </div>`;
}
function bindCalendar(events) {
  app.querySelectorAll("[data-cal]").forEach((b) => b.addEventListener("click", () => {
    const [y, mo] = (calMonth || todayISO().slice(0, 7)).split("-").map(Number);
    const d = new Date(y, mo - 1 + +b.dataset.cal, 1);
    calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    document.getElementById("cal").outerHTML = calendarHTML(events);
    bindCalendar(events);
  }));
}

/* ---------- home ---------- */
// Hand-drawn doodles for the hero. Plain strokes so they read like pen on paper.
const DOODLES = `<svg class="doodles" viewBox="0 0 420 360" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <g class="d-flask"><path d="M150 40c1 18 0 40-1 52-14 24-34 52-36 70-2 16 10 22 40 22s44-6 41-22c-3-18-22-44-35-68-2-14-2-36-1-54"/><path d="M142 40c8-2 18-2 24 0"/><path d="M122 140c18 6 38-6 60 2"/><circle cx="146" cy="160" r="4"/><circle cx="164" cy="152" r="3"/><path d="M158 118c2 6 0 10 3 14"/></g>
  <g class="d-atom"><ellipse cx="320" cy="96" rx="62" ry="22" transform="rotate(-24 320 96)"/><ellipse cx="320" cy="96" rx="62" ry="21" transform="rotate(34 320 96)"/><ellipse cx="320" cy="96" rx="20" ry="61" transform="rotate(4 320 96)"/><circle cx="320" cy="96" r="6" fill="currentColor"/></g>
  <g class="d-gear"><path d="M306 254l8-3 2-14 13 1 3 13 8 4 11-8 9 9-8 11 4 8 13 3v13l-13 3-4 8 8 11-9 9-11-8-8 4-3 13h-13l-3-13-8-4-11 8-9-9 8-11-4-8-13-3v-13l13-3 4-8-8-11 9-9z"/><circle cx="324" cy="283" r="13"/></g>
  <g class="d-rocket"><path d="M66 300c-6-30 6-62 30-80 12 26 10 60-10 84z"/><path d="M66 300l-14 10 10-26"/><path d="M86 304l2 18 8-24"/><circle cx="84" cy="250" r="7"/><path d="M58 322c-4 8-10 12-16 14m26-6c-2 8-6 14-12 18"/></g>
  <g class="d-stars"><path d="M232 40v14m-7-7h14"/><path d="M48 120v10m-5-5h10"/><path d="M392 200v10m-5-5h10"/><path d="M220 318v12m-6-6h12"/></g>
  <path class="d-squiggle" d="M186 214c14-10 24 8 38-2s24 8 38-2 24 8 38-2"/>
</svg>`;

function viewHome() {
  const up = allDates().filter(({ d }) => daysUntil(d.date) >= 0).slice(0, 8);
  const start = dayNum() % FIELD_KEYS.length;
  const dirs = directions(), sug = dirs.length ? suggestions(3) : [];
  app.innerHTML = `<div class="container">
    <section class="hero">
      <div class="hero-text">
        <h1>Find your way into STEM <em>outside of school.</em></h1>
        <p class="lede">${OPPORTUNITIES.length} internships, programs, competitions, clubs, volunteer roles, courses and certifications for high schoolers in IPSD 204 and beyond. Each one is checked on its official site.</p>
        <form class="big-search" id="home-search" role="search">
          ${ICON.search}<input id="home-q" type="search" placeholder="robotics, hospital, NASA, Python…" aria-label="Search all listings" autocomplete="off" />
          <button class="btn primary" type="submit">Search</button>
        </form>
        <p class="hero-quick">Start with <a href="#/all?fresh=1">open to 9th graders</a>, <a href="#/all?cost=free">free</a>, <a href="#/all?where=local">near Naperville</a> or <a href="#/clubs?wv=1">clubs at WV</a>.</p>
      </div>
      <div class="hero-art">${DOODLES}<span class="note mono">last checked ${esc(fmt(CHECKED, { month: "short", day: "numeric" }))}</span></div>
    </section>

    ${dirs.length ? `<section class="path">
      <div class="sec-head"><h2>Your path so far</h2><a class="link" href="#/dashboard">My dashboard</a></div>
      <p class="path-dirs">Your directions: ${dirs.map((f) => `<a href="#/fields/${f}">${esc(NICHES[f].label)}</a>`).join(", ")}.</p>
      ${sug.length ? `<div class="sugs">${sug.map(sugRow).join("")}</div>` : ""}
    </section>` : `<section class="how">
      <a class="how-quiz" href="#/quiz"><b>Take the quiz</b><span>Answer a few questions and get 2–4 fields to start with.</span>${ICON.right}</a>
    </section>`}

    <section class="today">
      <div class="sec-head"><h2>Did you know?</h2><span class="mono muted">${esc(new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }))}</span></div>
      ${factSlot(FIELD_KEYS, start)}
    </section>

    <div class="home-cols">
      <section>
        <div class="sec-head"><h2>By type</h2><a class="link" href="#/all">See all ${OPPORTUNITIES.length}</a></div>
        <ol class="toc">${CATS.map((c) => `<li><a href="#/${c.slug}"><span class="toc-name">${esc(c.tab)}</span><i class="leader"></i><span class="mono">${count((o) => c.types.includes(o.type))}</span></a><small>${esc(c.blurb)}</small></li>`).join("")}
          <li><a href="#/clubs?wv=1"><span class="toc-name">Clubs at WV</span><i class="leader"></i><span class="mono">${WV_CLUBS.length}</span></a><small>STEM clubs at Waubonsie Valley, from Mosaic.</small></li></ol>
      </section>
      <section>
        <div class="sec-head"><h2>By field</h2><a class="link" href="#/fields">All fields</a></div>
        <ol class="toc">${Object.entries(NICHES).map(([k, n]) => `<li><a href="#/fields/${k}"><span class="toc-name">${esc(n.label)}</span><i class="leader"></i><span class="mono">${count((o) => o.niches.includes(k))}</span></a></li>`).join("")}</ol>
      </section>
    </div>

    <section class="block">
      <div class="sec-head"><h2>Coming up</h2><a class="link" href="#/deadlines">All dates</a></div>
      <div class="dl">${up.map(({ o, d }) => dlRow(o, d)).join("")}</div>
    </section>
  </div>`;
  document.getElementById("home-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("home-q").value.trim();
    location.hash = `#/all${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  });
}


/* ---------- fields ---------- */
function viewFields() {
  app.innerHTML = `<div class="container">
    <header class="page-head">
      <div class="crumbs mono"><a href="#/">Home</a> / Fields</div>
      <h1>Pick a field</h1>
      <p class="lede">Everything in a field, sorted by type.</p>
    </header>
    <ol class="toc toc-big">${Object.entries(NICHES).map(([k, n]) => {
      const items = OPPORTUNITIES.filter((o) => o.niches.includes(k));
      const parts = CATS.map((c) => [c, items.filter((o) => c.types.includes(o.type)).length]).filter(([, x]) => x);
      return `<li><a href="#/fields/${k}"><span class="toc-name">${esc(n.label)}</span><i class="leader"></i><span class="mono">${items.length}</span></a>
        <small>${parts.map(([c, x]) => `${x} ${esc(c.tab.toLowerCase())}`).join(" · ")}</small></li>`;
    }).join("")}</ol>
  </div>`;
}
const jobCard = (c) => `<article class="job">
  <h3>${esc(c.title)}</h3>
  <ul>${c.tasks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
  <p class="job-edu mono">${esc(c.edu)}</p>
  <a class="link" href="${esc(c.url)}" target="_blank" rel="noopener">More on O*NET ${ICON.ext}</a>
</article>`;
const storyCard = (s) => `<a class="story" href="${esc(s.url)}" target="_blank" rel="noopener">
  <span class="mono muted">${esc(fmt(s.date, { month: "short", year: "numeric" }))}</span>
  <h3>${esc(s.title)}</h3>
  <p>${esc(s.blurb)}</p>
  <span class="story-src">Read it on Science News Explores ${ICON.ext}</span>
</a>`;
function viewField(key) {
  const n = NICHES[key];
  if (!n) return viewFields();
  const X = EX.FIELDS[key];
  const items = OPPORTUNITIES.filter((o) => o.niches.includes(key));
  const groups = CATS.map((c) => [c, sortList(items.filter((o) => c.types.includes(o.type)), "easy")]).filter(([, x]) => x.length);
  const ladder = STEPS.map((s) => [s, sortList(items.filter((o) => stepOf(o) === s.key), "easy")]);
  const crosses = EX.CROSSOVERS.filter((c) => c.fields.includes(key));
  const crossCard = (c) => {
    const others = c.fields.filter((f) => f !== key), job = EX.CAREERS[c.career];
    const both = items.filter((o) => o.niches.includes(others[0])).length;
    return `<article class="cross">
      <div class="mono muted">${[key, ...others].map((f) => esc(NICHES[f].label)).join(" + ")}</div>
      <h3>${esc(c.name)}</h3>
      <p>${esc(c.blurb)}</p>
      <p class="cross-links"><a class="link" href="${esc(job.url)}" target="_blank" rel="noopener">The job: ${esc(job.title)} ${ICON.ext}</a>${both ? `<br><a class="link" href="#/all?field=${key}&also=${others[0]}">${both} listings in both fields</a>` : ""}</p>
    </article>`;
  };
  app.innerHTML = `<div class="container">
    <header class="page-head">
      <div class="crumbs mono"><a href="#/">Home</a> / <a href="#/fields">Fields</a> / ${esc(n.label)}</div>
      <h1>${esc(n.label)}</h1>
      <p class="lede">${esc(X.intro)} ${items.length} listings.</p>
      <nav class="jump" aria-label="On this page">
        <a href="#f-work" data-jump="f-work">What the work is like</a>
        <a href="#f-ladder" data-jump="f-ladder">Try it</a>
        ${crosses.length ? `<a href="#f-cross" data-jump="f-cross">Crossovers</a>` : ""}
        <a href="#f-teens" data-jump="f-teens">Real teens</a>
        ${WV_CLUBS.some((o) => o.niches.includes(key)) ? `<a href="#f-wv" data-jump="f-wv">At WV</a>` : ""}
        <a href="#f-all" data-jump="f-all">Everything <span class="mono">${items.length}</span></a>
      </nav>
    </header>
    <section class="today slim">${factSlot([key])}</section>

    <section class="group" id="f-work">
      <h2>What the work looks like</h2>
      <p class="sec-note">From O*NET, the U.S. Department of Labor.</p>
      <div class="jobs">${X.careers.map((c) => jobCard(EX.CAREERS[c])).join("")}</div>
      <h3 class="sub-h">Smaller areas inside ${esc(n.label)}</h3>
      <ul class="subs">${X.subs.map((s) => `<li><b>${esc(s.name)}</b><span>${esc(s.blurb)}</span>${s.topic ? `<a class="link" href="${EX.SOURCES.topic}${s.topic}" target="_blank" rel="noopener">Read about it ${ICON.ext}</a>` : ""}</li>`).join("")}</ul>
    </section>

    <section class="group" id="f-ladder">
      <h2>Try it, one step at a time</h2>
      <ol class="ladder">${ladder.map(([s, list], i) => `<li class="rung">
        <div class="rung-head"><span class="rung-n mono">${i + 1}</span><b>${s.label}</b><small>${s.hint}</small></div>
        ${list.length ? `<div class="mini-list">${list.slice(0, 3).map(miniRow).join("")}</div>${list.length > 3 ? `<a class="link rung-more" href="#/all?field=${key}&step=${s.key}">See all ${list.length}</a>` : ""}` : `<p class="muted rung-none">Nothing listed for this step yet. Try the next one.</p>`}
      </li>`).join("")}</ol>
    </section>

    ${crosses.length ? `<section class="group" id="f-cross">
      <h2>Where ${esc(n.label)} crosses over</h2>
      <div class="crosses">${crosses.map(crossCard).join("")}</div>
    </section>` : ""}

    <section class="group" id="f-teens">
      <h2>Real teens doing ${esc(n.label)}</h2>
      <p class="sec-note">From Science News Explores.</p>
      <div class="stories">${X.stories.map((s) => storyCard(EX.STORIES[s])).join("")}</div>
    </section>

    ${WV_CLUBS.some((o) => o.niches.includes(key)) ? `<section class="group" id="f-wv">
      <h2>Clubs at Waubonsie Valley</h2>
      <p class="sec-note">From <a class="link" href="https://mosaic-204.vercel.app/" target="_blank" rel="noopener">Mosaic</a>.</p>
      <div class="mini-list wv-list">${WV_CLUBS.filter((o) => o.niches.includes(key)).map(miniRow).join("")}</div>
    </section>` : ""}

    <section class="group" id="f-all">
      <h2>Everything in ${esc(n.label)} <span class="mono muted">${items.length}</span></h2>
      ${groups.map(([c, x]) => `<h3 class="sub-h">${esc(c.title)} <span class="mono muted">${x.length}</span></h3>${cards(x, c.types.length > 1)}`).join("")}
    </section>
  </div>`;
  app.querySelectorAll("[data-jump]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById(a.dataset.jump).scrollIntoView({ behavior: "smooth" });
  }));
}


/* ---------- deadlines ---------- */
function viewDeadlines(qs) {
  const showPast = new URLSearchParams(qs).get("past") === "1";
  const items = allDates().filter(({ d }) => showPast || daysUntil(d.date) >= 0);
  const months = {};
  items.forEach((x) => { const k = x.d.date.slice(0, 7); (months[k] ||= []).push(x); });
  app.innerHTML = `<div class="container">
    <header class="page-head">
      <div class="crumbs mono"><a href="#/">Home</a> / Deadlines</div>
      <h1>Deadlines</h1>
      <p class="lede">Dates posted on official sites. Red means it's in the next ${SOON} days. <a class="link" href="#/deadlines${showPast ? "" : "?past=1"}">${showPast ? "Hide past dates" : "Show past dates"}</a></p>
    </header>
    ${Object.entries(months).map(([k, rows]) => `<section class="group">
      <h2>${esc(parse(k + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" }))} <span class="mono muted">${rows.length}</span></h2>
      <div class="dl">${rows.map(({ o, d }) => dlRow(o, d)).join("")}</div>
    </section>`).join("") || `<p class="muted">No upcoming dates.</p>`}
  </div>`;
}

/* ---------- quiz: what you actually do, then your limits ---------- */
const QUIZ = [
  { key: "time", multi: true, q: "What do you lose track of time doing?", hint: "Pick everything that fits.", options: [
    { t: "Building or fixing things", why: "you lose track of time building and fixing things", w: { robo: 3, eng: 3 }, traits: ["hands"] },
    { t: "Coding, games or making apps", why: "you lose track of time coding or making games", w: { cs: 3, ai: 2 }, traits: ["coding"] },
    { t: "Puzzles, riddles or strategy games", why: "you get lost in puzzles and strategy games", w: { math: 3, cyber: 2, cs: 1 }, traits: ["puzzles"] },
    { t: "Being outside, with animals or plants", why: "you love being outside with animals and plants", w: { bio: 3, env: 3 }, traits: ["outdoors"] },
    { t: "Helping or taking care of people", why: "you like helping and taking care of people", w: { med: 3, bio: 1 }, traits: ["people"] },
    { t: "Cooking, mixing or experimenting", why: "you like mixing and experimenting", w: { chem: 3, bio: 1 }, traits: ["lab"] },
    { t: "Wondering how the universe works", why: "you wonder how the universe works", w: { space: 3, phys: 3 }, traits: ["research"] },
    { t: "Drawing or designing things", why: "you like designing things", w: { eng: 2, cs: 1, robo: 1 }, traits: ["design"] },
  ] },
  { key: "videos", multi: true, q: "What do you watch videos about for fun?", hint: "Pick everything that fits.", options: [
    { t: "Space and rockets", why: "you watch videos about space and rockets", w: { space: 3, phys: 1 } },
    { t: "Animals and nature", why: "you watch animal and nature videos", w: { bio: 2, env: 2 } },
    { t: "How things are made", why: "you watch videos about how things are made", w: { eng: 3, robo: 1 } },
    { t: "Robots and gadgets", why: "you watch videos about robots and gadgets", w: { robo: 3, eng: 1 } },
    { t: "Hackers, scams and online security", why: "you watch videos about hackers and scams", w: { cyber: 3, cs: 1 } },
    { t: "AI and new tech", why: "you follow AI and new tech", w: { ai: 3, cs: 1 } },
    { t: "Doctors and the human body", why: "you watch videos about medicine and the body", w: { med: 3, bio: 1 } },
    { t: "Science experiments", why: "you watch science experiment videos", w: { chem: 3, phys: 1 } },
    { t: "Math tricks and puzzles", why: "you watch math puzzle videos", w: { math: 3 } },
    { t: "Coding and game making", why: "you watch coding and game-making videos", w: { cs: 3 } },
    { t: "Weather, climate and disasters", why: "you watch videos about weather and disasters", w: { env: 3, space: 1 } },
    { t: "None of these", w: {} },
  ] },
  { key: "class", multi: true, q: "Which school units did you actually like?", hint: "Pick as many as you want.", options: [
    { t: "Cells, DNA and genetics", why: "you liked learning about cells and DNA", w: { bio: 3, med: 1 } },
    { t: "The human body", why: "you liked the human body unit", w: { med: 3, bio: 1 } },
    { t: "Ecology and the environment", why: "you liked the ecology unit", w: { env: 3, bio: 1 } },
    { t: "Chemical reactions", why: "you liked chemical reactions", w: { chem: 3 } },
    { t: "Forces, motion and energy", why: "you liked forces and motion", w: { phys: 3, eng: 1 } },
    { t: "Space and Earth science", why: "you liked space and Earth science", w: { space: 3, env: 1 } },
    { t: "Algebra, geometry or proofs", why: "you liked algebra and geometry", w: { math: 3 } },
    { t: "Statistics and data", why: "you liked working with data", w: { math: 2, ai: 2 } },
    { t: "A coding or computer class", why: "you liked your computer class", w: { cs: 3, cyber: 1 } },
    { t: "Shop, design or engineering", why: "you liked your engineering class", w: { eng: 3, robo: 2 } },
    { t: "None yet", w: {} },
  ] },
  { key: "fix", multi: true, max: 2, q: "If you could fix one or two problems, what would they be?", hint: "Pick up to two.", options: [
    { t: "Diseases and health care", why: "you'd want to fix disease and health care", w: { med: 3, bio: 2 } },
    { t: "Climate change and pollution", why: "you'd want to fix climate change and pollution", w: { env: 3, chem: 1 } },
    { t: "Hackers stealing people's data", why: "you'd want to stop hackers", w: { cyber: 3 } },
    { t: "Clean water and energy for everyone", why: "you'd want everyone to have clean water and energy", w: { eng: 3, env: 1, chem: 1 } },
    { t: "Getting humans to Mars", why: "you'd want to get humans to Mars", w: { space: 3, eng: 1 } },
    { t: "Dangerous jobs machines could do", why: "you'd want machines to do dangerous jobs", w: { robo: 3, ai: 1 } },
    { t: "AI that people can't trust", why: "you'd want AI that people can trust", w: { ai: 3, cyber: 1 } },
    { t: "Something for my community, like an app", why: "you'd want to build something for your community", w: { cs: 2, eng: 1 } },
    { t: "An unsolved puzzle, like a famous math problem", why: "you'd want to crack an unsolved problem", w: { math: 3, phys: 1 } },
  ] },
  { key: "how", multi: true, q: "How do you like to work?", hint: "Pick everything that fits.", options: [
    { t: "With my hands", traits: ["hands"] },
    { t: "On a computer", traits: ["coding"] },
    { t: "Outside", traits: ["outdoors"] },
    { t: "With a team or other people", traits: ["people"] },
    { t: "On my own, thinking hard", traits: ["puzzles", "research"] },
    { t: "Competing against others", traits: ["competing"] },
  ] },
  { key: "limits", limits: true, q: "A few practical things", hint: "" },
];
const LIMITS = [
  { key: "grade", label: "Your grade", options: [[9, "9th"], [10, "10th"], [11, "11th"], [12, "12th"]] },
  { key: "where", label: "How far can you go?", options: [["near", "Near Naperville, or online"], ["il", "Anywhere in Illinois"], ["us", "Anywhere in the U.S."], ["online", "Online only"]] },
  { key: "budget", label: "Budget", options: [["free", "Free only"], ["low", "Low cost or financial aid is OK"], ["any", "Cost isn't a problem"]] },
  { key: "time", label: "Free time right now", options: [["little", "An hour or two a week"], ["some", "A few hours a week"], ["lots", "A lot, or I'm planning my summer"]] },
  { key: "girls", optional: true, label: "Include programs just for girls and gender-expansive students?", note: "Optional.", options: [["yes", "Yes"], ["no", "No"]] },
];
let qStep = 0, qAns = {};
function buildProfile() {
  const scores = {}, reasons = {}, traits = {};
  QUIZ.filter((s) => !s.limits).forEach((s) => (qAns[s.key] || []).forEach((i) => {
    const o = s.options[i];
    Object.entries(o.w || {}).forEach(([k, w]) => { scores[k] = (scores[k] || 0) + w; if (o.why) (reasons[k] ||= []).push({ why: o.why, w }); });
    (o.traits || []).forEach((t) => (traits[t] = (traits[t] || 0) + 1));
  }));
  profile = { scores, reasons, traits, limits: { ...qAns.limits }, at: todayISO() };
  store.set("profile", profile);
}
function viewQuiz() {
  const s = QUIZ[qStep];
  const L = qAns.limits ||= {};
  const ready = s.limits ? LIMITS.every((g) => g.optional || L[g.key] != null) : (qAns[s.key] || []).length > 0;
  const choice = (attrs, pressed, text, sub = "") => `<button class="choice" ${attrs} aria-pressed="${pressed}"><span class="box" aria-hidden="true"></span><span>${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ""}</span></button>`;
  app.innerHTML = `<div class="container"><div class="quiz">
    <div class="crumbs mono"><a href="#/">Home</a> / Quiz · ${qStep + 1} of ${QUIZ.length}</div>
    ${qStep === 0 && profile ? `<p class="quiz-note">You took this on ${esc(fmt(profile.at, { month: "short", day: "numeric" }))}. <a class="link" href="#/quiz/results">See your directions</a>, or retake it below.</p>` : ""}
    <h1>${esc(s.q)}</h1>
    ${s.hint ? `<p class="lede">${esc(s.hint)}</p>` : ""}
    ${s.limits ? LIMITS.map((g) => `<fieldset class="limit"><legend>${esc(g.label)}</legend>${g.note ? `<p class="muted limit-note">${esc(g.note)}</p>` : ""}
        <div class="choices">${g.options.map(([v, t]) => choice(`data-l="${g.key}" data-v="${v}"`, L[g.key] == v, t)).join("")}</div>
      </fieldset>`).join("")
      : `<div class="choices ${s.multi ? "multi" : ""}">${s.options.map((o, i) => choice(`data-c="${i}"`, (qAns[s.key] || []).includes(i), o.t)).join("")}</div>`}
    <div class="quiz-nav">
      <button class="btn" id="back" ${qStep === 0 ? "disabled" : ""}>Back</button>
      <span class="steps mono" aria-hidden="true">${QUIZ.map((_, i) => (i <= qStep ? "●" : "○")).join(" ")}</span>
      <button class="btn primary" id="next" ${ready ? "" : "disabled"}>${qStep === QUIZ.length - 1 ? "See my directions" : "Next"}</button>
    </div>
  </div></div>`;
  app.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.c, none = s.options[i].t.startsWith("None");
    let cur = qAns[s.key] || [];
    if (cur.includes(i)) cur = cur.filter((x) => x !== i);
    else {
      cur = none ? [i] : [...cur.filter((x) => !s.options[x].t.startsWith("None")), i];
      if (s.max && cur.length > s.max) cur = cur.slice(-s.max);
    }
    qAns[s.key] = cur;
    viewQuiz();
  }));
  app.querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => {
    L[b.dataset.l] = b.dataset.l === "grade" ? +b.dataset.v : b.dataset.v;
    viewQuiz();
  }));
  document.getElementById("back").addEventListener("click", () => { qStep--; viewQuiz(); });
  document.getElementById("next").addEventListener("click", () => {
    if (qStep < QUIZ.length - 1) { qStep++; viewQuiz(); window.scrollTo(0, 0); return; }
    buildProfile();
    qStep = 0; qAns = {};
    location.hash = "#/quiz/results";
  });
}
function viewQuizResults() {
  if (!profile) { location.hash = "#/quiz"; return; }
  const dirs = directions(), L = profile.limits;
  const pick = (f) => sortList(OPPORTUNITIES.filter((o) => o.niches.includes(f) && fitsLimits(o, L)), "easy");
  // "Start here": one listing per ladder step, no repeats across directions.
  const used = new Set();
  const starts = (list) => STEPS.map((st) => list.find((o) => stepOf(o) === st.key && !used.has(o.id))).filter(Boolean).slice(0, 3).map((o) => (used.add(o.id), o));
  const cross = EX.CROSSOVERS.filter((c) => c.fields.filter((f) => dirs.includes(f)).length >= 2);
  const lim = [LIMITS[0].options.find(([v]) => v == L.grade)?.[1] + " grade", ...LIMITS.slice(1, 4).map((g) => g.options.find(([v]) => v === L[g.key])?.[1])].filter(Boolean).join(" · ");
  app.innerHTML = `<div class="container">
    <header class="page-head">
      <div class="crumbs mono"><a href="#/">Home</a> / Quiz results</div>
      <h1>Your starting directions</h1>
      <p class="mono muted" style="margin-top:12px">${esc(lim)} · <a class="link" href="#/quiz">Retake quiz</a></p>
    </header>
    ${dirs.length ? `<div class="dirs">${dirs.map((f, i) => {
      const list = pick(f);
      return `<article class="dir">
        <span class="dir-n mono">${i + 1}</span>
        <h2><a href="#/fields/${f}">${esc(NICHES[f].label)}</a></h2>
        <p class="dir-why">${esc(reasonFor(f))}</p>
        <p class="muted">${esc(EX.FIELDS[f].intro)}</p>
        <h3 class="mini-h">Start here</h3>
        ${list.length ? `<div class="mini-list">${starts(list).map(miniRow).join("")}</div>` : `<p class="muted">Nothing fits all your limits yet.</p>`}
        <p class="dir-links"><a class="link" href="#/fields/${f}">What the work is like, real teens and the full ladder</a>${list.length > 3 ? ` · <a class="link" href="#/all?field=${f}&fits=1">All ${list.length} that fit you</a>` : ""}</p>
      </article>`;
    }).join("")}</div>` : `<div class="empty"><b>No clear direction yet.</b>Try a few <a class="link" href="#/all?step=try">30-minute starts</a> in different fields and log how they go.</div>`}
    ${cross.length ? `<section class="group"><h2>Where your directions overlap</h2>
      <div class="crosses">${cross.map((c) => `<article class="cross"><div class="mono muted">${c.fields.map((f) => esc(NICHES[f].label)).join(" + ")}</div><h3>${esc(c.name)}</h3><p>${esc(c.blurb)}</p>
        <p class="cross-links"><a class="link" href="${esc(EX.CAREERS[c.career].url)}" target="_blank" rel="noopener">The job: ${esc(EX.CAREERS[c.career].title)} ${ICON.ext}</a></p></article>`).join("")}</div></section>` : ""}
    <div class="quiz-end"><a class="btn primary" href="#/dashboard">Go to my dashboard</a><a class="btn" href="#/all?fits=1">Everything that fits me</a></div>
  </div>`;
}

/* ---------- dashboard ---------- */
function viewDashboard(qs) {
  const filter = new URLSearchParams(qs).get("status") || "";
  const all = sortList([...saved].map((id) => byId[id]).filter(Boolean), "deadline");
  all.forEach((o) => { if (!status[o.id]) status[o.id] = "interested"; });
  const items = filter ? all.filter((o) => status[o.id] === filter) : all;
  const counts = Object.fromEntries(STATUSES.map(([k]) => [k, all.filter((o) => status[o.id] === k).length]));
  const events = upcomingOf(all);
  const myFields = [...new Set(all.flatMap((o) => o.niches))];
  const dirs = directions(), sug = suggestions(4);
  const statusSelect = (o) => `<select class="status-select" data-status="${o.id}" aria-label="Status for ${esc(o.name)}">${STATUSES.map(([k, l]) => `<option value="${k}" ${status[o.id] === k ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  app.innerHTML = `<div class="container">
    <header class="page-head">
      <div class="crumbs mono"><a href="#/">Home</a> / My dashboard</div>
      <h1>My dashboard</h1>
      <p class="lede">Saved on this device only.</p>
    </header>

    <section class="next">
      <div class="sec-head"><h2>Next for you</h2>${dirs.length ? `<span class="muted">Directions: ${dirs.map((f) => `<a class="link" href="#/fields/${f}">${esc(NICHES[f].label)}</a>`).join(", ")}</span>` : ""}</div>
      ${sug.length ? `<div class="sugs">${sug.map(sugRow).join("")}</div>`
        : dirs.length ? `<p class="muted">Nothing new fits your limits right now. <a class="link" href="#/quiz">Retake the quiz</a> to change them.</p>`
        : `<div class="empty"><b>No suggestions yet.</b><a class="link" href="#/quiz">Take the quiz</a> to get some.</div>`}
    </section>

    ${all.length ? `
    <nav class="tally" aria-label="Filter by status">
      <a class="${!filter ? "on" : ""}" href="#/dashboard"><b>${all.length}</b> saved</a>
      ${STATUSES.map(([k, l]) => `<a class="${filter === k ? "on" : ""}" href="#/dashboard?status=${k}"><b>${counts[k]}</b> ${l.toLowerCase()}</a>`).join("")}
    </nav>
    <div class="dash-grid">
      <section>
        <div class="sec-head"><h2>${filter ? esc(STATUSES.find(([k]) => k === filter)[1]) : "Everything you saved"}</h2>
          <span class="no-print" style="display:flex;gap:8px"><button class="btn sm" id="copy">Copy list</button><button class="btn sm" id="print">Print</button></span></div>
        ${items.length ? `<div class="dash-list">${items.map((o) => `<div class="dash-row">
          <div class="dash-main" data-open="${o.id}" role="button" tabindex="0">
            <b>${esc(o.name)}</b>
            <span class="muted">${esc(o.org)} · ${STEP[stepOf(o)].short}</span>
            ${due(o)}
          </div>
          <div class="dash-actions">${statusSelect(o)}<button class="icon-btn" data-save="${o.id}" aria-pressed="true" aria-label="Remove ${esc(o.name)} from dashboard" title="Remove">${ICON.close}</button></div>
        </div>`).join("")}</div>` : `<div class="empty"><b>Nothing marked "${esc(STATUSES.find(([k]) => k === filter)[1])}".</b>Change a status with the dropdown on any saved listing.</div>`}
      </section>
      <aside>
        <div class="sec-head"><h2>Calendar</h2>${events.length ? `<button class="btn sm" data-ics="saved">Add to my calendar</button>` : ""}</div>
        ${calendarHTML(events)}
        <p class="mono muted cal-note">${events.length ? "Includes reminders 3 days and 1 day before." : "None of your saved listings have upcoming dates posted."}</p>
        ${events.length ? `<div class="sec-head" style="margin-top:28px"><h2>Your next dates</h2></div><div class="dl">${events.slice(0, 6).map(({ o, d }) => dlRow(o, d)).join("")}</div>` : ""}
        <div class="sec-head" style="margin-top:32px"><h2>A fact for your fields</h2></div>
        <div class="today slim">${factSlot(myFields, dayNum())}</div>
      </aside>
    </div>` : `<div class="empty" style="margin-top:36px"><b>Nothing saved yet.</b>Tap the bookmark on any listing to save it here and track it. <div style="margin-top:14px"><a class="btn" href="#/all">Browse listings</a></div></div>`}
  </div>`;
  persist();
  bindCalendar(events);
  app.querySelectorAll("[data-status]").forEach((s) => s.addEventListener("change", () => {
    status[s.dataset.status] = s.value; persist(); toast(`Marked as ${s.options[s.selectedIndex].text}`);
    render();
  }));
  document.getElementById("print")?.addEventListener("click", () => print());
  document.getElementById("copy")?.addEventListener("click", async () => {
    const label = Object.fromEntries(STATUSES);
    const text = items.map((o) => { const nd = nextDate(o); return `[${label[status[o.id]]}] ${o.name} (${o.org})${nd ? ` - ${nd.label}: ${fmt(nd.date)}` : ""}\n    ${o.url}`; }).join("\n");
    try { await navigator.clipboard.writeText(`My STEM dashboard\n\n${text}`); toast("Copied"); } catch { toast("Couldn't copy. Try Print."); }
  });
}

/* ---------- suggest ---------- */
function viewSuggest() {
  const opts = (d) => Object.entries(d).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("");
  app.innerHTML = `<div class="container">
    <header class="page-head">
      <div class="crumbs mono"><a href="#/">Home</a> / Suggest a listing</div>
      <h1>Suggest a listing</h1>
      <p class="lede">Only use what the official website says. This makes an entry you can paste into data.json.</p>
    </header>
    <form class="form" id="f">
      <label class="full">Name<input name="name" required /></label>
      <label>Organization<input name="org" required /></label>
      <label>Location<input name="location" placeholder="City, IL or Online" /></label>
      <label>Type<select name="type">${opts(TYPES)}</select></label>
      <label>Where<select name="scope">${opts(SCOPES)}</select></label>
      <label>Cost<select name="cost">${opts(COSTS)}</select></label>
      <label>When<select name="season"><option value="summer">Summer</option><option value="school-year">School year</option><option value="year-round">Year-round</option></select></label>
      <fieldset class="full"><legend>Fields</legend><div class="checks">${Object.entries(NICHES).map(([k, n]) => `<label><input type="checkbox" name="niches" value="${k}"/>${esc(n.label)}</label>`).join("")}</div></fieldset>
      <fieldset class="full"><legend>Grades</legend><div class="checks">${[9, 10, 11, 12].map((g) => `<label><input type="checkbox" name="grades" value="${g}"/>${g}th</label>`).join("")}</div></fieldset>
      <label class="full">Official page URL<input name="url" type="url" required placeholder="https://" /></label>
      <label class="full">One short sentence about it<input name="summary" required /></label>
      <label class="full">Details from the official page <span class="hint">One per line: who can apply, cost, dates.</span><textarea name="facts" required></textarea></label>
      <div class="full checks"><label><input type="checkbox" name="aid"/> Financial aid offered</label></div>
      <div class="full"><button class="btn primary" type="submit">Make entry</button></div>
    </form>
    <div id="out"></div>
  </div>`;
  document.getElementById("f").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const entry = {
      id: String(fd.get("name")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: fd.get("name"), org: fd.get("org"), type: fd.get("type"), niches: fd.getAll("niches"),
      scope: fd.get("scope"), location: fd.get("location"), grades: fd.getAll("grades").map(Number),
      cost: fd.get("cost"), aid: fd.has("aid"), season: fd.get("season"), url: fd.get("url"),
      summary: fd.get("summary"), facts: String(fd.get("facts")).split("\n").map((s) => s.trim()).filter(Boolean),
      dates: [], tip: "",
    };
    if (!entry.niches.length || !entry.grades.length) { toast("Pick at least one field and one grade"); return; }
    const json = JSON.stringify(entry) + ",";
    document.getElementById("out").innerHTML = `<h2 class="out-h">Your entry</h2>
      <pre class="snippet">${esc(json)}</pre>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="btn" id="cp">Copy</button>${SUBMIT_EMAIL ? `<a class="btn primary" href="mailto:${SUBMIT_EMAIL}?subject=${encodeURIComponent("stem.connect listing: " + entry.name)}&body=${encodeURIComponent(json)}">Email it</a>` : ""}</div>`;
    document.getElementById("cp").addEventListener("click", async () => { try { await navigator.clipboard.writeText(json); toast("Copied"); } catch { toast("Couldn't copy"); } });
  });
}

/* ---------- router ---------- */
function route() { return location.hash.replace(/^#\/?/, "").split("?")[0].split("/"); }
const TITLES = { all: "All listings", fields: "Fields", deadlines: "Deadlines", quiz: "Quiz", dashboard: "My dashboard", suggest: "Suggest a listing" };
// Pages that use explore.json wait for it on first visit.
function needExplore(fn) {
  if (EX) return fn();
  app.innerHTML = `<div class="container"><p class="mono muted" style="padding:64px 0">Loading…</p></div>`;
  const h = location.hash;
  loadExplore().then(() => { if (location.hash === h) render(); })
    .catch(() => { app.innerHTML = `<div class="container"><div class="empty" style="margin-top:48px"><b>This page didn't load.</b>Check your connection and refresh.</div></div>`; });
}
let lastRoute = null;
function render() {
  const [r, sub] = route(), qs = location.hash.split("?")[1] || "";
  if (r === "") viewHome();
  else if (r === "all" || CATS.some((c) => c.slug === r)) viewDatabase(r, qs);
  else if (r === "fields") sub ? needExplore(() => viewField(sub)) : viewFields();
  else if (r === "deadlines") viewDeadlines(qs);
  else if (r === "quiz") sub === "results" ? needExplore(viewQuizResults) : viewQuiz();
  else if (r === "dashboard" || r === "saved") viewDashboard(qs);
  else if (r === "suggest") viewSuggest();
  else viewHome();
  mountFacts();
  closeMore();
  markTabs();
  const name = r === "quiz" && sub === "results" ? "Your directions" : r === "fields" && NICHES[sub] ? NICHES[sub].label : CATS.find((c) => c.slug === r)?.title || TITLES[r];
  document.title = name ? `${name} · stem.connect` : "stem.connect · STEM opportunities outside school";
  const full = r + (sub || "");
  if (full !== lastRoute) window.scrollTo(0, 0);
  lastRoute = full;
}
window.addEventListener("hashchange", () => { closeDrawer(); render(); });
let wasNarrow = narrow();
window.addEventListener("resize", debounce(() => {
  fitTabs();
  if (narrow() !== wasNarrow) { wasNarrow = narrow(); const [r] = route(); if (r === "all" || CATS.some((c) => c.slug === r)) render(); }
}, 150));

persist();
render();
fitTabs();
document.fonts?.ready.then(fitTabs);
