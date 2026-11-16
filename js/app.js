'use strict';

/* =========================================================
   Buget — aplicație de finanțe personale
   Structură:
     1. Utilitare
     2. Model de date + salvare (localStorage)
     3. Calcule (solduri, totaluri, credite, datorii)
     4. Ecrane (Dashboard, Tranzacții, Bugete, Investiții, Credite, Datorii, Analiză, Setări)
     5. Formulare (sheet de jos pe mobil / dialog pe desktop)
     6. Evenimente + pornire
   ========================================================= */

/* ---------- 1. Utilitare ---------- */
const STORE_KEY = 'buget.v1';
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); };
const monthOf = iso => iso.slice(0, 7);
const shiftMonth = (m, delta) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
const monthLabel = m => `${MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
const monthShort = m => MONTHS[+m.slice(5, 7) - 1].slice(0, 3);
const parseAmount = s => Math.round(parseFloat(String(s).replace(/\s/g, '').replace(',', '.')) * 100) / 100;
const round2 = n => Math.round(n * 100) / 100;
const initials = name => String(name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const fmtDate = d => (typeof d === 'string' ? new Date(d + 'T00:00') : d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });

function dayLabel(iso) {
  if (iso === todayISO()) return 'Azi';
  if (iso === addDays(-1)) return 'Ieri';
  return new Date(iso + 'T00:00').toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
}

const CURRENCIES = ['MDL', 'EUR', 'USD', 'RON'];
const ACC_TYPES = { card: 'Card', cash: 'Numerar', savings: 'Economii', bank: 'Cont bancar' };
const ACC_ICON = { cash: 'cash', bank: 'bank', savings: 'safe', card: 'wallet' };
const CARD_COLORS = { black: 'Negru', gray: 'Gri', white: 'Alb' };
/* Curs: câți MDL face 1 unitate (setat manual, editabil din Conturi) */
const DEFAULT_RATES = { MDL: 1, EUR: 19.5, USD: 17.2, RON: 3.9 };
const INV_TYPES = { etf: 'ETF / fonduri', stocks: 'Acțiuni', bonds: 'Obligațiuni', deposit: 'Depozit', crypto: 'Crypto', realestate: 'Imobiliare', other: 'Altele' };
const TX_TYPES = { expense: 'Cheltuială', income: 'Încasare' };

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  bank: '<path d="M3 10h18L12 4z"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 9h-6a3 3 0 0 0 0 6h6z"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  safe: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5V7M12 17v-1.5M7 21v-1M17 21v-1"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
};
const icon = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* Navigare: `tab` = apare în bara de jos pe mobil; restul sunt în „Mai mult” */
const NAV = [
  { id: 'home', label: 'Dashboard', icon: 'home', tab: true },
  { id: 'tx', label: 'Tranzacții', icon: 'list', tab: true },
  { id: 'accounts', label: 'Conturi', icon: 'wallet', tab: true },
  { id: 'budget', label: 'Bugete', icon: 'target', tab: true },
  { id: 'invest', label: 'Investiții', icon: 'trend' },
  { id: 'loans', label: 'Credite', icon: 'bank' },
  { id: 'debts', label: 'Datorii', icon: 'users' },
  { id: 'stats', label: 'Analiză', icon: 'chart' },
  { id: 'settings', label: 'Setări', icon: 'settings' },
];
const MORE = { id: 'more', label: 'Mai mult', icon: 'menu' };
const MONTH_ROUTES = ['home', 'tx', 'budget', 'stats'];

/* ---------- 2. Model de date ----------
   state = {
     settings:     { currency (moneda principală), rates: { EUR: 19.5, ... } (MDL per unitate), demo }
     accounts:     [{ id, name, type, currency, initial, bank?, last4?, color? }]   // sume în moneda contului
     transfers:    [{ id, fromId, toId, amount (moneda sursă), received (moneda destinație), date, note }]
     categories:   [{ id, name, type: 'expense' | 'income' }]
     transactions: [{ id, type, amount, categoryId, accountId, date, note, createdAt, loanId? }]
     budgets:      [{ id, categoryId, limit }]                         // limită lunară
     investments:  [{ id, name, type, invested, current, updatedAt }]
     loans:        [{ id, name, lender, principal, remaining, rate, monthly, dueDay, lastPaid }]
     debts:        [{ id, direction: 'owe' | 'owed', person, amount, paid, dueDate, note, payments: [{date, amount}] }]
   }
*/
function defaultState() {
  const categories = [
    ['Mâncare', 'expense'], ['Transport', 'expense'], ['Locuință', 'expense'], ['Facturi', 'expense'],
    ['Credite', 'expense'], ['Sănătate', 'expense'], ['Distracție', 'expense'], ['Cumpărături', 'expense'],
    ['Altele', 'expense'], ['Salariu', 'income'], ['Freelance', 'income'], ['Alte încasări', 'income'],
  ].map(([name, type]) => ({ id: uid(), name, type }));
  return {
    version: 5,
    settings: { currency: 'MDL', rates: { ...DEFAULT_RATES }, demo: false },
    accounts: [
      { id: uid(), name: 'Numerar', type: 'cash', currency: 'MDL', initial: 0 },
      { id: uid(), name: 'Card MAIB', type: 'card', bank: 'MAIB', last4: '', color: 'black', currency: 'MDL', initial: 0 },
      { id: uid(), name: 'Card MICB', type: 'card', bank: 'MICB', last4: '', color: 'gray', currency: 'MDL', initial: 0 },
      { id: uid(), name: 'Economii', type: 'savings', currency: 'EUR', initial: 0 },
    ],
    categories,
    transactions: [],
    transfers: [],
    budgets: [],
    investments: [],
    loans: [],
    debts: [],
  };
}

function seedDemo(s) {
  const c = n => s.categories.find(x => x.name === n).id;
  const [cash, maib, micb, sav] = s.accounts;
  cash.initial = 6000; maib.initial = 8000; micb.initial = 16000; sav.initial = 2500;
  maib.last4 = '4821'; micb.last4 = '1907';
  const card = maib;
  const today = todayISO();
  const plan = [
    ['income', 'Salariu', 25000, 1, maib.id, 'Salariu'],
    ['expense', 'Transport', 600, 2, maib.id, 'Abonament'],
    ['expense', 'Locuință', 5500, 3, maib.id, 'Chirie'],
    ['expense', 'Mâncare', 840, 4, micb.id, 'Supermarket'],
    ['expense', 'Credite', 1450, 5, maib.id, 'Rată Credit de consum'],
    ['expense', 'Facturi', 1200, 5, maib.id, 'Gaz și lumină'],
    ['expense', 'Facturi', 250, 6, micb.id, 'Internet'],
    ['expense', 'Sănătate', 380, 7, micb.id, 'Farmacie'],
    ['expense', 'Distracție', 450, 8, maib.id, 'Cinema și cină'],
    ['expense', 'Mâncare', 320, 9, cash.id, 'Piață'],
    ['income', 'Freelance', 4500, 10, micb.id, 'Proiect web'],
    ['expense', 'Transport', 180, 11, cash.id, 'Taxi'],
    ['expense', 'Cumpărături', 1300, 12, micb.id, 'Haine'],
    ['expense', 'Mâncare', 1100, 14, maib.id, 'Supermarket'],
    ['expense', 'Mâncare', 260, 16, cash.id, 'Cafenea'],
    ['expense', 'Credite', 3800, 20, card.id, 'Rată Credit auto'],
  ];
  s.transfers.push(
    { id: uid(), fromId: maib.id, toId: sav.id, amount: 3900, received: 200, date: addDays(-42), note: 'Economii lunare', demo: true },
    { id: uid(), fromId: maib.id, toId: sav.id, amount: 3900, received: 200, date: addDays(-12), note: 'Economii lunare', demo: true },
  );
  for (let k = -5; k <= 0; k++) {
    const m = shiftMonth(monthOf(today), k);
    plan.forEach(([type, cat, amt, day, accountId, note], i) => {
      const date = `${m}-${pad(day)}`;
      if (date > today) return;
      if (cat === 'Freelance' && k % 2) return;
      const amount = type === 'expense' && cat !== 'Credite' ? Math.round(amt * (0.8 + ((i * 7 + (k + 6) * 3) % 10) / 22)) : amt;
      s.transactions.push({ id: uid(), createdAt: Date.now() + i, type, amount, categoryId: c(cat), accountId, date, note, demo: true });
    });
  }
  [['Mâncare', 3000], ['Transport', 900], ['Facturi', 1500], ['Distracție', 800], ['Cumpărături', 1000]]
    .forEach(([n, limit]) => s.budgets.push({ id: uid(), categoryId: c(n), limit, demo: true }));

  s.investments.push(
    { id: uid(), name: 'ETF S&P 500', type: 'etf', currency: 'USD', invested: 1200, current: 1385, updatedAt: today, demo: true },
    { id: uid(), name: 'Depozit la termen', type: 'deposit', currency: 'MDL', invested: 30000, current: 31200, updatedAt: today, demo: true },
    { id: uid(), name: 'Depozit în euro', type: 'deposit', currency: 'EUR', invested: 1000, current: 1035, updatedAt: today, demo: true },
    { id: uid(), name: 'Obligațiuni de stat', type: 'bonds', currency: 'MDL', invested: 10000, current: 10450, updatedAt: today, demo: true },
    { id: uid(), name: 'Bitcoin', type: 'crypto', currency: 'USD', invested: 300, current: 255, updatedAt: today, demo: true },
  );
  s.loans.push(
    { id: uid(), name: 'Credit auto', lender: 'Bancă comercială', principal: 150000, remaining: 96400, rate: 9.5, monthly: 3800, dueDay: 20, demo: true },
    { id: uid(), name: 'Credit de consum', lender: 'Bancă comercială', principal: 30000, remaining: 12500, rate: 14, monthly: 1450, dueDay: 5, lastPaid: monthOf(today), demo: true },
  );
  s.debts.push(
    { id: uid(), direction: 'owe', person: 'Andrei', amount: 2000, paid: 500, dueDate: addDays(20), note: 'Împrumut pentru laptop', payments: [{ date: addDays(-10), amount: 500 }], demo: true },
    { id: uid(), direction: 'owed', person: 'Maria', amount: 1500, paid: 0, dueDate: addDays(-3), note: 'Bilete concert', payments: [], demo: true },
    { id: uid(), direction: 'owed', person: 'Ion', amount: 800, paid: 300, dueDate: addDays(9), note: '', payments: [{ date: addDays(-5), amount: 300 }], demo: true },
    { id: uid(), direction: 'owe', person: 'Părinți', amount: 5000, paid: 5000, dueDate: null, note: 'Avans chirie', payments: [], demo: true },
  );
  s.settings.demo = true;
}

function migrate(s) {
  s.settings ||= { currency: 'MDL' };
  s.settings.rates = { ...DEFAULT_RATES, ...(s.settings.rates || {}), MDL: 1 };
  ['budgets', 'investments', 'loans', 'debts', 'transfers'].forEach(k => { s[k] ||= []; });
  s.accounts.forEach(a => { a.currency ||= s.settings.currency || 'MDL'; });
  s.investments.forEach(i => { i.currency ||= s.settings.currency || 'MDL'; });
  if (!s.categories.some(c => c.name === 'Credite' && c.type === 'expense')) s.categories.push({ id: uid(), name: 'Credite', type: 'expense' });
  s.version = 5;
  return s;
}

function freshDemo() { const s = defaultState(); seedDemo(s); return s; }
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if ((s.version || 1) < 5 && s.settings?.demo) return defaultState(); // datele demo vechi → pornire curată
      return migrate(s);
    }
  } catch (e) { /* storage indisponibil */ }
  return defaultState(); // prima pornire: fără date demo
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignoră */ } }

let S = load();
const ui = { month: monthOf(todayISO()), filter: 'all', query: '' };

/* ---------- 3. Calcule ---------- */
const cat = id => S.categories.find(c => c.id === id);
const acc = id => S.accounts.find(a => a.id === id);
const byId = (list, id) => list.find(x => x.id === id);
const money = (n, dec = 2, cur) => new Intl.NumberFormat('ro-RO', {
  style: 'currency', currency: cur || S.settings.currency, minimumFractionDigits: 0, maximumFractionDigits: dec,
}).format(n);
const fmtNum = (n, dec = 4) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: dec }).format(n);
const numStr = n => String(round2(n)).replace('.', ',');

/* Valute: conversie prin MDL */
const rate = cur => S.settings.rates[cur] || 1;
const convert = (n, from, to) => (from === to ? n : (n * rate(from)) / rate(to));
const toBase = (n, cur) => convert(n, cur || S.settings.currency, S.settings.currency);
const accCur = id => acc(id)?.currency || S.settings.currency;
const txBase = t => toBase(t.amount, accCur(t.accountId));
const rateLabel = (cur = 'EUR') => `1 ${cur} = ${fmtNum(rate(cur))} MDL`;
const signed = (n, dec = 0) => (n >= 0 ? '+' : '−') + money(Math.abs(n), dec);
const signedPct = p => (p >= 0 ? '+' : '−') + Math.round(Math.abs(p) * 100) + '%';
const total = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);

const txOfMonth = m => S.transactions.filter(t => monthOf(t.date) === m);
const sum = (arr, type) => total(arr.filter(t => t.type === type), txBase);
/* Soldul unui cont, în moneda contului (tranzacții + transferuri) */
const balanceOf = a => a.initial
  + total(S.transactions.filter(t => t.accountId === a.id), t => (t.type === 'income' ? t.amount : -t.amount))
  + total(S.transfers.filter(x => x.toId === a.id), x => x.received)
  - total(S.transfers.filter(x => x.fromId === a.id), x => x.amount);
const totalBalance = () => total(S.accounts, a => toBase(balanceOf(a), a.currency));
const spentIn = (catId, m) => total(txOfMonth(m).filter(t => t.type === 'expense' && t.categoryId === catId), txBase);
const sortTx = arr => [...arr].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

function invTotals() {
  const invested = total(S.investments, i => toBase(i.invested, i.currency));
  const value = total(S.investments, i => toBase(i.current, i.currency));
  return { invested, value, pnl: value - invested, pct: invested ? (value - invested) / invested : 0 };
}
function loanTotals() {
  const active = S.loans.filter(l => l.remaining > 0);
  return { remaining: total(active, l => l.remaining), principal: total(S.loans, l => l.principal), monthly: total(active, l => l.monthly), count: active.length };
}
const debtLeft = d => Math.max(0, d.amount - d.paid);
function debtTotals() {
  return {
    owe: total(S.debts.filter(d => d.direction === 'owe'), debtLeft),
    owed: total(S.debts.filter(d => d.direction === 'owed'), debtLeft),
  };
}
const netWorth = () => {
  const d = debtTotals();
  return totalBalance() + invTotals().value - loanTotals().remaining - d.owe + d.owed;
};

/* Următoarea dată de plată a unui credit (sare peste luna deja plătită) */
function nextDue(l) {
  const t = new Date(todayISO() + 'T00:00');
  const make = (y, m) => new Date(y, m, Math.min(l.dueDay, new Date(y, m + 1, 0).getDate()));
  let d = make(t.getFullYear(), t.getMonth());
  if (d < t || l.lastPaid === monthOf(isoOf(d))) d = make(t.getFullYear(), t.getMonth() + 1);
  return d;
}
/* Luni rămase estimate (anuitate) */
function monthsLeft(l) {
  if (l.remaining <= 0) return 0;
  if (!(l.monthly > 0)) return null;
  const r = l.rate / 1200;
  if (!r) return Math.ceil(l.remaining / l.monthly);
  if (l.monthly <= l.remaining * r) return null;
  return Math.ceil(-Math.log(1 - (r * l.remaining) / l.monthly) / Math.log(1 + r));
}

/* Scadențe: rate de credit + datorii cu termen */
function upcoming(limit = 5) {
  const today = todayISO();
  const items = [];
  S.loans.filter(l => l.remaining > 0).forEach(l => {
    items.push({ iso: isoOf(nextDue(l)), title: l.name, sub: 'Rată credit', amount: Math.min(l.monthly, l.remaining), sign: '−', href: '#loans' });
  });
  S.debts.filter(d => d.dueDate && debtLeft(d) > 0).forEach(d => {
    items.push({ iso: d.dueDate, title: d.person, sub: d.direction === 'owe' ? 'Datorezi' : 'Îți datorează', amount: debtLeft(d), sign: d.direction === 'owe' ? '−' : '+', href: '#debts' });
  });
  return items.map(i => ({ ...i, late: i.iso < today })).sort((a, b) => a.iso.localeCompare(b.iso)).slice(0, limit);
}

/* ---------- 4. Ecrane ---------- */
const empty = (title, text) => `<div class="empty"><b>${title}</b>${text}</div>`;
const sectionHead = (title, action = '') => `<div class="section-head"><h2>${title}</h2>${action}</div>`;
const addLink = (action, label = '+ Adaugă') => `<button class="link" data-action="${action}">${label}</button>`;
const progress = (pct, cls = '') => `<div class="progress ${cls} ${pct > 1 ? 'over' : ''}"><i style="width:${Math.max(0, Math.min(pct, 1)) * 100}%"></i></div>`;
const badge = text => `<span class="badge">${text}</span>`;

function txRow(t) {
  const c = cat(t.categoryId), a = acc(t.accountId);
  return `<button class="row" data-action="edit-tx" data-id="${t.id}">
    <span class="avatar">${esc(initials(c?.name))}</span>
    <span class="row-main">
      <span class="row-title">${esc(t.note || c?.name || 'Fără categorie')}</span>
      <span class="row-sub">${esc(c?.name || '—')} · ${esc(a?.name || '—')}</span>
    </span>
    <span class="row-amt ${t.type}">${t.type === 'income' ? '+' : '−'}${money(t.amount, 2, accCur(t.accountId))}</span>
  </button>`;
}

/* Iconițe conturi: cardurile apar ca un mini-card cu numele băncii */
function accIcon(a, size = 'md') {
  if (a.type === 'card') return `<span class="cardico ${size} ${a.color || 'black'}"><i></i>${size === 'xs' ? '' : `<b>${esc((a.bank || a.name).slice(0, 5))}</b>`}</span>`;
  const ic = ACC_ICON[a.type] || 'wallet';
  return size === 'xs' ? `<span class="accico-xs">${icon(ic, 16)}</span>` : `<span class="avatar">${icon(ic, 20)}</span>`;
}
const accSub = a => [ACC_TYPES[a.type], a.bank && a.type !== 'card' ? a.bank : '', a.last4 ? `•••• ${a.last4}` : '', a.currency].filter(Boolean).map(esc).join(' · ');

function accRow(a) {
  const bal = balanceOf(a);
  return `<button class="row" data-action="edit-account" data-id="${a.id}">
    ${accIcon(a)}
    <span class="row-main"><span class="row-title">${esc(a.name)}</span><span class="row-sub">${accSub(a)}</span></span>
    <span class="row-end"><b>${money(bal, 2, a.currency)}</b>${a.currency !== S.settings.currency ? `<small>≈ ${money(toBase(bal, a.currency), 0)}</small>` : ''}</span>
  </button>`;
}

function bankCard(a) {
  return `<button class="bankcard ${a.color || 'black'}" data-action="edit-account" data-id="${a.id}">
    <span class="bc-top"><b>${esc(a.bank || a.name)}</b><i class="bc-chip"></i></span>
    <span class="bc-num">•••• ${esc(a.last4 || '••••')}</span>
    <span class="bc-bottom">
      <span><small>${esc(a.name)}</small><b>${money(balanceOf(a), 2, a.currency)}</b></span>
      <span class="bc-cur">${a.currency}</span>
    </span>
  </button>`;
}

function transferRow(x) {
  const f = acc(x.fromId), t = acc(x.toId);
  const fx = f && t && f.currency !== t.currency;
  return `<button class="row" data-action="edit-transfer" data-id="${x.id}">
    <span class="avatar">${icon('swap', 18)}</span>
    <span class="row-main"><span class="row-title">${esc(f?.name || '—')} → ${esc(t?.name || '—')}</span>
      <span class="row-sub">${fmtDate(x.date)}${fx ? ' · schimb valutar' : ''}${x.note ? ' · ' + esc(x.note) : ''}</span></span>
    <span class="row-end"><b>−${money(x.amount, 2, f?.currency)}</b>${fx ? `<small>+${money(x.received, 2, t.currency)}</small>` : ''}</span>
  </button>`;
}

function budgetRow(b) {
  const c = cat(b.categoryId);
  const spent = spentIn(b.categoryId, ui.month);
  const pct = b.limit ? spent / b.limit : 0;
  return `<button class="budget" data-action="edit-budget" data-id="${b.id}">
    <div class="budget-top">
      <span class="row-title">${esc(c?.name || '—')}</span>
      <span class="budget-val"><b>${money(spent, 0)}</b> / ${money(b.limit, 0)}</span>
    </div>
    ${progress(pct)}
    <div class="budget-sub">
      <span>${pct > 1 ? `Depășit cu ${money(spent - b.limit, 0)}` : `Rămas ${money(b.limit - spent, 0)}`}</span>
      <span>${Math.round(pct * 100)}%</span>
    </div>
  </button>`;
}

function upcomingRow(u) {
  const d = new Date(u.iso + 'T00:00');
  return `<a class="row" href="${u.href}">
    <span class="avatar date ${u.late ? 'dark' : ''}">${d.getDate()}<small>${monthShort(u.iso)}</small></span>
    <span class="row-main"><span class="row-title">${esc(u.title)}</span><span class="row-sub">${u.sub}${u.late ? ' · întârziat' : ''}</span></span>
    <span class="row-amt">${u.sign}${money(u.amount, 0)}</span>
  </a>`;
}

/* ----- Dashboard ----- */
function viewHome() {
  const m = txOfMonth(ui.month), pm = txOfMonth(shiftMonth(ui.month, -1));
  const inc = sum(m, 'income'), exp = sum(m, 'expense');
  const pinc = sum(pm, 'income'), pexp = sum(pm, 'expense');
  const it = invTotals(), lt = loanTotals(), dt = debtTotals();
  const prev = monthShort(shiftMonth(ui.month, -1)).toLowerCase();
  const vsPrev = (a, b) => (b ? `${signedPct((a - b) / b)} față de ${prev}.` : `Nimic în ${prev}.`);
  const assets = totalBalance() + it.value + dt.owed;
  const liabilities = lt.remaining + dt.owe;
  const recent = sortTx(m).slice(0, 6);
  const ratio = b => (b.limit ? spentIn(b.categoryId, ui.month) / b.limit : 0);
  const topBudgets = [...S.budgets].sort((a, b) => ratio(b) - ratio(a)).slice(0, 3);
  const due = upcoming(4);

  return `
  ${S.settings.demo ? `<div class="notice"><span>Vezi date demo.</span><button class="link" data-action="clear-demo">Șterge-le</button></div>` : ''}
  <section class="hero">
    <div class="hero-label">Valoare netă</div>
    <div class="hero-big">${money(netWorth(), 0)}</div>
    <div class="hero-split">
      <div><span>Active</span><b>${money(assets, 0)}</b></div>
      <div><span>Obligații</span><b>${money(liabilities, 0)}</b></div>
    </div>
  </section>

  <div class="tiles">
    <button class="tile" data-action="go" data-route="tx" data-filter="income">
      <span class="tile-label">Încasări</span>
      <b>${money(inc, 0)}</b>
      <span class="tile-sub">${vsPrev(inc, pinc)}</span>
    </button>
    <button class="tile" data-action="go" data-route="tx" data-filter="expense">
      <span class="tile-label">Cheltuieli</span>
      <b>${money(exp, 0)}</b>
      <span class="tile-sub">${inc ? `${Math.round((exp / inc) * 100)}% din încasări` : vsPrev(exp, pexp)}</span>
    </button>
    <a class="tile" href="#invest">
      <span class="tile-label">Investiții</span>
      <b>${money(it.value, 0)}</b>
      <span class="tile-sub">${S.investments.length ? `${signed(it.pnl)} (${signedPct(it.pct)})` : 'Niciun activ'}</span>
    </a>
    <a class="tile" href="#loans">
      <span class="tile-label">Credite</span>
      <b>${money(lt.remaining, 0)}</b>
      <span class="tile-sub">${lt.count ? `Rată ${money(lt.monthly, 0)}/lună` : 'Niciun credit'}</span>
    </a>
    <a class="tile" href="#debts">
      <span class="tile-label">Datorii</span>
      <b>${money(dt.owe, 0)}</b>
      <span class="tile-sub">${dt.owed ? `Ți se datorează ${money(dt.owed, 0)}` : 'Cât datorezi'}</span>
    </a>
  </div>

  <div class="grid-2">
    <div>
      <section class="section">
        ${sectionHead('Recente', '<a class="link" href="#tx">Vezi toate</a>')}
        ${recent.length ? `<div class="list">${recent.map(txRow).join('')}</div>` : empty('Nicio tranzacție', 'Apasă + pentru a adăuga prima.')}
      </section>
    </div>
    <div>
      <section class="section">
        ${sectionHead('Scadențe')}
        ${due.length ? `<div class="list">${due.map(upcomingRow).join('')}</div>` : empty('Nicio scadență', 'Ratele și datoriile cu termen apar aici.')}
      </section>
      <section class="section">
        ${sectionHead('Bugete', '<a class="link" href="#budget">Toate</a>')}
        ${topBudgets.length ? topBudgets.map(budgetRow).join('') : empty('Niciun buget', 'Setează limite lunare în Bugete.')}
      </section>
    </div>
  </div>`;
}

/* ----- Tranzacții ----- */
function viewTx() {
  const filters = [['all', 'Toate'], ['expense', 'Cheltuieli'], ['income', 'Încasări']];
  return `
  <div class="toolbar">
    <div class="seg">${filters.map(([k, l]) => `<button data-action="filter" data-filter="${k}" class="${ui.filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <label class="search">${icon('search', 18)}<input id="q" type="search" placeholder="Caută după notă sau categorie" value="${esc(ui.query)}" autocomplete="off"></label>
  </div>
  <div id="txList">${txListHTML()}</div>`;
}

function txListHTML() {
  let arr = txOfMonth(ui.month);
  if (ui.filter !== 'all') arr = arr.filter(t => t.type === ui.filter);
  const q = ui.query.trim().toLowerCase();
  if (q) arr = arr.filter(t => (t.note || '').toLowerCase().includes(q) || (cat(t.categoryId)?.name || '').toLowerCase().includes(q));
  if (!arr.length) return empty('Nimic aici', 'Nu există tranzacții pentru filtrul ales.');

  const groups = {};
  sortTx(arr).forEach(t => (groups[t.date] ||= []).push(t));
  return `<div class="summary-line"><span>${arr.length} tranzacții</span><span>+${money(sum(arr, 'income'), 0)} · −${money(sum(arr, 'expense'), 0)}</span></div>` +
    Object.entries(groups).map(([d, list]) => {
      const net = total(list, t => (t.type === 'income' ? txBase(t) : -txBase(t)));
      return `<div class="day">
        <div class="day-head"><span>${dayLabel(d)}</span><span>${signed(net)}</span></div>
        <div class="list">${list.map(txRow).join('')}</div>
      </div>`;
    }).join('');
}

/* ----- Conturi ----- */
function viewAccounts() {
  const base = S.settings.currency;
  const byCur = {};
  S.accounts.forEach(a => { byCur[a.currency] = (byCur[a.currency] || 0) + balanceOf(a); });
  const cards = S.accounts.filter(a => a.type === 'card');
  const group = (types, title) => {
    const list = S.accounts.filter(a => types.includes(a.type));
    return list.length ? `<section class="section">${sectionHead(title)}<div class="list">${list.map(accRow).join('')}</div></section>` : '';
  };
  const transfers = [...S.transfers].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const eur = ui.convEUR ?? 100;

  return `
  <div class="grid-2">
    <div>
      <section class="hero">
        <div class="hero-label">Total în conturi</div>
        <div class="hero-big">${money(totalBalance(), 0)}</div>
        <div class="hero-split">
          ${Object.entries(byCur).map(([c, v]) => `<div><span>În ${c}</span><b>${money(v, 0, c)}</b>${c !== base ? `<small>≈ ${money(toBase(v, c), 0)}</small>` : ''}</div>`).join('')}
        </div>
      </section>
      <div class="action-row">
        <button class="btn" data-action="add-account">+ Cont nou</button>
        <button class="btn primary" data-action="add-transfer">${icon('swap', 18)} Transfer / schimb</button>
      </div>
      <section class="section">
        ${sectionHead('Carduri', addLink('add-card', '+ Card'))}
        ${cards.length ? `<div class="wallet">${cards.map(bankCard).join('')}</div>` : empty('Niciun card', 'Adaugă cardurile tale.')}
      </section>
    </div>
    <div>
      <section class="section card">
        ${sectionHead('Convertor', `<button class="link" data-action="edit-rates">${rateLabel('EUR')}</button>`)}
        <div class="conv">
          <label class="field"><span class="label">EUR</span><input id="convEUR" inputmode="decimal" value="${numStr(eur)}" autocomplete="off"></label>
          <span class="conv-ico">${icon('swap', 18)}</span>
          <label class="field"><span class="label">MDL</span><input id="convMDL" inputmode="decimal" value="${numStr(convert(eur, 'EUR', 'MDL'))}" autocomplete="off"></label>
        </div>
        <p class="hint">Cursul e setat manual. Apasă pe curs ca să-l schimbi.</p>
      </section>
      ${group(['cash'], 'Numerar')}
      ${group(['savings', 'bank'], 'Economii și alte conturi')}
      <section class="section">
        ${sectionHead('Transferuri și schimburi', addLink('add-transfer', '+ Nou'))}
        ${transfers.length ? `<div class="list">${transfers.map(transferRow).join('')}</div>` : empty('Niciun transfer', 'Mută bani între conturi sau schimbă valută.')}
      </section>
    </div>
  </div>`;
}

/* ----- Bugete ----- */
function viewBudget() {
  const limit = total(S.budgets, b => b.limit);
  const spent = total(S.budgets, b => spentIn(b.categoryId, ui.month));
  return `
  <div class="grid-2">
    <div>
      <section class="hero">
        <div class="hero-label">Rămas din buget · ${monthLabel(ui.month)}</div>
        <div class="hero-big">${money(limit - spent, 0)}</div>
        <div class="hero-sub">Cheltuit ${money(spent, 0)} din ${money(limit, 0)}</div>
        ${progress(limit ? spent / limit : 0, 'inv')}
      </section>
    </div>
    <div>
      <section class="section">
        ${sectionHead('Pe categorii', addLink('add-budget'))}
        ${S.budgets.length ? S.budgets.map(budgetRow).join('') : empty('Niciun buget', 'Setează limite lunare pe categorii.')}
      </section>
    </div>
  </div>`;
}

/* ----- Investiții ----- */
function viewInvest() {
  const it = invTotals();
  const byType = {};
  S.investments.forEach(i => { byType[i.type] = (byType[i.type] || 0) + toBase(i.current, i.currency); });
  const alloc = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const max = alloc[0]?.[1] || 1;

  return `
  <div class="grid-2">
    <div>
      <section class="hero">
        <div class="hero-label">Valoare portofoliu</div>
        <div class="hero-big">${money(it.value, 0)}</div>
        <div class="hero-split">
          <div><span>Investit</span><b>${money(it.invested, 0)}</b></div>
          <div><span>Profit / pierdere</span><b>${signed(it.pnl)} · ${signedPct(it.pct)}</b></div>
        </div>
      </section>
      ${alloc.length ? `<section class="section">${sectionHead('Alocare')}
        ${alloc.map(([type, v]) => `<div class="hbar">
          <div class="hbar-top"><span>${INV_TYPES[type] || type}</span><span>${money(v, 0)} · ${Math.round((v / it.value) * 100)}%</span></div>
          ${progress(v / max)}
        </div>`).join('')}
      </section>` : ''}
    </div>
    <div>
      <section class="section">
        ${sectionHead('Active', addLink('add-invest'))}
        ${S.investments.length ? `<div class="list">${S.investments.map(i => {
          const pnl = i.current - i.invested;
          const cur = i.currency || S.settings.currency;
          const foreign = cur !== S.settings.currency;
          return `<button class="row" data-action="edit-invest" data-id="${i.id}">
            <span class="avatar">${esc(initials(i.name))}</span>
            <span class="row-main"><span class="row-title">${esc(i.name)} <span class="cur-tag">${cur}</span></span><span class="row-sub">${INV_TYPES[i.type] || ''} · investit ${money(i.invested, 0, cur)}${foreign ? ` · ≈ ${money(toBase(i.current, cur), 0)}` : ''}</span></span>
            <span class="row-end"><b>${money(i.current, 0, cur)}</b><small>${(pnl >= 0 ? '+' : '−') + money(Math.abs(pnl), 0, cur)} · ${signedPct(i.invested ? pnl / i.invested : 0)}</small></span>
          </button>`;
        }).join('')}</div>` : empty('Nicio investiție', 'Adaugă acțiuni, ETF-uri, depozite sau crypto.')}
      </section>
    </div>
  </div>`;
}

/* ----- Credite ----- */
function viewLoans() {
  const lt = loanTotals();
  const paid = lt.principal - total(S.loans, l => l.remaining);
  const nextLoan = S.loans.filter(l => l.remaining > 0).map(l => ({ l, d: nextDue(l) })).sort((a, b) => a.d - b.d)[0];

  const item = l => {
    const n = monthsLeft(l);
    const done = l.remaining <= 0;
    return `<div class="item">
      <div class="item-top">
        <span class="row-main">
          <span class="row-title">${esc(l.name)}${done ? badge('Achitat') : ''}</span>
          <span class="row-sub">${esc(l.lender || '—')} · dobândă ${l.rate}% · plata pe ${l.dueDay}</span>
        </span>
        <button class="link" data-action="edit-loan" data-id="${l.id}">Editează</button>
      </div>
      <div class="budget-top"><span class="budget-val">Rămas <b>${money(l.remaining, 0)}</b></span><span class="budget-val">din ${money(l.principal, 0)}</span></div>
      ${progress(l.principal ? 1 - l.remaining / l.principal : 0)}
      <div class="item-foot">
        <span>${done ? 'Credit închis' : `Rată ${money(l.monthly, 0)} · ${n === null ? 'rata nu acoperă dobânda' : `~${n} luni rămase`}`}</span>
        ${done ? '' : `<button class="btn sm primary" data-action="pay-loan" data-id="${l.id}">Plătește rata</button>`}
      </div>
    </div>`;
  };

  return `
  <div class="grid-2">
    <div>
      <section class="hero">
        <div class="hero-label">Rămas de plătit</div>
        <div class="hero-big">${money(lt.remaining, 0)}</div>
        <div class="hero-sub">Achitat ${money(paid, 0)} din ${money(lt.principal, 0)}</div>
        ${progress(lt.principal ? paid / lt.principal : 0, 'inv')}
        <div class="hero-split">
          <div><span>Rate lunare</span><b>${money(lt.monthly, 0)}</b></div>
          <div><span>Următoarea plată</span><b>${nextLoan ? fmtDate(nextLoan.d) : '—'}</b></div>
        </div>
      </section>
    </div>
    <div>
      <section class="section">
        ${sectionHead('Creditele tale', addLink('add-loan'))}
        ${S.loans.length ? S.loans.map(item).join('') : empty('Niciun credit', 'Adaugă un credit ca să urmărești ratele.')}
      </section>
    </div>
  </div>`;
}

/* ----- Datorii ----- */
function viewDebts() {
  const dt = debtTotals();
  const today = todayISO();
  const active = S.debts.filter(d => debtLeft(d) > 0);
  const settled = S.debts.filter(d => debtLeft(d) <= 0);

  const item = d => {
    const left = debtLeft(d);
    const late = d.dueDate && d.dueDate < today;
    const when = d.dueDate ? (late ? badge('Întârziat') : `termen ${fmtDate(d.dueDate)}`) : 'fără termen';
    return `<div class="item">
      <div class="item-top">
        <span class="row-main">
          <span class="row-title">${esc(d.person)}</span>
          <span class="row-sub">${d.note ? esc(d.note) + ' · ' : ''}${when}</span>
        </span>
        <button class="link" data-action="edit-debt" data-id="${d.id}">Editează</button>
      </div>
      <div class="budget-top"><span class="budget-val">Rămas <b>${money(left, 0)}</b></span><span class="budget-val">din ${money(d.amount, 0)}</span></div>
      ${progress(d.amount ? d.paid / d.amount : 0)}
      <div class="item-foot">
        <span>${d.paid ? `Achitat ${money(d.paid, 0)}` : 'Nimic achitat'}</span>
        <button class="btn sm primary" data-action="pay-debt" data-id="${d.id}">${d.direction === 'owe' ? 'Am plătit' : 'Am primit'}</button>
      </div>
    </div>`;
  };
  const group = (dir, title) => {
    const list = active.filter(d => d.direction === dir);
    return `<section class="section">${sectionHead(title)}${list.length ? list.map(item).join('') : empty('Nimic', 'Nicio datorie activă.')}</section>`;
  };

  return `
  <div class="grid-2">
    <div>
      <section class="hero">
        <div class="hero-label">Sold net datorii</div>
        <div class="hero-big">${signed(dt.owed - dt.owe)}</div>
        <div class="hero-split">
          <div><span>Datorezi</span><b>${money(dt.owe, 0)}</b></div>
          <div><span>Ți se datorează</span><b>${money(dt.owed, 0)}</b></div>
        </div>
      </section>
      <button class="btn block add-under" data-action="add-debt">+ Adaugă datorie</button>
    </div>
    <div>
      ${group('owe', 'Datorez eu')}
      ${group('owed', 'Mi se datorează')}
      ${settled.length ? `<section class="section">${sectionHead('Achitate')}
        <div class="list">${settled.map(d => `<button class="row" data-action="edit-debt" data-id="${d.id}">
          <span class="avatar">${esc(initials(d.person))}</span>
          <span class="row-main"><span class="row-title">${esc(d.person)}</span><span class="row-sub">${d.direction === 'owe' ? 'Datorai' : 'Îți datora'}${d.note ? ' · ' + esc(d.note) : ''}</span></span>
          <span class="row-amt">${money(d.amount, 0)}</span>
        </button>`).join('')}</div></section>` : ''}
    </div>
  </div>`;
}

/* ----- Analiză ----- */
function viewStats() {
  const m = txOfMonth(ui.month);
  const inc = sum(m, 'income'), exp = sum(m, 'expense');
  const rate = inc ? (inc - exp) / inc : 0;

  const byCat = {};
  m.filter(t => t.type === 'expense').forEach(t => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount; });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const max = cats[0]?.[1] || 1;

  const series = Array.from({ length: 6 }, (_, i) => shiftMonth(ui.month, i - 5)).map(mm => {
    const a = txOfMonth(mm);
    return { m: mm, inc: sum(a, 'income'), exp: sum(a, 'expense') };
  });
  const smax = Math.max(1, ...series.flatMap(s => [s.inc, s.exp]));

  return `
  <div class="kpis">
    <div class="kpi"><span>Încasări</span><b>${money(inc, 0)}</b></div>
    <div class="kpi"><span>Cheltuieli</span><b>${money(exp, 0)}</b></div>
    <div class="kpi"><span>Economisit</span><b>${money(inc - exp, 0)}</b></div>
    <div class="kpi dark"><span>Rată economisire</span><b>${Math.round(rate * 100)}%</b></div>
  </div>
  <div class="grid-2">
    <section class="section card">
      ${sectionHead('Cheltuieli pe categorii')}
      ${cats.length ? cats.map(([id, v]) => `<div class="hbar">
        <div class="hbar-top"><span>${esc(cat(id)?.name || '—')}</span><span>${money(v, 0)} · ${Math.round((v / exp) * 100)}%</span></div>
        ${progress(v / max)}
      </div>`).join('') : empty('Fără cheltuieli', 'în această lună.')}
    </section>
    <section class="section card">
      ${sectionHead('Ultimele 6 luni', '<div class="legend"><span><i class="sw inc"></i>Încasări</span><span><i class="sw exp"></i>Cheltuieli</span></div>')}
      <div class="cols">${series.map(s => `<div class="col ${s.m === ui.month ? 'cur' : ''}">
        <div class="bars">
          <i class="inc" style="height:${(s.inc / smax) * 100}%" title="Încasări: ${money(s.inc)}"></i>
          <i class="exp" style="height:${(s.exp / smax) * 100}%" title="Cheltuieli: ${money(s.exp)}"></i>
        </div>
        <span>${monthShort(s.m)}</span>
      </div>`).join('')}</div>
    </section>
  </div>`;
}

/* ----- Setări ----- */
function viewSettings() {
  const chips = type => S.categories.filter(c => c.type === type)
    .map(c => `<button class="chip" data-action="edit-category" data-id="${c.id}">${esc(c.name)}</button>`).join('');
  return `
  <div class="grid-2">
    <div>
      <section class="section">
        ${sectionHead('General')}
        <div class="list">
          <div class="row">
            <span class="row-main"><span class="row-title">Moneda principală</span><span class="row-sub">Totalurile se calculează în ea</span></span>
            <select id="currency" class="select-inline" aria-label="Moneda principală">${CURRENCIES.map(c => `<option ${c === S.settings.currency ? 'selected' : ''}>${c}</option>`).join('')}</select>
          </div>
          <button class="row" data-action="edit-rates">
            <span class="row-main"><span class="row-title">Curs valutar</span><span class="row-sub">${rateLabel('EUR')} · ${rateLabel('USD')}</span></span>
            <span class="chev">${icon('chev', 18)}</span>
          </button>
          <a class="row" href="#accounts">
            <span class="row-main"><span class="row-title">Conturi și carduri</span><span class="row-sub">${S.accounts.length} conturi</span></span>
            <span class="chev">${icon('chev', 18)}</span>
          </a>
        </div>
      </section>
    </div>
    <div>
      <section class="section">
        ${sectionHead('Categorii', addLink('add-category'))}
        <h3 class="sub">Cheltuieli</h3><div class="chips">${chips('expense')}</div>
        <h3 class="sub">Încasări</h3><div class="chips">${chips('income')}</div>
      </section>

      <section class="section">
        ${sectionHead('Date')}
        <div class="stack">
          <button class="btn" data-action="export">Exportă JSON</button>
          <label class="btn">Importă JSON<input type="file" id="importFile" accept="application/json,.json" hidden></label>
          ${S.settings.demo ? '<button class="btn" data-action="clear-demo">Șterge datele demo</button>' : ''}
          ${S.settings.demo ? '' : '<button class="btn" data-action="load-demo">Încarcă date demo</button>'}
          <button class="btn danger" data-action="reset">Resetează tot</button>
        </div>
        <p class="hint">Datele sunt salvate local, în acest browser.</p>
      </section>
    </div>
  </div>`;
}

/* ----- Mai mult (mobil) ----- */
function viewMore() {
  const it = invTotals(), lt = loanTotals(), dt = debtTotals();
  const items = [
    ['invest', 'trend', 'Investiții', `Valoare ${money(it.value, 0)}`],
    ['loans', 'bank', 'Credite', `Rămas ${money(lt.remaining, 0)}`],
    ['debts', 'users', 'Datorii', `Datorezi ${money(dt.owe, 0)} · ți se datorează ${money(dt.owed, 0)}`],
    ['stats', 'chart', 'Analiză', 'Rapoarte lunare și tendințe'],
    ['settings', 'settings', 'Setări', 'Monedă, conturi, categorii, date'],
  ];
  return `<div class="list">${items.map(([id, ic, title, sub]) => `<a class="row" href="#${id}">
    <span class="avatar">${icon(ic, 20)}</span>
    <span class="row-main"><span class="row-title">${title}</span><span class="row-sub">${sub}</span></span>
    <span class="chev">${icon('chev', 18)}</span>
  </a>`).join('')}</div>`;
}

const VIEWS = { home: viewHome, tx: viewTx, accounts: viewAccounts, budget: viewBudget, invest: viewInvest, loans: viewLoans, debts: viewDebts, stats: viewStats, settings: viewSettings, more: viewMore };

/* ---------- 5. Formulare ---------- */
let sheetTimer;
function openSheet(title, html, mount) {
  const el = $('#sheet');
  clearTimeout(sheetTimer);
  el.classList.remove('closing');
  el.innerHTML = `<div class="sheet-backdrop" data-action="close-sheet"></div>
    <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="grabber"></div>
      <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-action="close-sheet" aria-label="Închide">${icon('close', 20)}</button></div>
      ${html}
    </div>`;
  el.hidden = false;
  document.body.classList.add('locked');
  if (mount) mount(el);
}
function closeSheet() {
  const el = $('#sheet');
  if (el.hidden || el.classList.contains('closing')) return;
  document.body.classList.remove('locked');
  const finish = () => { el.hidden = true; el.innerHTML = ''; el.classList.remove('closing'); };
  if (reducedMotion()) return finish();
  el.classList.add('closing');
  sheetTimer = setTimeout(finish, 220);
}

/* Confirmare în pagină (fără ferestre pop-up): primul tap „armează” butonul, al doilea confirmă */
function armed(el, label) {
  if (el.dataset.armed) return true;
  el.dataset.armed = '1';
  el.dataset.orig = el.textContent;
  el.textContent = label;
  el.classList.add('armed');
  setTimeout(() => {
    if (!el.isConnected || !el.dataset.armed) return;
    delete el.dataset.armed;
    el.textContent = el.dataset.orig;
    el.classList.remove('armed');
  }, 4000);
  return false;
}

/* Construiește un formular în sheet.
   onSubmit(f) → false = validare eșuată; string = mesaj toast; altfel „Salvat”.
   onDelete()  → false = anulat. */
function formSheet({ title, body, edit = false, submitLabel, onSubmit, onDelete, onMount }) {
  const del = edit && onDelete ? '<button type="button" class="btn danger" data-del>Șterge</button>' : '';
  const html = `<form class="form" id="f" novalidate>${body}
    <div class="actions">${del}<button class="btn primary">${submitLabel || (edit ? 'Salvează' : 'Adaugă')}</button></div>
  </form>`;
  openSheet(title, html, el => {
    const f = $('#f', el);
    if (onMount) onMount(f, el);
    f.onsubmit = e => {
      e.preventDefault();
      const msg = onSubmit(f);
      if (msg === false) return;
      closeSheet(); commit(msg || 'Salvat');
    };
    const d = el.querySelector('[data-del]');
    if (d) d.onclick = () => {
      if (!armed(d, 'Apasă din nou ca să ștergi')) return;
      if (onDelete() === false) return;
      closeSheet(); commit('Șters');
    };
  });
}

/* Câmpuri reutilizabile */
const val = (f, n) => (f.elements[n]?.value ?? '').trim();
const fInput = (label, name, v = '', attrs = '') => `<label class="field"><span class="label">${label}</span><input name="${name}" value="${esc(v ?? '')}" ${attrs}></label>`;
const fMoney = (label, name, v) => fInput(label, name, v ?? '', 'inputmode="decimal" autocomplete="off" placeholder="0"');
const fDate = (label, name, v) => fInput(label, name, v || '', 'type="date"');
const fSelect = (label, name, opts, v) => `<label class="field"><span class="label">${label}</span><select name="${name}">${Object.entries(opts).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
const fAmount = (v, cur) => `<div class="amount"><input name="amount" inputmode="decimal" placeholder="0" autocomplete="off" value="${v ?? ''}" aria-label="Sumă"><span class="amt-cur">${cur || S.settings.currency}</span></div>`;
const row2 = (a, b) => `<div class="row2">${a}${b}</div>`;
const segHTML = (id, opts) => `<div class="seg" id="${id}">${Object.entries(opts).map(([k, l]) => `<button type="button" data-v="${k}">${l}</button>`).join('')}</div>`;
const accOpts = (filter = () => true) => Object.fromEntries(S.accounts.filter(filter).map(a => [a.id, `${a.name} · ${a.currency}`]));
function wireSeg(el, id, value, onChange) {
  const s = $('#' + id, el);
  const paint = v => s.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  paint(value);
  s.onclick = e => { const b = e.target.closest('[data-v]'); if (b) { paint(b.dataset.v); onChange(b.dataset.v); } };
}
const focusSoon = input => setTimeout(() => input?.focus(), 60);
const fail = msg => { toast(msg); return false; };
const defaultDate = () => (ui.month === monthOf(todayISO()) ? todayISO() : `${ui.month}-01`);
function ensureCategory(name, type) {
  let c = S.categories.find(x => x.name === name && x.type === type);
  if (!c) { c = { id: uid(), name, type }; S.categories.push(c); }
  return c.id;
}

function txForm(t) {
  const edit = !!t;
  let type = t?.type || 'expense';
  let catId = t?.categoryId;
  let accId = t?.accountId || ui.lastAcc || S.accounts.find(a => a.type === 'card')?.id || S.accounts[0]?.id;
  formSheet({
    title: edit ? 'Editează tranzacția' : 'Tranzacție nouă', edit,
    body: `${segHTML('typeSeg', TX_TYPES)}
      ${fAmount(t?.amount, accCur(accId))}
      <div class="field"><span class="label">Categorie</span><div class="chips" id="catChips"></div></div>
      <div class="field"><span class="label">Cont</span><div class="chips" id="accChips"></div></div>
      ${row2(fDate('Data', 'date', t?.date || defaultDate()), fInput('Notă', 'note', t?.note, 'placeholder="Opțional" maxlength="80"'))}`,
    onMount: (f, el) => {
      const chips = $('#catChips', el), accChips = $('#accChips', el);
      const paint = () => {
        const list = S.categories.filter(c => c.type === type);
        if (!list.some(c => c.id === catId)) catId = list[0]?.id;
        chips.innerHTML = list.map(c => `<button type="button" class="chip ${c.id === catId ? 'on' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('');
      };
      const paintAcc = () => {
        accChips.innerHTML = S.accounts.map(a => `<button type="button" class="chip acc-chip ${a.id === accId ? 'on' : ''}" data-acc="${a.id}">${accIcon(a, 'xs')}${esc(a.name)}</button>`).join('');
        $('.amt-cur', el).textContent = accCur(accId);
      };
      paint(); paintAcc();
      wireSeg(el, 'typeSeg', type, v => { type = v; paint(); });
      chips.onclick = e => { const b = e.target.closest('[data-cat]'); if (b) { catId = b.dataset.cat; paint(); } };
      accChips.onclick = e => { const b = e.target.closest('[data-acc]'); if (b) { accId = b.dataset.acc; paintAcc(); } };
      if (!edit) focusSoon(f.elements.amount);
    },
    onSubmit: f => {
      const amount = parseAmount(val(f, 'amount'));
      if (!(amount > 0)) return fail('Introdu o sumă validă');
      if (!catId) return fail('Adaugă întâi o categorie');
      if (!accId) return fail('Adaugă întâi un cont');
      ui.lastAcc = accId;
      const data = { type, amount, categoryId: catId, accountId: accId, date: val(f, 'date') || todayISO(), note: val(f, 'note') };
      if (edit) Object.assign(t, data); else S.transactions.push({ id: uid(), createdAt: Date.now(), ...data });
      return edit ? 'Salvat' : 'Adăugat';
    },
    onDelete: () => {
      S.transactions = S.transactions.filter(x => x.id !== t.id);
    },
  });
}

function budgetForm(b) {
  const edit = !!b;
  const used = new Set(S.budgets.map(x => x.categoryId));
  const options = S.categories.filter(c => c.type === 'expense' && (!used.has(c.id) || c.id === b?.categoryId));
  if (!options.length) { toast('Toate categoriile au deja buget'); return; }
  formSheet({
    title: edit ? 'Editează bugetul' : 'Buget nou', edit,
    body: `${fSelect('Categorie', 'categoryId', Object.fromEntries(options.map(c => [c.id, c.name])), b?.categoryId)}
      ${fMoney(`Limită lunară (${S.settings.currency})`, 'limit', b?.limit)}`,
    onSubmit: f => {
      const limit = parseAmount(val(f, 'limit'));
      if (!(limit > 0)) return fail('Introdu o limită validă');
      const data = { categoryId: val(f, 'categoryId'), limit };
      if (edit) Object.assign(b, data); else S.budgets.push({ id: uid(), ...data });
    },
    onDelete: () => {
      S.budgets = S.budgets.filter(x => x.id !== b.id);
    },
  });
}

const INV_CURRENCIES = { USD: 'USD', EUR: 'EUR', MDL: 'MDL' };
function investForm(i) {
  const edit = !!i;
  let cur = i?.currency || ui.lastInvCur || 'USD';
  formSheet({
    title: edit ? 'Editează investiția' : 'Investiție nouă', edit,
    body: `${fInput('Nume', 'name', i?.name, 'placeholder="ex. ETF S&P 500" maxlength="40"')}
      <div class="field"><span class="label">Valută</span>${segHTML('curSeg', INV_CURRENCIES)}</div>
      ${fSelect('Tip', 'kind', INV_TYPES, i?.type)}
      ${row2(fMoney('Sumă investită', 'invested', i?.invested), fMoney('Valoare actuală', 'current', i?.current))}
      <p class="info" id="invInfo"></p>
      ${edit && i.updatedAt ? `<p class="hint">Valoare actualizată pe ${fmtDate(i.updatedAt)}</p>` : ''}`,
    onMount: (f, el) => {
      const labels = ['invested', 'current'].map(n => f.elements[n].closest('.field').querySelector('.label'));
      const upd = () => {
        labels[0].textContent = `Sumă investită (${cur})`;
        labels[1].textContent = `Valoare actuală (${cur})`;
        const v = parseAmount(val(f, 'current')) || parseAmount(val(f, 'invested')) || 0;
        $('#invInfo', el).textContent = cur === S.settings.currency
          ? `Sumele sunt în ${cur}.`
          : `${rateLabel(cur)}${v ? ` · ${money(v, 2, cur)} ≈ ${money(toBase(v, cur), 0)}` : ''}`;
      };
      wireSeg(el, 'curSeg', cur, v => { cur = v; upd(); });
      f.addEventListener('input', upd);
      upd();
      if (!edit) focusSoon(f.elements.name);
    },
    onSubmit: f => {
      const name = val(f, 'name');
      const invested = parseAmount(val(f, 'invested'));
      if (!name) return fail('Introdu un nume');
      if (!(invested >= 0)) return fail('Introdu suma investită');
      const current = val(f, 'current') === '' ? invested : parseAmount(val(f, 'current'));
      if (!(current >= 0)) return fail('Introdu valoarea actuală');
      ui.lastInvCur = cur;
      const data = { name, type: val(f, 'kind'), currency: cur, invested, current, updatedAt: todayISO() };
      if (edit) Object.assign(i, data); else S.investments.push({ id: uid(), ...data });
    },
    onDelete: () => {
      S.investments = S.investments.filter(x => x.id !== i.id);
    },
  });
}

function loanForm(l) {
  const edit = !!l;
  formSheet({
    title: edit ? 'Editează creditul' : 'Credit nou', edit,
    body: `${row2(fInput('Nume', 'name', l?.name, 'placeholder="ex. Credit auto" maxlength="40"'), fInput('Creditor', 'lender', l?.lender, 'placeholder="ex. Banca" maxlength="40"'))}
      ${row2(fMoney('Suma împrumutată', 'principal', l?.principal), fMoney('Sold rămas', 'remaining', l?.remaining))}
      ${row2(fInput('Dobândă anuală (%)', 'rate', l?.rate, 'inputmode="decimal" placeholder="0"'), fMoney('Rată lunară', 'monthly', l?.monthly))}
      ${fInput('Ziua plății (1–31)', 'dueDay', l?.dueDay, 'inputmode="numeric" placeholder="ex. 15"')}`,
    onMount: f => { if (!edit) focusSoon(f.elements.name); },
    onSubmit: f => {
      const name = val(f, 'name');
      const principal = parseAmount(val(f, 'principal'));
      const remaining = val(f, 'remaining') === '' ? principal : parseAmount(val(f, 'remaining'));
      const rate = val(f, 'rate') === '' ? 0 : parseAmount(val(f, 'rate'));
      const monthly = parseAmount(val(f, 'monthly'));
      const dueDay = parseInt(val(f, 'dueDay') || '1', 10);
      if (!name) return fail('Introdu un nume');
      if (!(principal > 0)) return fail('Introdu suma împrumutată');
      if (!(remaining >= 0)) return fail('Sold rămas invalid');
      if (!(rate >= 0)) return fail('Dobândă invalidă');
      if (!(monthly > 0)) return fail('Introdu rata lunară');
      if (!(dueDay >= 1 && dueDay <= 31)) return fail('Ziua plății: 1–31');
      const data = { name, lender: val(f, 'lender'), principal, remaining, rate, monthly, dueDay };
      if (edit) Object.assign(l, data); else S.loans.push({ id: uid(), ...data });
    },
    onDelete: () => {
      S.loans = S.loans.filter(x => x.id !== l.id);
    },
  });
}

/* Plata ratei: creează o cheltuială „Credite” și scade soldul cu partea de principal */
function payLoanForm(l) {
  const interest = round2((l.remaining * l.rate) / 1200);
  const split = a => ({ i: Math.min(a, interest), p: Math.max(0, Math.min(l.remaining, a - interest)) });
  formSheet({
    title: `Rată · ${l.name}`, submitLabel: 'Plătește',
    body: `${fAmount(Math.min(l.monthly, round2(l.remaining + interest)))}
      ${row2(fSelect('Din contul', 'accountId', accOpts(a => a.currency === S.settings.currency)), fDate('Data', 'date', todayISO()))}
      <p class="info" id="split"></p>`,
    onMount: (f, el) => {
      const upd = () => {
        const { i, p } = split(parseAmount(val(f, 'amount')) || 0);
        $('#split', el).textContent = `Dobândă estimată ${money(i)} · scade creditul cu ${money(p)}`;
      };
      upd();
      f.elements.amount.oninput = upd;
    },
    onSubmit: f => {
      const amount = parseAmount(val(f, 'amount'));
      if (!(amount > 0)) return fail('Introdu o sumă validă');
      if (!val(f, 'accountId')) return fail(`Ai nevoie de un cont în ${S.settings.currency}`);
      const date = val(f, 'date') || todayISO();
      l.remaining = round2(l.remaining - split(amount).p);
      l.lastPaid = monthOf(date);
      S.transactions.push({
        id: uid(), createdAt: Date.now(), type: 'expense', amount, categoryId: ensureCategory('Credite', 'expense'),
        accountId: val(f, 'accountId'), date, note: `Rată ${l.name}`, loanId: l.id,
      });
      return l.remaining <= 0 ? 'Credit achitat complet' : 'Rată înregistrată';
    },
  });
}

function debtForm(d) {
  const edit = !!d;
  let dir = d?.direction || 'owe';
  formSheet({
    title: edit ? 'Editează datoria' : 'Datorie nouă', edit,
    body: `${segHTML('dirSeg', { owe: 'Datorez eu', owed: 'Mi se datorează' })}
      ${fInput('Persoană', 'person', d?.person, 'placeholder="ex. Andrei" maxlength="40"')}
      ${row2(fMoney('Sumă totală', 'amount', d?.amount), fDate('Termen (opțional)', 'dueDate', d?.dueDate))}
      ${edit ? fMoney('Achitat până acum', 'paid', d.paid) : ''}
      ${fInput('Notă', 'note', d?.note, 'placeholder="Opțional" maxlength="80"')}`,
    onMount: (f, el) => {
      wireSeg(el, 'dirSeg', dir, v => { dir = v; });
      if (!edit) focusSoon(f.elements.person);
    },
    onSubmit: f => {
      const person = val(f, 'person');
      const amount = parseAmount(val(f, 'amount'));
      if (!person) return fail('Introdu persoana');
      if (!(amount > 0)) return fail('Introdu o sumă validă');
      const data = { direction: dir, person, amount, dueDate: val(f, 'dueDate') || null, note: val(f, 'note') };
      if (edit) {
        data.paid = Math.min(amount, Math.max(0, parseAmount(val(f, 'paid') || '0') || 0));
        Object.assign(d, data);
      } else S.debts.push({ id: uid(), paid: 0, payments: [], ...data });
    },
    onDelete: () => {
      S.debts = S.debts.filter(x => x.id !== d.id);
    },
  });
}

function payDebtForm(d) {
  const left = debtLeft(d);
  formSheet({
    title: d.direction === 'owe' ? `Plată către ${d.person}` : `Primit de la ${d.person}`, submitLabel: 'Înregistrează',
    body: `${fAmount(left)}${fDate('Data', 'date', todayISO())}<p class="info">Rămas de ${d.direction === 'owe' ? 'plătit' : 'primit'}: ${money(left)}</p>`,
    onMount: f => focusSoon(f.elements.amount),
    onSubmit: f => {
      const amount = parseAmount(val(f, 'amount'));
      if (!(amount > 0)) return fail('Introdu o sumă validă');
      const x = Math.min(amount, left);
      d.paid = round2(d.paid + x);
      (d.payments ||= []).push({ date: val(f, 'date') || todayISO(), amount: x });
      return debtLeft(d) <= 0 ? 'Achitat complet' : 'Plată înregistrată';
    },
  });
}

function accountForm(a, presetType) {
  const edit = !!a;
  let color = a?.color || 'black';
  const curOpts = Object.fromEntries(CURRENCIES.map(c => [c, c]));
  formSheet({
    title: edit ? 'Editează contul' : (presetType === 'card' ? 'Card nou' : 'Cont nou'), edit,
    body: `<div class="acc-preview" id="accPreview"></div>
      ${fInput('Nume', 'name', a?.name, 'placeholder="ex. Card MAIB" maxlength="40"')}
      ${row2(fSelect('Tip', 'kind', ACC_TYPES, a?.type || presetType || 'cash'), fSelect('Valută', 'currency', curOpts, a?.currency || S.settings.currency))}
      <div id="cardFields" class="form">
        ${row2(fInput('Banca', 'bank', a?.bank, 'placeholder="ex. MAIB" maxlength="12"'), fInput('Ultimele 4 cifre', 'last4', a?.last4, 'inputmode="numeric" maxlength="4" placeholder="opțional"'))}
        <div class="field"><span class="label">Culoare card</span>${segHTML('colorSeg', CARD_COLORS)}</div>
      </div>
      ${fMoney('Sold inițial', 'initial', a?.initial)}`,
    onMount: (f, el) => {
      const draft = () => ({ name: val(f, 'name') || 'Cont nou', type: val(f, 'kind'), bank: val(f, 'bank'), last4: val(f, 'last4'), color, currency: val(f, 'currency') });
      const upd = () => {
        const d = draft();
        $('#cardFields', el).hidden = d.type !== 'card';
        $('#accPreview', el).innerHTML = d.type === 'card'
          ? `<span class="bankcard ${d.color}"><span class="bc-top"><b>${esc(d.bank || d.name)}</b><i class="bc-chip"></i></span><span class="bc-num">•••• ${esc(d.last4 || '••••')}</span><span class="bc-bottom"><span><small>${esc(d.name)}</small><b>${money(parseAmount(val(f, 'initial')) || 0, 2, d.currency)}</b></span><span class="bc-cur">${d.currency}</span></span></span>`
          : '';
      };
      wireSeg(el, 'colorSeg', color, v => { color = v; upd(); });
      f.addEventListener('input', upd); f.addEventListener('change', upd);
      upd();
      if (!edit) focusSoon(f.elements.name);
    },
    onSubmit: f => {
      const name = val(f, 'name');
      if (!name) return fail('Introdu un nume');
      const type = val(f, 'kind');
      const last4 = val(f, 'last4');
      if (type === 'card' && last4 && !/^\d{4}$/.test(last4)) return fail('Ultimele 4 cifre: exact 4 cifre');
      const data = {
        name, type, currency: val(f, 'currency'), initial: parseAmount(val(f, 'initial') || '0') || 0,
        bank: type === 'card' ? val(f, 'bank') : '', last4: type === 'card' ? last4 : '', color: type === 'card' ? color : undefined,
      };
      if (edit) Object.assign(a, data); else S.accounts.push({ id: uid(), ...data });
    },
    onDelete: () => {
      if (S.transactions.some(t => t.accountId === a.id)) return fail('Contul are tranzacții');
      if (S.transfers.some(x => x.fromId === a.id || x.toId === a.id)) return fail('Contul are transferuri');
      S.accounts = S.accounts.filter(x => x.id !== a.id);
    },
  });
}

/* Transfer între conturi; dacă valutele diferă, e schimb valutar (suma primită se calculează din curs, dar se poate corecta) */
function transferForm(x) {
  const edit = !!x;
  if (S.accounts.length < 2) { toast('Ai nevoie de cel puțin 2 conturi'); return; }
  const savings = S.accounts.find(a => a.currency !== S.settings.currency);
  const fromDef = x?.fromId || S.accounts.find(a => a.type === 'card')?.id || S.accounts[0].id;
  const toDef = x?.toId || (savings && savings.id !== fromDef ? savings.id : S.accounts.find(a => a.id !== fromDef).id);
  formSheet({
    title: edit ? 'Editează transferul' : 'Transfer / schimb valutar', edit,
    body: `${row2(fSelect('Din', 'fromId', accOpts(), fromDef), fSelect('În', 'toId', accOpts(), toDef))}
      ${row2(fMoney('Trimiți', 'amount', x?.amount), fMoney('Primești', 'received', x?.received))}
      <p class="info" id="fxInfo"></p>
      ${row2(fDate('Data', 'date', x?.date || todayISO()), fInput('Notă', 'note', x?.note, 'placeholder="Opțional" maxlength="60"'))}`,
    onMount: (f, el) => {
      let manual = edit; // la editare păstrăm suma primită salvată
      const labels = ['amount', 'received'].map(n => f.elements[n].closest('.field').querySelector('.label'));
      const upd = () => {
        const fc = accCur(val(f, 'fromId')), tc = accCur(val(f, 'toId'));
        labels[0].textContent = `Trimiți (${fc})`;
        labels[1].textContent = `Primești (${tc})`;
        const amount = parseAmount(val(f, 'amount')) || 0;
        if (!manual) f.elements.received.value = amount ? numStr(convert(amount, fc, tc)) : '';
        const received = parseAmount(val(f, 'received')) || 0;
        const info = $('#fxInfo', el);
        if (fc === tc) { info.textContent = 'Transfer în aceeași valută.'; return; }
        const foreign = fc === 'MDL' ? tc : fc;
        const used = amount && received ? (fc === 'MDL' ? amount / received : received / amount) : 0;
        info.textContent = `Curs setat: ${rateLabel(foreign)}${used ? ` · curs folosit: 1 ${foreign} = ${fmtNum(used)} MDL` : ''}`;
      };
      f.elements.received.addEventListener('input', () => { manual = f.elements.received.value.trim() !== ''; });
      f.addEventListener('input', upd); f.addEventListener('change', e => { if (e.target.tagName === 'SELECT') manual = false; upd(); });
      upd();
      if (!edit) focusSoon(f.elements.amount);
    },
    onSubmit: f => {
      const fromId = val(f, 'fromId'), toId = val(f, 'toId');
      const amount = parseAmount(val(f, 'amount'));
      const received = parseAmount(val(f, 'received'));
      if (fromId === toId) return fail('Alege conturi diferite');
      if (!(amount > 0)) return fail('Introdu suma trimisă');
      if (!(received > 0)) return fail('Introdu suma primită');
      const data = { fromId, toId, amount, received, date: val(f, 'date') || todayISO(), note: val(f, 'note') };
      if (edit) Object.assign(x, data); else S.transfers.push({ id: uid(), ...data });
      return accCur(fromId) === accCur(toId) ? 'Transfer salvat' : 'Schimb valutar salvat';
    },
    onDelete: () => {
      S.transfers = S.transfers.filter(t => t.id !== x.id);
    },
  });
}

function ratesForm() {
  const foreign = CURRENCIES.filter(c => c !== 'MDL');
  formSheet({
    title: 'Curs valutar', edit: true, submitLabel: 'Salvează',
    body: `<p class="info">Câți lei (MDL) face 1 unitate. Îl poți lua de pe site-ul băncii sau BNM.</p>
      ${foreign.map(c => fInput(`1 ${c} = … MDL`, `rate_${c}`, numStr(rate(c)), 'inputmode="decimal" autocomplete="off"')).join('')}`,
    onSubmit: f => {
      const next = { MDL: 1 };
      for (const c of foreign) {
        const r = parseAmount(val(f, `rate_${c}`));
        if (!(r > 0)) return fail(`Curs invalid pentru ${c}`);
        next[c] = r;
      }
      S.settings.rates = next;
      return 'Curs actualizat';
    },
  });
}

function categoryForm(c) {
  const edit = !!c;
  let type = c?.type || 'expense';
  formSheet({
    title: edit ? 'Editează categoria' : 'Categorie nouă', edit,
    body: `${segHTML('typeSeg', TX_TYPES)}${fInput('Nume', 'name', c?.name, 'placeholder="ex. Sport" maxlength="30"')}`,
    onMount: (f, el) => { wireSeg(el, 'typeSeg', type, v => { type = v; }); if (!edit) focusSoon(f.elements.name); },
    onSubmit: f => {
      const name = val(f, 'name');
      if (!name) return fail('Introdu un nume');
      if (edit) Object.assign(c, { name, type }); else S.categories.push({ id: uid(), name, type });
    },
    onDelete: () => {
      if (S.transactions.some(t => t.categoryId === c.id)) return fail('Categoria are tranzacții');
      S.categories = S.categories.filter(x => x.id !== c.id);
      S.budgets = S.budgets.filter(b => b.categoryId !== c.id);
    },
  });
}

/* ---------- Date: export / import ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `buget-${todayISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!Array.isArray(data.transactions) || !Array.isArray(data.accounts) || !Array.isArray(data.categories)) throw new Error();
      S = migrate({ ...defaultState(), ...data });
      commit('Importat');
    } catch (e) { toast('Fișier invalid'); }
  };
  r.readAsText(file);
}

/* ---------- 6. Randare + evenimente ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function route() {
  const r = location.hash.slice(1);
  return VIEWS[r] ? r : 'home';
}
/* Animații: elementele urcă pe rând, cifrele mari „numără” până la valoare */
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function stagger(root) {
  let i = 0;
  root.querySelectorAll('.notice, .hero, .tile, .kpi, .toolbar, .summary-line, .action-row, .section, .wallet .bankcard, .day, .add-under, #view > .list > .row')
    .forEach(el => { el.classList.add('rise'); el.style.animationDelay = `${Math.min(i++ * 45, 500)}ms`; });
}
const NUMFMT = {};
function countUp(root) {
  if (reducedMotion()) return;
  root.querySelectorAll('.hero-big, .tile b, .kpi b, .hero-split b').forEach(el => {
    const text = el.textContent;
    const m = text.match(/\d[\d.]*(?:,\d+)?/);
    if (!m) return;
    const dec = (m[0].split(',')[1] || '').length;
    const target = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
    if (!target) return;
    const fmt = NUMFMT[dec] ||= new Intl.NumberFormat('ro-RO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const pre = text.slice(0, m.index), post = text.slice(m.index + m[0].length);
    const t0 = performance.now(), dur = 900;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = p < 1 ? pre + fmt.format(target * (1 - Math.pow(1 - p, 3))) + post : text;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

function render(animate = false) {
  const r = route();
  const tabRoute = NAV.some(n => n.id === r && n.tab) ? r : 'more';
  $('#title').textContent = (NAV.find(n => n.id === r) || MORE).label;
  $('#monthLabel').textContent = monthLabel(ui.month);
  $('#monthSwitch').hidden = !MONTH_ROUTES.includes(r);
  document.querySelectorAll('[data-nav]').forEach(a => {
    const on = a.dataset.nav === (a.classList.contains('tab') ? tabRoute : r);
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const v = $('#view');
  v.innerHTML = VIEWS[r]();
  v.classList.remove('enter');
  if (animate) {
    replay(v, 'enter');
    replay($('#title'), 'anim');
    stagger(v);
    countUp(v);
  }
}
function commit(msg) { save(); render(); if (msg) toast(msg); }

const ACTIONS = {
  add: () => txForm(),
  'edit-tx': id => txForm(byId(S.transactions, id)),
  prev: () => { ui.month = shiftMonth(ui.month, -1); render(true); },
  next: () => { ui.month = shiftMonth(ui.month, 1); render(true); },
  filter: (id, el) => { ui.filter = el.dataset.filter; render(); },
  go: (id, el) => {
    ui.filter = el.dataset.filter || 'all';
    if (location.hash === '#' + el.dataset.route) render(true); else location.hash = el.dataset.route;
  },
  'add-budget': () => budgetForm(),
  'edit-budget': id => budgetForm(byId(S.budgets, id)),
  'add-invest': () => investForm(),
  'edit-invest': id => investForm(byId(S.investments, id)),
  'add-loan': () => loanForm(),
  'edit-loan': id => loanForm(byId(S.loans, id)),
  'pay-loan': id => payLoanForm(byId(S.loans, id)),
  'add-debt': () => debtForm(),
  'edit-debt': id => debtForm(byId(S.debts, id)),
  'pay-debt': id => payDebtForm(byId(S.debts, id)),
  'add-account': () => accountForm(),
  'add-card': () => accountForm(null, 'card'),
  'edit-account': id => accountForm(byId(S.accounts, id)),
  'add-transfer': () => transferForm(),
  'edit-transfer': id => transferForm(byId(S.transfers, id)),
  'edit-rates': () => ratesForm(),
  'add-category': () => categoryForm(),
  'edit-category': id => categoryForm(byId(S.categories, id)),
  'close-sheet': () => closeSheet(),
  export: () => exportData(),
  'clear-demo': (id, el) => {
    if (!armed(el, 'Apasă din nou ca să ștergi datele demo')) return;
    ['transactions', 'transfers', 'budgets', 'investments', 'loans', 'debts'].forEach(k => { S[k] = S[k].filter(x => !x.demo); });
    S.accounts.forEach(a => { a.initial = 0; a.last4 = ''; });
    S.settings.demo = false;
    commit('Date demo șterse');
  },
  'load-demo': (id, el) => {
    if (!armed(el, 'Apasă din nou: înlocuiește datele cu demo')) return;
    S = freshDemo();
    commit('Date demo încărcate');
  },
  reset: (id, el) => {
    if (!armed(el, 'Apasă din nou: se șterge tot, definitiv')) return;
    S = defaultState();
    commit('Resetat');
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (el && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el.dataset.id, el);
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { ui.query = e.target.value; $('#txList').innerHTML = txListHTML(); }
  /* Convertor EUR ⇄ MDL */
  if (e.target.id === 'convEUR') {
    ui.convEUR = parseAmount(e.target.value) || 0;
    $('#convMDL').value = numStr(convert(ui.convEUR, 'EUR', 'MDL'));
  }
  if (e.target.id === 'convMDL') {
    ui.convEUR = round2(convert(parseAmount(e.target.value) || 0, 'MDL', 'EUR'));
    $('#convEUR').value = numStr(ui.convEUR);
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'currency') { S.settings.currency = e.target.value; commit(); }
  if (e.target.id === 'importFile') { importData(e.target.files[0]); e.target.value = ''; }
});
document.addEventListener('keydown', e => {
  const sheetOpen = !$('#sheet').hidden;
  if (e.key === 'Escape' && sheetOpen) closeSheet();
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '');
  if ((e.key === 'n' || e.key === 'N') && !sheetOpen && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); txForm(); }
});
window.addEventListener('hashchange', () => { closeSheet(); render(true); window.scrollTo(0, 0); });

/* Pornire */
const navLink = (n, cls) => `<a href="#${n.id}" class="${cls}" data-nav="${n.id}">${icon(n.icon)}<span>${n.label}</span></a>`;
$('#sideNav').innerHTML = NAV.map(n => navLink(n, 'side-item')).join('');
$('#tabbar').innerHTML = [...NAV.filter(n => n.tab), MORE].map(n => navLink(n, 'tab')).join('');
save();
render(true);
