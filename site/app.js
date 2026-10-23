// Installation planner: Supabase login (no sign-up), floor plan and points from the database.
import { CONFIG } from "./config.js";
import { CATS, T, psuFor } from "./catalog.js";

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function n(v) { return (Math.round(v * 1000) / 1000).toString(); }
function kr(v) { return Math.round(v).toLocaleString("sv-SE").replace(/ /g, " ") + " kr"; }
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function num(v, d) { v = Number(v); return Number.isFinite(v) ? v : d; }
function catOf(type) { return CATS.find((c) => c.id === T[type].cat) || CATS[0]; }
function col(type) { return "var(" + catOf(type).css + ")"; }

// ---------- State ----------
const state = { floor: null, cats: {}, ghosts: true, zoom: false, sel: null, selGhost: null, mode: null, addType: null, confirmDel: false };
CATS.forEach((c) => { state.cats[c.id] = true; });
const store = { points: [], plan: null, suggestions: [] };
try {
  const savedUi = JSON.parse(localStorage.getItem("planner-ui") || "null");
  if (savedUi && typeof savedUi === "object") {
    if (typeof savedUi.ghosts === "boolean") state.ghosts = savedUi.ghosts;
    if (savedUi.cats && typeof savedUi.cats === "object") Object.keys(savedUi.cats).forEach((k) => { if (k in state.cats) state.cats[k] = !!savedUi.cats[k]; });
  }
} catch (e) { /* storage unavailable */ }
function saveUi() { try { localStorage.setItem("planner-ui", JSON.stringify({ ghosts: state.ghosts, cats: state.cats })); } catch (e) { /* ignore */ } }

// ---------- Supabase ----------
const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

function show(view) {
  $("boot").hidden = view !== "boot";
  $("login").hidden = view !== "login";
  $("app").hidden = view !== "app";
}
function setStatus(kind, text) {
  const el = $("status");
  el.className = "status " + kind;
  el.innerHTML = '<span class="dot"></span><span>' + esc(text) + "</span>";
}
function showNotice(html) { const el = $("notice"); el.innerHTML = html; el.hidden = !html; $("workspace").hidden = !!html; }

function fromRow(r) {
  if (!r || typeof r.type !== "string" || !T[r.type]) return null;
  const t = T[r.type];
  return {
    id: r.id, type: r.type, floor: String(r.floor),
    x: num(r.x, 0), y: num(r.y, 0), code: String(r.code || t.p + "?"),
    note: typeof r.note === "string" ? r.note : "",
    qty: clamp(Math.round(num(r.qty, 1)), 1, 999),
    len: clamp(num(r.len, 0), 0, 200),
    group: typeof r.grp === "string" ? r.grp : "",
    created: Date.parse(r.created_at) || 0
  };
}

function validPlan(d) {
  return d && Array.isArray(d.outline) && d.floors && typeof d.floors === "object" && Object.keys(d.floors).length > 0;
}

async function loadAll() {
  const [cfg, pts] = await Promise.all([
    sb.from("planner_config").select("key,data"),
    sb.from("planner_points").select("id,type,floor,x,y,code,note,qty,len,grp,created_at").order("created_at", { ascending: true })
  ]);
  if (cfg.error) throw cfg.error;
  if (pts.error) throw pts.error;
  const byKey = {};
  (cfg.data || []).forEach((r) => { byKey[r.key] = r.data; });
  store.plan = validPlan(byKey.floorplan) ? byKey.floorplan : null;
  store.suggestions = Array.isArray(byKey.suggestions)
    ? byKey.suggestions.filter((s) => s && T[s.type] && typeof s.f === "string").map((s, i) => ({ gid: "g" + i, f: s.f, type: s.type, x: num(s.x, 0), y: num(s.y, 0), why: String(s.why || ""), group: String(s.group || "") }))
    : [];
  store.points = (pts.data || []).map(fromRow).filter(Boolean);
  if (store.plan) {
    const order = planOrder();
    if (!state.floor || !store.plan.floors[state.floor]) state.floor = order[0];
  }
}

async function enterApp(session) {
  show("app");
  $("account-email").textContent = session.user.email || "";
  setStatus("", "Sprawdzanie dostępu…");
  const member = await sb.rpc("planner_is_member");
  if (member.error && /JWT|token|session/i.test(String(member.error.message || ""))) { await sb.auth.signOut(); show("login"); return; }
  if (member.error) { showNotice("<p><strong>Nie udało się połączyć z bazą.</strong> Sprawdź internet i odśwież stronę.</p>"); setStatus("warn", "Brak połączenia z bazą."); return; }
  if (member.data !== true) {
    showNotice("<p><strong>To konto nie ma dostępu do planu.</strong> Zaloguj się adresem, który jest na liście dostępu.</p>");
    setStatus("warn", "Brak dostępu.");
    return;
  }
  try { await loadAll(); } catch (e) { showNotice("<p><strong>Nie udało się wczytać planu.</strong> Odśwież stronę.</p>"); setStatus("warn", "Błąd wczytywania."); return; }
  if (!store.plan) {
    showNotice("<p><strong>Rzut domu nie jest jeszcze wgrany do bazy.</strong> Gdy zostanie dodany, plan pojawi się tutaj.</p>");
    setStatus("warn", "Brak rzutu w bazie.");
    return;
  }
  showNotice("");
  setStatus("ok", "Zapisywane automatycznie w bazie.");
  renderAll();
}

async function refresh() {
  if ($("app").hidden || !store.plan) return;
  try { await loadAll(); renderAll(); setStatus("ok", "Zapisywane automatycznie w bazie."); }
  catch (e) { setStatus("warn", "Nie udało się odświeżyć. Sprawdź połączenie."); }
}

function writeFailed(err) {
  const msg = err && err.message ? String(err.message) : "";
  if (/JWT|session|token/i.test(msg)) { setStatus("warn", "Sesja wygasła. Zaloguj się ponownie."); return; }
  setStatus("warn", "Nie zapisano zmiany. Sprawdź połączenie i spróbuj ponownie.");
  refresh();
}

// ---------- Plan geometry ----------
function planOrder() { const p = store.plan; return Array.isArray(p.order) && p.order.length ? p.order.filter((k) => p.floors[k]) : Object.keys(p.floors); }
function F(key) { return store.plan.floors[key]; }
function inRect(r, x, y) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function roomOf(pt) {
  const fl = F(pt.floor);
  if (!fl) return { id: "ext", n: "Elewacja i ogród" };
  for (const r of fl.rooms || []) { if (r.poly ? inPoly(r.poly, pt.x, pt.y) : inRect(r, pt.x, pt.y)) return { id: r.id, n: r.n }; }
  for (const o of fl.outside || []) { if (inRect(o, pt.x, pt.y)) return { id: o.id, n: o.n }; }
  return { id: "ext-" + pt.floor, n: "Elewacja i ogród" };
}
function floorName(key) { const fl = F(key); return fl ? fl.name : key; }

// ---------- Data operations ----------
function nextCode(type) {
  const p = T[type].p;
  let max = 0;
  store.points.forEach((pt) => {
    if (T[pt.type].p !== p) return;
    const rest = pt.code.slice(p.length);
    if (/^\d+$/.test(rest)) max = Math.max(max, parseInt(rest, 10));
  });
  return p + (max + 1);
}

async function addPoint(type, floor, x, y, group) {
  const t = T[type];
  const row = {
    type, floor, x: Math.round(x * 20) / 20, y: Math.round(y * 20) / 20, code: nextCode(type), note: "",
    qty: t.unit ? 1 : t.def, len: t.unit === "m" ? t.def : 0, grp: group || (t.grouped ? "Grupa 1" : "")
  };
  setStatus("", "Zapisywanie…");
  const { data, error } = await sb.from("planner_points").insert(row).select("id,type,floor,x,y,code,note,qty,len,grp,created_at").single();
  if (error) { writeFailed(error); return; }
  const p = fromRow(data);
  if (p) { store.points.push(p); state.sel = p.id; state.selGhost = null; }
  setStatus("ok", "Zapisano.");
  renderAll();
}

async function updatePoint(id, patch) {
  const p = getPoint(id); if (!p) return;
  Object.assign(p, patch);
  renderAll();
  const row = {};
  if ("note" in patch) row.note = patch.note;
  if ("qty" in patch) row.qty = patch.qty;
  if ("len" in patch) row.len = patch.len;
  if ("group" in patch) row.grp = patch.group;
  if ("x" in patch) row.x = patch.x;
  if ("y" in patch) row.y = patch.y;
  if ("floor" in patch) row.floor = patch.floor;
  setStatus("", "Zapisywanie…");
  const { error } = await sb.from("planner_points").update(row).eq("id", id);
  if (error) { writeFailed(error); return; }
  setStatus("ok", "Zapisano.");
}

async function deletePoint(id) {
  state.sel = null; state.confirmDel = false;
  setStatus("", "Usuwanie…");
  const { error } = await sb.from("planner_points").delete().eq("id", id);
  if (error) { writeFailed(error); return; }
  store.points = store.points.filter((p) => p.id !== id);
  setStatus("ok", "Usunięto.");
  renderAll();
}

// ---------- Derived ----------
function shoppingList() {
  const lines = {}, order = [];
  function put(it) {
    if (!it || !(it[1] > 0)) return;
    const key = it[0] + "|" + it[2];
    if (!lines[key]) { lines[key] = { name: it[0], qty: 0, price: it[2] }; order.push(key); }
    lines[key].qty += it[1];
  }
  const groups = {}, globals = {};
  store.points.forEach((p) => {
    const t = T[p.type];
    t.items(p).forEach(put);
    if (t.groupItems) { const g = p.type + "|" + (p.group || "—"); (groups[g] = groups[g] || { type: p.type, pts: [] }).pts.push(p); }
    if (t.globalItems) globals[p.type] = t.globalItems;
  });
  Object.keys(groups).forEach((g) => { T[groups[g].type].groupItems(groups[g].pts).forEach(put); });
  Object.keys(globals).forEach((k) => { globals[k].forEach(put); });
  return order.map((k) => lines[k]);
}
function camerasCount() { return store.points.filter((p) => T[p.type].camera).length; }

function pointHints(p) {
  const t = T[p.type], out = [];
  if (t.unit === "m" && t.wpm) {
    const w = Math.round(p.len * t.wpm), s = psuFor(p.len * t.wpm);
    out.push("Moc ok. " + w + " W → zasilacz " + s.w + " W" + (s.count > 1 ? " × " + s.count : "") + " (z zapasem 25%).");
    if (p.len > 5) out.push("Taśma dłuższa niż 5 m: zasil ją z obu końców albo co 5 m, inaczej koniec będzie ciemniejszy.");
    if (p.len > 15) out.push("Przy tej długości podziel linię na dwa odcinki z osobnymi zasilaczami.");
  }
  if (t.grouped) {
    const same = store.points.filter((q) => q.type === p.type && (q.group || "—") === (p.group || "—"));
    let cnt = 0; same.forEach((q) => { cnt += q.qty; });
    out.push("Grupa „" + (p.group || "—") + "”: " + same.length + " punkt(y), razem " + cnt + (p.type === "spk" ? " głośnik(i)." : " szt.") + " Wszystkie sterowane razem.");
  }
  if (p.type === "lamp" && p.qty >= 2) out.push("Dwa obwody w jednej puszce: wystarczy jeden Shelly 2PM Gen4.");
  return out;
}

function globalHints() {
  const h = [], pts = store.points;
  if (!pts.length) { h.push("Zacznij od „+ Dodaj punkt” albo dotknij przerywanej podpowiedzi na rzucie i wybierz „Dodaj do planu”."); return h; }
  const has = (t) => pts.some((p) => p.type === t);
  if (!has("hub") && !has("atv")) h.push("Brakuje centrum domu (HomePod mini 2 lub Apple TV). Bez niego nie działają automatyzacje, dostęp spoza domu ani nagrania kamer.");
  let shelly = 0; shoppingList().forEach((l) => { if (/^Shelly/.test(l.name)) shelly += l.qty; });
  if (shelly) h.push("Masz " + shelly + " modułów Shelly. Zanim elektryk zamknie puszki, zrób zdjęcie kodu Matter każdego modułu i podpisz, gdzie jest.");
  const cams = camerasCount();
  if (cams) h.push("Kamery i dzwonek: " + cams + ". Plan iCloud+ " + (cams <= 1 ? "50 GB" : cams <= 5 ? "200 GB" : "2 TB") + " obejmie nagrywanie" + (cams > 5 ? " (200 GB obsługuje tylko do 5 kamer)." : "."));
  ["winled", "winout"].forEach((k) => {
    const g = {}; pts.forEach((p) => { if (p.type === k) g[p.group || "—"] = (g[p.group || "—"] || 0) + p.qty; });
    const names = Object.keys(g);
    if (names.length) h.push(T[k].name + ": " + names.length + " grup(y) (" + names.map((x) => x + ": " + g[x]).join(", ") + "). Każda grupa to jeden sterownik" + (k === "winled" ? " i jeden zasilacz." : "."));
  });
  if (pts.some((p) => T[p.type].unit === "m" && T[p.type].wpm)) h.push("LED 24 V: zasilacze montuj w miejscach z dostępem (rewizja). Elektryk podłącza 230 V do zasilacza; ustal z nim, kto kładzie przewody 24 V.");
  const withWifi = {}, used = {};
  pts.forEach((p) => { used[p.floor] = true; if (p.type === "mesh") withWifi[p.floor] = true; });
  Object.keys(used).forEach((f) => { if (!withWifi[f]) h.push(floorName(f) + ": nie ma punktu Wi-Fi. Shelly i kamery potrzebują dobrego zasięgu."); });
  const zones = {}; pts.forEach((p) => { if (p.type === "spk") zones[p.group || "—"] = 1; });
  if (Object.keys(zones).length) h.push("Głośniki w suficie: " + Object.keys(zones).length + " stref(y), czyli tyle samo wzmacniaczy Sonos Amp. Zaplanuj dla nich miejsce z wentylacją.");
  if (pts.some((p) => { const r = roomOf(p).id; return r.indexOf("ext") === 0 || r === "taras"; })) h.push("Na zewnątrz: osprzęt IP44 lub wyżej, kable w rurach osłonowych.");
  return h;
}

// ---------- Rendering: plan ----------
const frame = $("frame");
function rect(x, y, w, h, cls) { return '<rect class="' + cls + '" x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '"/>'; }
function poly(pts, cls) { return '<polygon class="' + cls + '" points="' + pts.map((p) => n(p[0]) + "," + n(p[1])).join(" ") + '"/>'; }
function label(text, x, y, rot, sm) {
  const t = rot ? ' transform="rotate(-90 ' + n(x) + " " + n(y) + ')"' : "";
  return '<text class="lbl' + (sm ? " sm" : "") + '" x="' + n(x) + '" y="' + n(y) + '"' + t + ">" + esc(text) + "</text>";
}
function marker(id, kind, type, x, y, text, sel) {
  const size = text.length <= 2 ? 0.34 : text.length === 3 ? 0.29 : 0.24;
  return '<g class="mk' + (kind === "ghost" ? " ghost" : "") + (sel ? " sel" : "") + '" data-' + kind + '="' + esc(id) + '" role="button" tabindex="0" aria-label="' + esc(text + ": " + T[type].name) + '">' +
    '<circle class="ring" cx="' + n(x) + '" cy="' + n(y) + '" r="0.62"/>' +
    '<circle class="body" cx="' + n(x) + '" cy="' + n(y) + '" r="0.46" style="fill:' + col(type) + ";stroke:" + (kind === "ghost" ? col(type) : "") + '"/>' +
    '<text x="' + n(x) + '" y="' + n(y) + '" style="font-size:' + size + 'px">' + esc(text) + "</text></g>";
}
function ghostVisible(g) {
  if (!state.ghosts || g.f !== state.floor || !state.cats[T[g.type].cat]) return false;
  return !store.points.some((p) => p.floor === g.f && p.type === g.type && Math.abs(p.x - g.x) < 1 && Math.abs(p.y - g.y) < 1);
}
function renderPlan() {
  const fl = F(state.floor), vb = Array.isArray(store.plan.viewBox) ? store.plan.viewBox : [-3.6, -1, 15, 22.8], out = [];
  out.push('<svg viewBox="' + vb.map(n).join(" ") + '" role="img" aria-label="Rzut: ' + esc(fl.name) + '" xmlns="http://www.w3.org/2000/svg">');
  (fl.outside || []).forEach((o) => { out.push(rect(o.x, o.y, o.w, o.h, "outside")); });
  out.push(poly(store.plan.outline, "outline"));
  (fl.rooms || []).forEach((r) => { out.push(r.poly ? poly(r.poly, "room") : rect(r.x, r.y, r.w, r.h, "room")); });
  (fl.fixtures || []).forEach((fx) => { out.push(rect(fx.x, fx.y, fx.w, fx.h, "fixture")); });
  (fl.stairs || []).forEach((s) => {
    out.push(rect(s.x, s.y, s.w, s.h, "fixture"));
    for (let i = 1; i < s.n; i++) { const xx = s.x + (s.w * i) / s.n; out.push('<line class="step" x1="' + n(xx) + '" y1="' + n(s.y) + '" x2="' + n(xx) + '" y2="' + n(s.y + s.h) + '"/>'); }
  });
  (fl.windows || []).forEach((w) => { out.push(w.v ? rect(w.at - 0.12, w.a, 0.24, w.b - w.a, "win") : rect(w.a, w.at - 0.12, w.b - w.a, 0.24, "win")); });
  (fl.gates || []).forEach((g) => {
    out.push('<line class="gate" x1="' + n(g.x1) + '" y1="' + n(g.y) + '" x2="' + n(g.x2) + '" y2="' + n(g.y) + '"/>');
    out.push('<text class="dim" x="' + n((g.x1 + g.x2) / 2) + '" y="' + n(g.y - 0.32) + '" text-anchor="middle">' + esc(g.label) + "</text>");
  });
  (fl.rooms || []).forEach((r) => { const text = r.label !== undefined ? r.label : r.n; if (text) out.push(label(text, r.lx, r.ly, r.rot, r.sm)); });
  (fl.fixtures || []).forEach((fx) => { if (fx.label) out.push(label(fx.label, fx.lx, fx.ly, false, true)); });
  (fl.outside || []).forEach((o) => { out.push(label(o.n, o.x + o.w / 2, o.y + o.h / 2, o.rot, false)); });
  const sx = vb[0] + 0.6, sy = vb[1] + vb[3] - 0.65;
  out.push('<line class="step" x1="' + n(sx) + '" y1="' + n(sy) + '" x2="' + n(sx + 5) + '" y2="' + n(sy) + '" style="stroke-width:.06"/>');
  [0, 2.5, 5].forEach((d) => { out.push('<line class="step" x1="' + n(sx + d) + '" y1="' + n(sy - 0.2) + '" x2="' + n(sx + d) + '" y2="' + n(sy + 0.2) + '" style="stroke-width:.06"/>'); });
  out.push('<text class="dim" x="' + n(sx + 5.25) + '" y="' + n(sy + 0.12) + '">5 m</text>');
  store.suggestions.forEach((g) => { if (ghostVisible(g)) out.push(marker(g.gid, "ghost", g.type, g.x, g.y, T[g.type].p, state.selGhost === g.gid)); });
  store.points.forEach((p) => { if (p.floor === state.floor && state.cats[T[p.type].cat]) out.push(marker(p.id, "pt", p.type, p.x, p.y, p.code, state.sel === p.id)); });
  out.push("</svg>");
  frame.innerHTML = out.join("");
  frame.classList.toggle("placing", state.mode === "add" || state.mode === "move");
}

function renderMode() {
  const el = $("mode");
  if (state.mode === "add") {
    el.hidden = false;
    el.innerHTML = "<span>Dodajesz: <strong>" + esc(T[state.addType].name) + '</strong>. Dotknij miejsca na rzucie.</span><span class="sp"></span><button type="button" class="btn" data-act="pick">Zmień typ</button><button type="button" class="btn" data-act="done">Gotowe</button>';
  } else if (state.mode === "move") {
    const p = getPoint(state.sel);
    el.hidden = false;
    el.innerHTML = "<span>Dotknij nowego miejsca dla <strong>" + esc(p ? p.code : "") + '</strong>.</span><span class="sp"></span><button type="button" class="btn" data-act="done">Anuluj</button>';
  } else { el.hidden = true; el.innerHTML = ""; }
}

function renderLayers() {
  $("layers").innerHTML = CATS.map((c) => '<button type="button" class="chip" data-cat="' + c.id + '" aria-pressed="' + state.cats[c.id] + '"><span class="sw" style="background:var(' + c.css + ')"></span>' + esc(c.name) + "</button>").join("");
  $("ghosts").setAttribute("aria-pressed", state.ghosts);
  $("floors").innerHTML = planOrder().map((k) => '<button type="button" data-floor="' + esc(k) + '" aria-pressed="' + (state.floor === k) + '">' + esc(floorName(k)) + "</button>").join("");
}

// ---------- Rendering: panel ----------
const panel = $("panel");
function getPoint(id) { return store.points.find((p) => p.id === id) || null; }
function getGhost(id) { return store.suggestions.find((g) => g.gid === id) || null; }
function typeInfo(t) {
  let h = "<h4>Rekomendacja</h4><p>" + esc(t.device) + "</p>";
  if (t.needs.length) h += "<h4>Co przygotować</h4><ul>" + t.needs.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>";
  if (t.tips.length) h += "<h4>Wskazówki</h4><ul>" + t.tips.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>";
  h += "<h4>W aplikacji Hem</h4><p>" + esc(t.apple) + "</p><h4>Kto montuje</h4><p>" + esc(t.who) + "</p>";
  return h;
}
function pointCost(p) { let s = 0; T[p.type].items(p).forEach((i) => { s += i[1] * i[2]; }); return s; }

function renderPanel() {
  const p = getPoint(state.sel), g = p ? null : getGhost(state.selGhost);
  if (!p && !g) {
    panel.classList.remove("open");
    panel.innerHTML = '<p class="empty">Dotknij punktu na rzucie, żeby zobaczyć podpowiedzi i edytować go. Nowy punkt dodasz przyciskiem „+ Dodaj punkt”.</p>';
    return;
  }
  panel.classList.add("open");
  if (g) {
    const tg = T[g.type];
    panel.innerHTML = '<div class="head"><span class="code" style="background:' + col(g.type) + '">' + esc(tg.p) + '</span><span class="kind">Podpowiedź</span><button type="button" class="btn close" data-act="close">Zamknij</button></div>' +
      "<h3>" + esc(tg.name) + "</h3><p>" + esc(g.why) + "</p>" +
      '<div class="row"><button type="button" class="btn primary" data-act="accept">Dodaj do planu</button></div>' + typeInfo(tg);
    return;
  }
  const t = T[p.type], r = roomOf(p);
  let fields = '<div class="fields">';
  fields += '<label class="wide">Opis<input id="f-note" type="text" maxlength="300" value="' + esc(p.note) + '" placeholder="np. nad oknem od ulicy"></label>';
  if (t.unit === "m") fields += '<label>Długość (m)<input id="f-len" type="number" inputmode="decimal" min="0" max="200" step="0.5" value="' + p.len + '"></label>';
  if (t.qtyLabel) fields += "<label>" + esc(t.qtyLabel) + '<input id="f-qty" type="number" inputmode="numeric" min="1" max="999" step="1" value="' + p.qty + '"></label>';
  if (t.grouped) {
    const groups = {}; store.points.forEach((q) => { if (q.type === p.type && q.group) groups[q.group] = 1; });
    fields += "<label>" + esc(t.groupLabel) + '<input id="f-group" type="text" maxlength="40" list="grp-list" value="' + esc(p.group) + '"></label><datalist id="grp-list">' + Object.keys(groups).map((x) => '<option value="' + esc(x) + '">').join("") + "</datalist>";
  }
  fields += "</div>";
  const hints = pointHints(p).map((x) => '<div class="hint">' + esc(x) + "</div>").join("");
  const cost = pointCost(p);
  const actions = state.confirmDel
    ? '<div class="row"><span>Usunąć ' + esc(p.code) + '?</span><button type="button" class="btn danger" data-act="del-yes">Usuń</button><button type="button" class="btn" data-act="del-no">Nie</button></div>'
    : '<div class="row"><button type="button" class="btn" data-act="move">Przenieś</button><button type="button" class="btn danger" data-act="del">Usuń</button></div>';
  panel.innerHTML = '<div class="head"><span class="code" style="background:' + col(p.type) + '">' + esc(p.code) + '</span><span class="kind">' + esc(catOf(p.type).name) + '</span><button type="button" class="btn close" data-act="close">Zamknij</button></div>' +
    "<h3>" + esc(t.name) + '</h3><p class="where">' + esc(floorName(p.floor) + " · " + r.n) + "</p>" + fields + hints +
    (cost ? '<p>Koszt urządzeń w tym punkcie: <span class="price">ok. ' + esc(kr(cost)) + "</span>" + (t.groupItems ? " (plus sterownik grupy)" : "") + "</p>" : "") +
    actions + typeInfo(t);
}

// ---------- Rendering: lists ----------
function renderFacts() {
  let total = 0, shelly = 0, ledM = 0;
  shoppingList().forEach((l) => { total += l.qty * l.price; if (/^Shelly/.test(l.name)) shelly += l.qty; });
  store.points.forEach((p) => { if (T[p.type].wpm) ledM += p.len; });
  const facts = [[String(store.points.length), "punktów w planie"], [String(shelly), "modułów Shelly"], [String(Math.round(ledM * 10) / 10) + " m", "LED 24 V"], [String(camerasCount()), "kamer i dzwonków"], ["ok. " + kr(Math.round(total / 100) * 100), "urządzenia"]];
  $("facts").innerHTML = facts.map((f) => "<div><dt>" + esc(f[1]) + "</dt><dd>" + esc(f[0]) + "</dd></div>").join("");
}
function renderHints() { $("hints").innerHTML = globalHints().map((x) => '<li class="hint">' + esc(x) + "</li>").join(""); }
function renderShop() {
  const list = shoppingList();
  let total = 0;
  if (!list.length) { $("shop").innerHTML = '<tr><td colspan="4" class="empty">Lista pojawi się, gdy dodasz punkty.</td></tr>'; return; }
  const rows = list.map((l) => {
    const sum = l.qty * l.price; total += sum;
    return "<tr><td>" + esc(l.name) + '</td><td class="num">' + (Math.round(l.qty * 10) / 10) + '</td><td class="num">' + (l.name === "HomePod mini 2" ? "" : "ok. ") + esc(kr(l.price)) + '</td><td class="num">' + esc(kr(sum)) + "</td></tr>";
  });
  rows.push('<tr class="total"><td>Razem urządzenia</td><td></td><td></td><td class="num">ok. ' + esc(kr(Math.round(total / 100) * 100)) + "</td></tr>");
  $("shop").innerHTML = rows.join("");
}
function renderRooms() {
  const by = {}, order = [];
  store.points.forEach((p) => {
    const r = roomOf(p), key = p.floor + "|" + r.id;
    if (!by[key]) { by[key] = { name: r.n, floor: floorName(p.floor), pts: [] }; order.push(key); }
    by[key].pts.push(p);
  });
  if (!order.length) { $("rooms").innerHTML = '<p class="empty">Tu pojawią się Twoje punkty pogrupowane według pomieszczeń.</p>'; return; }
  order.sort();
  $("rooms").innerHTML = order.map((k) => {
    const b = by[k];
    return '<div class="sheet room-card"><h3>' + esc(b.name) + "<span>" + esc(b.floor) + "</span></h3><ul>" + b.pts.map((p) => {
      const extra = T[p.type].unit === "m" ? " · " + p.len + " m" : (p.qty > 1 ? " · " + p.qty + " szt." : "");
      return '<li><button type="button" data-goto="' + esc(p.id) + '"><span class="c" style="color:' + col(p.type) + '">' + esc(p.code) + '</span><span class="t">' + esc(T[p.type].name + extra) + (p.note ? " — " + esc(p.note) : "") + "</span></button></li>";
    }).join("") + "</ul></div>";
  }).join("");
}
function renderSv() {
  const byType = {};
  store.points.forEach((p) => { if (T[p.type].sv) (byType[p.type] = byType[p.type] || []).push(p.code); });
  const lines = Object.keys(byType).map((k) => T[k].sv.replace("{c}", byType[k].join(", ")));
  if (lines.length) lines.push("Överspänningsskydd i elcentralen.");
  $("sv-list").innerHTML = lines.length ? lines.map((l) => "<li>" + esc(l) + "</li>").join("") : '<li lang="pl">Tekst pojawi się, gdy dodasz punkty wymagające elektryka.</li>';
}
function renderCatalog() {
  $("catalog").innerHTML = CATS.map((c) => {
    const types = Object.keys(T).filter((k) => T[k].cat === c.id);
    return '<div><h3 class="cat-title"><span class="sw" style="background:var(' + c.css + ')"></span>' + esc(c.name) + '</h3><div class="cards">' + types.map((k) => {
      const t = T[k], sample = { qty: 1, len: t.unit === "m" ? t.def : 0, group: "" };
      let cost = 0;
      t.items(sample).forEach((i) => { cost += i[1] * i[2]; });
      if (t.groupItems) t.groupItems([sample]).forEach((i) => { cost += i[1] * i[2]; });
      const priceTxt = cost ? "ok. " + kr(Math.round(cost / 50) * 50) + (t.unit === "m" ? " za " + t.def + " m" : "") : "materiał elektryka";
      return '<div class="sheet card"><h3>' + esc(t.name) + "</h3><p>" + esc(t.what) + '</p><p class="dev">' + esc(t.device) + '</p><div class="foot"><span class="price">' + esc(priceTxt) + '</span><button type="button" class="btn" data-place="' + k + '">Dodaj na plan</button></div></div>';
    }).join("") + "</div></div>";
  }).join("");
}
function renderPicker() {
  const q = ($("pick-q").value || "").trim().toLowerCase();
  $("pick-list").innerHTML = CATS.map((c) => {
    const types = Object.keys(T).filter((k) => {
      const t = T[k]; if (t.cat !== c.id) return false;
      return !q || (t.name + " " + t.what + " " + t.device + " " + c.name).toLowerCase().indexOf(q) >= 0;
    });
    if (!types.length) return "";
    return '<div class="cat"><span class="sw" style="background:var(' + c.css + ')"></span>' + esc(c.name) + '</div><div class="types">' + types.map((k) => '<button type="button" class="type-btn" data-type="' + k + '"><b>' + esc(T[k].name) + "</b><span>" + esc(T[k].what) + "</span></button>").join("") + "</div>";
  }).join("") || '<p class="empty">Nic nie pasuje. Spróbuj innego słowa.</p>';
}

function renderAll() {
  if (!store.plan) return;
  renderLayers(); renderMode(); renderPlan(); renderPanel(); renderFacts(); renderHints(); renderShop(); renderRooms(); renderSv(); renderCatalog();
}

// ---------- Interaction ----------
function svgPoint(evt) {
  const svg = frame.querySelector("svg");
  if (!svg || !svg.getScreenCTM) return null;
  const m = svg.getScreenCTM(); if (!m) return null;
  const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
  const r = pt.matrixTransform(m.inverse());
  return { x: r.x, y: r.y };
}
function openPicker() { $("overlay").hidden = false; $("pick-q").value = ""; renderPicker(); setTimeout(() => { try { $("pick-q").focus(); } catch (e) { /* ignore */ } }, 30); }
function closePicker() { $("overlay").hidden = true; }
function startAdd(type) { state.mode = "add"; state.addType = type; state.sel = null; state.selGhost = null; state.cats[T[type].cat] = true; closePicker(); renderAll(); frame.scrollIntoView({ behavior: "smooth", block: "center" }); }

frame.addEventListener("click", (e) => {
  const g = e.target.closest ? e.target.closest(".mk") : null;
  if (state.mode === "add" || state.mode === "move") {
    const at = svgPoint(e); if (!at) return;
    if (state.mode === "add") { addPoint(state.addType, state.floor, at.x, at.y, ""); return; }
    const p = getPoint(state.sel);
    state.mode = null;
    if (p) updatePoint(p.id, { x: Math.round(at.x * 20) / 20, y: Math.round(at.y * 20) / 20, floor: state.floor });
    else renderAll();
    return;
  }
  if (g && g.getAttribute("data-pt")) { state.sel = g.getAttribute("data-pt"); state.selGhost = null; state.confirmDel = false; }
  else if (g && g.getAttribute("data-ghost")) { state.selGhost = g.getAttribute("data-ghost"); state.sel = null; }
  else { state.sel = null; state.selGhost = null; }
  renderPlan(); renderPanel();
});
frame.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const g = e.target.closest ? e.target.closest(".mk") : null; if (!g) return;
  e.preventDefault();
  if (g.getAttribute("data-pt")) { state.sel = g.getAttribute("data-pt"); state.selGhost = null; } else { state.selGhost = g.getAttribute("data-ghost"); state.sel = null; }
  renderPlan(); renderPanel();
});
panel.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.getAttribute("data-act"), p = getPoint(state.sel);
  if (act === "close") { state.sel = null; state.selGhost = null; state.confirmDel = false; }
  else if (act === "accept") { const g = getGhost(state.selGhost); if (g) addPoint(g.type, g.f, g.x, g.y, g.group); return; }
  else if (act === "move" && p) { state.mode = "move"; state.floor = p.floor; }
  else if (act === "del") { state.confirmDel = true; }
  else if (act === "del-no") { state.confirmDel = false; }
  else if (act === "del-yes" && p) { deletePoint(p.id); return; }
  renderAll();
});
panel.addEventListener("change", (e) => {
  const p = getPoint(state.sel); if (!p) return;
  const id = e.target.id, v = e.target.value;
  if (id === "f-note" && v !== p.note) updatePoint(p.id, { note: v.slice(0, 300) });
  if (id === "f-len") { const l = clamp(num(v, p.len), 0, 200); if (l !== p.len) updatePoint(p.id, { len: l }); }
  if (id === "f-qty") { const q = clamp(Math.round(num(v, p.qty)), 1, 999); if (q !== p.qty) updatePoint(p.id, { qty: q }); }
  if (id === "f-group") { const gr = v.trim().slice(0, 40); if (gr !== p.group) updatePoint(p.id, { group: gr }); }
});
$("mode").addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.getAttribute("data-act") === "pick") { openPicker(); return; }
  state.mode = null; renderAll();
});
$("add").addEventListener("click", openPicker);
$("pick-close").addEventListener("click", closePicker);
$("overlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) closePicker(); });
$("pick-q").addEventListener("input", renderPicker);
$("pick-list").addEventListener("click", (e) => { const b = e.target.closest("[data-type]"); if (b) startAdd(b.getAttribute("data-type")); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("overlay").hidden) closePicker(); else if (state.mode) { state.mode = null; renderAll(); } } });
$("catalog").addEventListener("click", (e) => { const b = e.target.closest("[data-place]"); if (b) startAdd(b.getAttribute("data-place")); });
$("rooms").addEventListener("click", (e) => {
  const b = e.target.closest("[data-goto]"); if (!b) return;
  const p = getPoint(b.getAttribute("data-goto")); if (!p) return;
  state.sel = p.id; state.selGhost = null; state.floor = p.floor; state.cats[T[p.type].cat] = true;
  renderAll(); frame.scrollIntoView({ behavior: "smooth", block: "center" });
});
$("layers").addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (!b) return; const k = b.getAttribute("data-cat"); state.cats[k] = !state.cats[k]; saveUi(); renderLayers(); renderPlan(); });
$("floors").addEventListener("click", (e) => { const b = e.target.closest("[data-floor]"); if (!b) return; state.floor = b.getAttribute("data-floor"); renderLayers(); renderPlan(); });
$("ghosts").addEventListener("click", () => { state.ghosts = !state.ghosts; state.selGhost = null; saveUi(); renderLayers(); renderPlan(); renderPanel(); });
$("zoom").addEventListener("click", (e) => { state.zoom = !state.zoom; frame.classList.toggle("zoomed", state.zoom); e.currentTarget.setAttribute("aria-pressed", state.zoom); e.currentTarget.textContent = state.zoom ? "Pomniejsz" : "Powiększ"; });
$("copy-sv").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  const text = Array.from(document.querySelectorAll("#sv-list li")).map((li, i) => (i + 1) + ". " + li.textContent).join("\n");
  function done(ok) { btn.textContent = ok ? "Skopiowano" : "Zaznaczono tekst, skopiuj ręcznie"; setTimeout(() => { btn.textContent = "Kopiuj tekst"; }, 2200); }
  function fallback() { const range = document.createRange(); range.selectNodeContents($("sv-list")); const s = window.getSelection(); s.removeAllRanges(); s.addRange(range); done(false); }
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => done(true), fallback); else fallback(); } catch (err) { fallback(); }
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });

// ---------- Login ----------
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("login-email").value.trim(), password = $("login-password").value;
  const err = $("login-error"), btn = $("login-submit");
  err.hidden = true;
  if (!email || !password) { err.textContent = "Wpisz e-mail i hasło."; err.hidden = false; return; }
  btn.disabled = true; btn.textContent = "Logowanie…";
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = "Zaloguj się";
  if (error) {
    const m = String(error.message || "");
    err.textContent = /invalid login credentials/i.test(m) ? "Nieprawidłowy e-mail lub hasło."
      : /email not confirmed/i.test(m) ? "Konto nie jest potwierdzone. Potwierdź je w panelu Supabase."
      : /rate limit|too many/i.test(m) ? "Za dużo prób. Spróbuj ponownie za kilka minut."
      : "Nie udało się zalogować. Sprawdź internet i spróbuj ponownie.";
    err.hidden = false;
    return;
  }
  $("login-password").value = "";
  enterApp(data.session);
});
$("logout").addEventListener("click", async () => {
  await sb.auth.signOut();
  store.points = []; store.plan = null; store.suggestions = []; state.sel = null; state.selGhost = null;
  show("login");
});

sb.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT" && !$("app").hidden) { store.points = []; store.plan = null; show("login"); }
});

(async function boot() {
  const { data } = await sb.auth.getSession();
  if (data && data.session) enterApp(data.session); else show("login");
})();
