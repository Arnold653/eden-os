import React, { useState, useEffect, useMemo } from 'react';
import { Home, Receipt, HandCoins, CreditCard, PiggyBank, Settings as Gear, Plus, Trash2, ChevronLeft, ChevronRight, Check, X, BookOpen, Sparkles, Crown, Compass, Clock, HeartPulse, Gauge, GraduationCap, Users, LayoutGrid, Wallet, Download, Upload, Pencil, Copy, Search, Moon, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { supabase } from './supabaseClient.js';

const LIGHT_THEME = {
  navy: '#0B2F4E', gold: '#C98A2B', goldLight: '#EFDBA8', cream: '#F7F3EA',
  ink: '#1F2421', green: '#2F6B3A', terracotta: '#B5482A', line: '#E5DFCC',
  purple: '#8A6FB0', gray: '#6B7280', fade: '#8C8474',
  heading: '#0B2F4E', bg: '#F7F3EA', surface: '#FFFFFF',
};
const DARK_THEME = {
  navy: '#0B2F4E', gold: '#D9A34E', goldLight: '#EFDBA8', cream: '#1B2430',
  ink: '#E7E4DA', green: '#5FA36C', terracotta: '#D97759', line: '#33404E',
  purple: '#B29AD1', gray: '#9AA3AD', fade: '#9AA0A6',
  heading: '#EAD9AE', bg: '#0B1420', surface: '#141F2E',
};
const C = { ...LIGHT_THEME };
function applyTheme(mode) {
  Object.assign(C, mode === 'dark' ? DARK_THEME : LIGHT_THEME);
}
const FONT_DISPLAY = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";
const FONT_MONO = "ui-monospace, 'SF Mono', 'Cambria Math', monospace";
const PALETTE = [C.gold, C.green, C.navy, C.terracotta, C.purple, C.gray, '#4A6FA5', '#A5674A'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function uid() { return Date.now() + '-' + Math.random().toString(36).slice(2, 8); }

// ---------- Devises ----------
const CURRENCIES = {
  FCFA: { label: 'Franc CFA', symbol: 'FCFA', decimals: 0, position: 'after' },
  EUR: { label: 'Euro', symbol: '€', decimals: 2, position: 'after' },
  USD: { label: 'Dollar US', symbol: '$', decimals: 2, position: 'before' },
};
// Taux indicatifs vers FCFA (peg fixe pour l'EUR, taux de marché approximatif pour l'USD — modifiable dans Paramètres).
const DEFAULT_EXCHANGE_RATES = { FCFA: 1, EUR: 655.957, USD: 575 };
let CURRENT_CURRENCY = 'FCFA';
function setCurrentCurrency(code) { CURRENT_CURRENCY = CURRENCIES[code] ? code : 'FCFA'; }
function fmt(n, code) {
  const cur = CURRENCIES[code || CURRENT_CURRENCY] || CURRENCIES.FCFA;
  const val = (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals });
  return cur.position === 'before' ? `${cur.symbol} ${val}` : `${val} ${cur.symbol}`;
}
// Convertit un montant d'une devise à une autre via le FCFA comme pivot.
function convertAmount(value, fromCode, toCode, rates) {
  const r = rates || DEFAULT_EXCHANGE_RATES;
  const v = Number(value) || 0;
  if (fromCode === toCode) return v;
  const inFcfa = v * (r[fromCode] ?? 1);
  const out = inFcfa / (r[toCode] ?? 1);
  return Math.round(out * 100) / 100;
}
function pct(n) { return ((Number(n) || 0) * 100).toFixed(1) + ' %'; }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function inMonth(dateStr, m, y) { const d = new Date(dateStr); return d.getMonth() === m && d.getFullYear() === y; }
function addMonths(dateStr, n) { const d = new Date(dateStr); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); }
const FRUIT_TAGS = ['Rien', 'Confort', 'Apprentissage', 'Relation', 'Revenu', 'Ministère', 'Santé'];

function defaultSettings() {
  const g = [
    { id: 'g-royaume', name: 'Royaume', color: C.gold },
    { id: 'g-epargne', name: 'Épargne', color: C.green },
    { id: 'g-besoins', name: 'Besoins essentiels', color: C.heading },
    { id: 'g-dettes', name: 'Dettes', color: C.terracotta },
    { id: 'g-desirs', name: 'Désirs', color: C.purple },
    { id: 'g-divers', name: 'Divers', color: C.gray },
  ];
  const cats = [
    ["Fonds d'urgence", 'g-epargne'], ['Épargne long terme', 'g-epargne'], ['Investissement', 'g-epargne'],
    ['Logement / Loyer', 'g-besoins'], ['Électricité & Eau', 'g-besoins'], ['Alimentation', 'g-besoins'],
    ['Transport', 'g-besoins'], ['Santé', 'g-besoins'], ['Éducation / Enfants', 'g-besoins'],
    ['Prévoyance (assurance décès)', 'g-besoins'],
    ['Remboursement dettes', 'g-dettes'],
    ['Loisirs & Sorties', 'g-desirs'], ['Vêtements', 'g-desirs'], ['Abonnements', 'g-desirs'],
    ['Imprévus', 'g-divers'], ['Autres', 'g-divers'],
  ].map(([name, groupId]) => ({ id: uid(), name, groupId, target: null }));
  const donTypes = [
    { id: 'd-dime', name: 'Dîme', isTithe: true },
    { id: 'd-offrande', name: 'Offrande', isTithe: false },
    { id: 'd-semence', name: 'Semence / Mission', isTithe: false },
  ];
  const comptes = [
    { id: uid(), name: 'Compte principal', type: 'banque' },
    { id: uid(), name: 'Épargne', type: 'banque' },
    { id: uid(), name: 'Caisse', type: 'caisse' },
  ];
  const disciplines = [
    { id: uid(), name: 'Prière', unit: 'jours', monthlyTarget: 30, entryType: 'sujets' },
    { id: uid(), name: 'Lecture biblique', unit: 'chapitres', monthlyTarget: 30, entryType: 'notes' },
    { id: uid(), name: 'Jeûne', unit: 'jours', monthlyTarget: 4, entryType: 'compteur' },
    { id: uid(), name: 'Évangélisation', unit: 'personnes', monthlyTarget: 4 },
    { id: uid(), name: 'Service', unit: 'heures', monthlyTarget: 8 },
  ];
  const timeCategories = [
    { id: uid(), name: 'Dieu', color: C.gold, weeklyTarget: 7 },
    { id: uid(), name: 'Famille', color: C.terracotta, weeklyTarget: 14 },
    { id: uid(), name: 'Travail', color: C.heading, weeklyTarget: 40 },
    { id: uid(), name: 'Vision', color: C.purple, weeklyTarget: 5 },
    { id: uid(), name: 'Repos', color: C.green, weeklyTarget: 10 },
  ];
  const healthMetrics = [
    { id: uid(), name: 'Sommeil', unit: 'h/nuit', weeklyTarget: 49 },
    { id: uid(), name: 'Sport', unit: 'h', weeklyTarget: 3 },
    { id: uid(), name: 'Hydratation', unit: 'L', weeklyTarget: 14 },
    { id: uid(), name: 'Énergie', unit: '/10', weeklyTarget: 49 },
  ];
  const growthHabits = [
    { id: uid(), name: 'Lecture personnelle', unit: 'pages', weeklyTarget: 50, entryType: 'compteur' },
    { id: uid(), name: 'Pratique compétence', unit: 'heures', weeklyTarget: 3, entryType: 'compteur' },
  ];
  const relationCategories = [
    { id: uid(), name: 'Famille' }, { id: uid(), name: 'Amis' }, { id: uid(), name: 'Mentors' },
    { id: uid(), name: 'Disciples' }, { id: uid(), name: 'Autre' },
  ];
  return { groups: g, categories: cats, donTypes, comptes, disciplines, timeCategories, healthMetrics, growthHabits, relationCategories, objectifZero: false, disabledCapitals: [], disabledModules: [], currency: 'FCFA', exchangeRates: { ...DEFAULT_EXCHANGE_RATES }, theme: 'system' };
}

// ---------- shared UI ----------
function Card({ children, style }) {
  return <div style={{
    background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14,
    boxShadow: '0 1px 2px rgba(11,47,78,0.04), 0 4px 14px rgba(11,47,78,0.05)',
    ...style,
  }}>{children}</div>;
}
function SectionTitle({ children, sub }) {
  return (
    <div style={{ margin: '4px 0 10px' }}>
      <h2 style={{ fontFamily: FONT_DISPLAY, color: C.heading, fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.2 }}>{children}</h2>
      <div style={{ width: 30, height: 2.5, background: `linear-gradient(90deg, ${C.gold} 0%, transparent 100%)`, borderRadius: 2, margin: '5px 0' }} />
      {sub && <p style={{ fontSize: 11, color: C.fade, margin: 0 }}>{sub}</p>}
    </div>
  );
}
function TextInput(props) {
  return <input {...props} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 10px', fontSize: 14, fontFamily: 'inherit', color: C.ink, background: C.surface, ...(props.style||{}) }} />;
}
function Select(props) {
  return <select {...props} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 10px', fontSize: 14, fontFamily: 'inherit', color: C.ink, background: C.surface, ...(props.style||{}) }} />;
}
function PrimaryButton({ children, onClick, disabled, color, style }) {
  const base = disabled ? C.fade : (color || C.navy);
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%',
      background: disabled ? base : `linear-gradient(155deg, ${base} 0%, ${shade(base, -14)} 100%)`,
      color: '#fff', border: 'none', borderRadius: 10,
      padding: '12px 14px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', letterSpacing: 0.2,
      cursor: disabled ? 'default' : 'pointer',
      boxShadow: disabled ? 'none' : `0 3px 10px ${base}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      ...(style || {}),
    }}>{children}</button>
  );
}
function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + Math.round(2.55 * pct)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + Math.round(2.55 * pct)));
  const b = Math.max(0, Math.min(255, (n & 255) + Math.round(2.55 * pct)));
  return `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}`;
}
function IconBtn({ onClick, children, color }) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', color: color || C.fade, cursor: 'pointer', padding: 4 }}>{children}</button>;
}
function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 13, color: C.fade }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: valueColor || C.ink, fontFamily: FONT_MONO }}>{value}</span>
    </div>
  );
}
function Pill({ children, color }) {
  return <span style={{
    background: color || C.line, color: '#fff', fontSize: 8.5, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
    textTransform: 'uppercase', letterSpacing: 0.6, boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
  }}>{children}</span>;
}
// Anneau de progression circulaire — reprend l'esprit du badge de dîme, réutilisé
// pour les disciplines et habitudes plutôt que des barres plates.
function RingProgress({ value, size = 40, strokeWidth = 4, color, trackColor, label }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value || 0));
  const offset = c * (1 - pct);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke={trackColor || C.line} strokeWidth={strokeWidth} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color || C.gold} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size*0.24, fontWeight: 800, color: color || C.gold, fontFamily: FONT_MONO }}>{label !== undefined ? label : Math.round(pct*100)}</span>
      </div>
    </div>
  );
}
function pickIcon(name) {
  const n = (name||'').toLowerCase();
  if (n.includes('pri')) return Sparkles;
  if (n.includes('lecture') || n.includes('bible') || n.includes('livre')) return BookOpen;
  if (n.includes('jeûne') || n.includes('jeune')) return Moon;
  if (n.includes('évangél') || n.includes('evangel')) return Users;
  if (n.includes('service') || n.includes('don')) return HandCoins;
  if (n.includes('sport') || n.includes('compétence') || n.includes('competence')) return Gauge;
  return GraduationCap;
}
function Watermark({ Icon, size = 90, top = -18, right = -18, opacity = 0.08, color = '#fff' }) {
  return (
    <Icon size={size} color={color} style={{ position: 'absolute', top, right, opacity, pointerEvents: 'none' }} />
  );
}

// ---------- Header ----------
function Header({ monthIdx, year, onPrev, onNext, tauxDime, onOpenSettings, onOpenSearch, showBack, onBack }) {
  return (
    <div style={{
      background: `linear-gradient(160deg, ${C.navy} 0%, #072238 100%)`, color: '#fff', padding: '18px 16px 16px',
      boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {showBack ? (
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, padding: 8, color: '#fff', cursor: 'pointer' }}>
            <ChevronLeft size={17} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onOpenSettings} style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, padding: 8, color: '#fff', cursor: 'pointer' }}>
              <Gear size={17} />
            </button>
            <button onClick={onOpenSearch} style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, padding: 8, color: '#fff', cursor: 'pointer' }}>
              <Search size={17} />
            </button>
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, letterSpacing: 0.3 }}>Eden OS</div>
          <div style={{ fontSize: 10, color: C.goldLight, fontStyle: 'italic', marginTop: 1 }}>Gouverne fidèlement ce que Dieu t'a confié</div>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${C.goldLight} 0%, ${C.gold} 45%, #8a611b 100%)`,
          border: `2px solid rgba(255,255,255,0.5)`, boxShadow: '0 3px 8px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1, color: '#3a2a08', textShadow: '0 1px 0 rgba(255,255,255,0.3)' }}>{(tauxDime*100).toFixed(0)}%</span>
          <span style={{ fontSize: 6.5, color: '#3a2a08', opacity: 0.85 }}>dîme</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 }}>
        <button onClick={onPrev} style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: 4, color: '#fff', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 140, textAlign: 'center' }}>{MONTHS_FR[monthIdx]} {year}</span>
        <button onClick={onNext} style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: 4, color: '#fff', cursor: 'pointer' }}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
function isModuleVisible(settings, modId) {
  const disabledModules = settings.disabledModules || [];
  const disabledCapitals = settings.disabledCapitals || [];
  if (disabledModules.includes(modId)) return false;
  const cap = CAPITALS.find(c => c.modules.some(m => m.id === modId));
  if (cap && disabledCapitals.includes(cap.id)) return false;
  return true;
}

function Dashboard({ revenuMois, donsMois, depensesMois, soldeMois, tauxDime, pieData, last6, comptesSoldes, objectifZero, indice, settings, transactions, debts, timeLogs, healthLogs, disciplineLogs, decisions, objectifs, revues, provisions, lectures, lectureLogs, growthLogs, monthIdx, year }) {
  const [subview, setSubview] = useState('mois');
  // --- Temps : total de la semaine + catégorie la plus en retard ---
  const timeCats = settings.timeCategories || [];
  const timeWeekTotals = timeCats.map(c => ({
    ...c,
    total: timeLogs.filter(l => l.categoryId === c.id && inCurrentWeek(l.date)).reduce((s,l) => s + Number(l.hours||0), 0),
  }));
  const totalHeuresSemaine = timeWeekTotals.reduce((s,c) => s + c.total, 0);
  const catsAvecObjectif = timeWeekTotals.filter(c => c.weeklyTarget > 0);
  const catEnRetard = catsAvecObjectif.length > 0
    ? catsAvecObjectif.reduce((min, c) => (c.total / c.weeklyTarget) < (min.total / min.weeklyTarget) ? c : min)
    : null;

  // --- Disciplines spirituelles : progression moyenne du mois ---
  const now = new Date();
  const disciplines = settings.disciplines || [];
  const discAvecObjectif = disciplines.filter(d => d.monthlyTarget > 0);
  const discProgress = discAvecObjectif.map(d => {
    const total = (disciplineLogs || []).filter(l => l.disciplineId === d.id && inMonth(l.date, now.getMonth(), now.getFullYear())).reduce((s,l) => s + Number(l.value||0), 0);
    return Math.min(1, total / d.monthlyTarget);
  });
  const discMoyenne = discProgress.length > 0 ? discProgress.reduce((s,v) => s+v, 0) / discProgress.length : null;

  // --- Provisions : à jour vs sous-provisionnées, total réservé ---
  const provisionsActives = provisions || [];
  const provisionsAJour = provisionsActives.filter(p => {
    if (p.type === 'projet') return p.reserveCurrent >= p.targetAmount;
    const monthly = p.annualAmount / 12;
    const expected = monthly * (monthIdx + 1);
    return p.reserveCurrent >= expected - 0.5;
  }).length;
  const totalReserve = provisionsActives.reduce((s,p) => s + Number(p.reserveCurrent||0), 0);

  // --- Croissance : pages lues cette semaine + lecture en cours + habitudes ---
  const lectureEnCours = (lectures || []).find(l => l.statut === 'en cours');
  const pagesSemaine = (lectureLogs || []).filter(e => inCurrentWeek(e.date)).reduce((s,e) => s + Number(e.pages||0), 0);
  const growthHabits = settings.growthHabits || [];
  const growthProgress = growthHabits.map(h => {
    const total = (growthLogs || []).filter(l => l.habitId === h.id && inCurrentWeek(l.date)).reduce((s,l) => s + Number(l.value||0), 0);
    return h.weeklyTarget > 0 ? Math.min(1, total / h.weeklyTarget) : 0;
  });
  const growthMoyenne = growthProgress.length > 0 ? growthProgress.reduce((s,v)=>s+v,0)/growthProgress.length : null;

  // ===================== Bilan annuel =====================
  const yearTx = useMemo(() => transactions.filter(t => new Date(t.date).getFullYear() === year), [transactions, year]);
  const revenuAnnuel = useMemo(() => yearTx.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount||0), 0), [yearTx]);
  const donsAnnuel = useMemo(() => yearTx.filter(t => t.type === 'don').reduce((s,t) => s + Number(t.amount||0), 0), [yearTx]);
  const depensesAnnuel = useMemo(() => yearTx.filter(t => t.type === 'depense').reduce((s,t) => s + Number(t.amount||0), 0), [yearTx]);
  const soldeAnnuel = revenuAnnuel - donsAnnuel - depensesAnnuel;
  const titheIdsY = (settings.donTypes || []).filter(d => d.isTithe).map(d => d.id);
  const dimeAnnuelle = useMemo(() => yearTx.filter(t => t.type === 'don' && titheIdsY.includes(t.donTypeId)).reduce((s,t) => s + Number(t.amount||0), 0), [yearTx]);
  const tauxDimeAnnuel = revenuAnnuel > 0 ? dimeAnnuelle / revenuAnnuel : 0;

  const totalInitDettes = (debts || []).reduce((s,d) => s + Number(d.initialBalance||0), 0);
  const totalCurDettes = (debts || []).reduce((s,d) => s + Number(d.currentBalance||0), 0);
  const reductionDettes = totalInitDettes > 0 ? (1 - totalCurDettes / totalInitDettes) : null;

  const provisionsProjets = provisionsActives.filter(p => p.type === 'projet');
  const provisionsProjetsAtteints = provisionsProjets.filter(p => p.reserveCurrent >= p.targetAmount).length;

  const yearDecisions = (decisions || []).filter(d => new Date(d.date).getFullYear() === year);
  const majeuresDuesY = yearDecisions.filter(d => d.majeure && d.dateRelecture && d.dateRelecture <= todayISO());
  const majeuresRelettesY = majeuresDuesY.filter(d => d.statut === 'relue');

  const objectifsActifs = (objectifs || []).filter(o => o.statut !== 'abandonné');
  const objectifsAtteints = (objectifs || []).filter(o => o.statut === 'atteint');
  const revuesAnnee = (revues || []).filter(r => new Date(r.date).getFullYear() === year);
  const quartersFaits = new Set(revuesAnnee.map(r => Math.floor(new Date(r.date).getMonth() / 3))).size;

  const livresTermines = (lectures || []).filter(l => l.statut === 'terminé').length;
  const pagesAnnee = (lectureLogs || []).filter(e => new Date(e.date).getFullYear() === year).reduce((s,e) => s + Number(e.pages||0), 0);

  const indiceTrend = useMemo(() => {
    const arr = [];
    for (let m = 0; m <= monthIdx; m++) {
      const score = computeIndiceForMonth({ settings, transactions, debts, timeLogs, healthLogs, decisions, objectifs, revues, monthIdx: m, year });
      arr.push({ mois: MONTHS_FR[m].slice(0,3), Indice: Math.round(score) });
    }
    return arr;
  }, [settings, transactions, debts, timeLogs, healthLogs, decisions, objectifs, revues, monthIdx, year]);

  const [compareView, setCompareView] = useState('bilan');
  const yearsList = useMemo(() => {
    const ys = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    ys.add(year);
    return Array.from(ys).sort((a,b) => a-b);
  }, [transactions, year]);
  const yearSummaries = useMemo(() => yearsList.map(y => {
    const ytx = transactions.filter(t => new Date(t.date).getFullYear() === y);
    const rev = ytx.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
    const donsY = ytx.filter(t => t.type === 'don').reduce((s,t) => s + Number(t.amount||0), 0);
    const dep = ytx.filter(t => t.type === 'depense').reduce((s,t) => s + Number(t.amount||0), 0);
    const solde = rev - donsY - dep;
    const boundary = y === year ? monthIdx : 11;
    let indiceSum = 0, indiceCount = 0;
    for (let m = 0; m <= boundary; m++) {
      indiceSum += computeIndiceForMonth({ settings, transactions, debts, timeLogs, healthLogs, decisions, objectifs, revues, monthIdx: m, year: y });
      indiceCount++;
    }
    return { year: y, rev, dons: donsY, dep, solde, indiceMoyen: indiceCount > 0 ? indiceSum / indiceCount : 0 };
  }), [yearsList, transactions, settings, debts, timeLogs, healthLogs, decisions, objectifs, revues, monthIdx, year]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['mois','Mois'],['annee','Année']].map(([k,label]) => (
          <button key={k} onClick={() => setSubview(k)} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: subview === k ? C.navy : '#fff', color: subview === k ? '#fff' : C.ink,
          }}>{label}</button>
        ))}
      </div>

      {subview === 'mois' && (
      <>
      <SectionTitle>Finances — Résumé du mois</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Card style={{ background: `linear-gradient(160deg, ${C.navy} 0%, #072238 100%)`, color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
          <Watermark Icon={Wallet} size={56} top={-12} right={-8} opacity={0.14} />
          <div style={{ fontSize: 11, opacity: 0.8 }}>Revenu du mois</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>{fmt(revenuMois)}</div>
        </Card>
        {isModuleVisible(settings, 'royaume') && (
          <Card style={{ background: `linear-gradient(155deg, ${C.gold} 0%, ${shade(C.gold,-18)} 100%)`, color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
            <Watermark Icon={Crown} size={56} top={-12} right={-8} opacity={0.18} />
            <div style={{ fontSize: 11, opacity: 0.9 }}>Dîmes, offrandes & semences</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>{fmt(donsMois)}</div>
          </Card>
        )}
        <Card><div style={{ fontSize: 11, color: C.fade }}>Dépenses</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT_MONO }}>{fmt(depensesMois)}</div></Card>
        <Card style={{ background: soldeMois >= 0 ? '#EAF2EA' : '#F7E8E4' }}>
          <div style={{ fontSize: 11, color: C.fade }}>Solde</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT_MONO, color: soldeMois >= 0 ? C.green : C.terracotta }}>{fmt(soldeMois)}</div>
        </Card>
      </div>

      {objectifZero && (
        <Card style={{ marginBottom: 14, background: C.cream, borderColor: C.gold }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.heading }}>Mode Objectif Zéro actif</div>
          <div style={{ fontSize: 12, color: C.fade, marginTop: 2 }}>
            {soldeMois === 0 ? 'Chaque franc a une destination ce mois-ci.' :
             soldeMois > 0 ? `${fmt(soldeMois)} n'ont pas encore d'affectation.` :
             `Le mois dépasse le revenu de ${fmt(-soldeMois)}.`}
          </div>
        </Card>
      )}

      <SectionTitle>Comptes</SectionTitle>
      <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
        {comptesSoldes.map(c => (
          <Card key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
            <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.heading }}>{fmt(c.balance)}</span>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.heading, marginBottom: 4 }}>Répartition (mois en cours)</div>
        {pieData.length > 0 ? (
          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={68} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.fade, padding: '18px 0', textAlign: 'center' }}>Aucune dépense enregistrée ce mois-ci.</div>
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.heading, marginBottom: 4 }}>Revenus vs dépenses — 6 mois</div>
        <div style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last6}>
              <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
              <YAxis hide />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="Revenus" fill={C.navy} radius={[3,3,0,0]} />
              <Bar dataKey="Dépenses" fill={C.terracotta} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {isModuleVisible(settings, 'royaume') && (
        <Card style={{ marginBottom: 14 }}>
          <Row label="Taux de dîme (mois)" value={pct(tauxDime)} valueColor={tauxDime >= 0.10 ? C.green : C.terracotta} />
          <Row label="Objectif dîme" value="10.0 %" />
        </Card>
      )}

      {isModuleVisible(settings, 'temps') && (
        <>
        <SectionTitle>Temps</SectionTitle>
        <Card style={{ marginBottom: 14 }}>
          <Row label="Heures suivies cette semaine" value={`${totalHeuresSemaine.toFixed(1)} h`} />
          {catEnRetard ? (
            <Row label="Catégorie la plus en retard" value={`${catEnRetard.name} (${catEnRetard.total.toFixed(1)}/${catEnRetard.weeklyTarget} h)`} valueColor={C.terracotta} />
          ) : (
            <div style={{ fontSize: 12, color: C.fade, marginTop: 6 }}>Aucun objectif hebdomadaire défini.</div>
          )}
        </Card>
        </>
      )}

      {isModuleVisible(settings, 'royaume') && (
        <>
        <SectionTitle>Disciplines spirituelles</SectionTitle>
        <Card style={{ marginBottom: 14 }}>
          {discMoyenne !== null ? (
            <>
              <Row label="Progression moyenne du mois" value={pct(discMoyenne)} valueColor={discMoyenne >= 0.7 ? C.green : discMoyenne >= 0.4 ? C.gold : C.terracotta} />
              <div style={{ height: 7, background: C.line, borderRadius: 8, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${discMoyenne*100}%`, background: C.gold }} />
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: C.fade }}>Aucune discipline avec objectif mensuel définie.</div>
          )}
        </Card>
        </>
      )}

      {isModuleVisible(settings, 'provisions') && (
        <>
        <SectionTitle>Provisions</SectionTitle>
        <Card style={{ marginBottom: 14 }}>
          {provisionsActives.length > 0 ? (
            <>
              <Row label="Provisions à jour" value={`${provisionsAJour} / ${provisionsActives.length}`} valueColor={provisionsAJour === provisionsActives.length ? C.green : C.terracotta} />
              <Row label="Total réservé" value={fmt(totalReserve)} />
            </>
          ) : (
            <div style={{ fontSize: 12, color: C.fade }}>Aucune provision créée.</div>
          )}
        </Card>
        </>
      )}

      {isModuleVisible(settings, 'croissance') && (
        <>
        <SectionTitle>Croissance</SectionTitle>
        <Card>
          <Row label="Pages lues cette semaine" value={`${pagesSemaine}`} />
          <Row label="Lecture en cours" value={lectureEnCours ? lectureEnCours.titre : '—'} />
          {growthMoyenne !== null && (
            <Row label="Habitudes — progression moyenne" value={pct(growthMoyenne)} valueColor={growthMoyenne >= 0.7 ? C.green : growthMoyenne >= 0.4 ? C.gold : C.terracotta} />
          )}
        </Card>
        </>
      )}
      </>
      )}

      {subview === 'annee' && (
      <>
      <SectionTitle sub="Score de l'Indice mois par mois, de janvier au mois en cours.">Indice d'Intendance — courbe {year}</SectionTitle>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={indiceTrend}>
              <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="Indice" stroke={C.gold} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 10, color: C.fade, marginTop: 4 }}>Dettes et Vision restent constantes sur la courbe (pas d'historique conservé pour ces dimensions).</div>
      </Card>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['bilan','Bilan annuel'],['comparaison','Comparer les années']].map(([k,label]) => (
          <button key={k} onClick={() => setCompareView(k)} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
            background: compareView === k ? C.navy : '#fff', color: compareView === k ? '#fff' : C.ink,
          }}>{label}</button>
        ))}
      </div>

      {compareView === 'comparaison' && (
        <>
          <SectionTitle sub="Revenus, dépenses et solde par année.">Comparer les années — Finances</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearSummaries.map(y => ({ annee: `${y.year}`, Revenus: y.rev, Dépenses: y.dep, Solde: y.solde }))}>
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Bar dataKey="Revenus" fill={C.navy} radius={[3,3,0,0]} />
                  <Bar dataKey="Dépenses" fill={C.terracotta} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <SectionTitle sub="Score moyen de l'Indice sur l'année (mois écoulés seulement pour l'année en cours).">Comparer les années — Indice d'Intendance</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearSummaries.map(y => ({ annee: `${y.year}`, Indice: Math.round(y.indiceMoyen) }))}>
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="Indice" fill={C.gold} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {yearSummaries.map(y => (
              <Row key={y.year} label={`${y.year}`} value={`Indice ${y.indiceMoyen.toFixed(0)}/100 · Solde ${fmt(y.solde)}`} />
            ))}
          </Card>
          {yearSummaries.length < 2 && (
            <div style={{ fontSize: 11, color: C.fade, marginBottom: 14, textAlign: 'center' }}>Une seule année de données pour l'instant — la comparaison s'enrichira au fil du temps.</div>
          )}
        </>
      )}

      {compareView === 'bilan' && (
      <>
      <SectionTitle>Finances — bilan {year}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Card><div style={{ fontSize: 11, color: C.fade }}>Revenu annuel</div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT_MONO }}>{fmt(revenuAnnuel)}</div></Card>
        {isModuleVisible(settings, 'royaume') && (
          <Card><div style={{ fontSize: 11, color: C.fade }}>Dîmes, offrandes & semences</div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT_MONO }}>{fmt(donsAnnuel)}</div></Card>
        )}
        <Card><div style={{ fontSize: 11, color: C.fade }}>Dépenses</div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT_MONO }}>{fmt(depensesAnnuel)}</div></Card>
        <Card style={{ background: soldeAnnuel >= 0 ? '#EAF2EA' : '#F7E8E4' }}>
          <div style={{ fontSize: 11, color: C.fade }}>Solde annuel</div>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT_MONO, color: soldeAnnuel >= 0 ? C.green : C.terracotta }}>{fmt(soldeAnnuel)}</div>
        </Card>
      </div>
      {isModuleVisible(settings, 'royaume') && (
        <Card style={{ marginBottom: 14 }}>
          <Row label="Taux de dîme (année)" value={pct(tauxDimeAnnuel)} valueColor={tauxDimeAnnuel >= 0.10 ? C.green : C.terracotta} />
        </Card>
      )}

      {isModuleVisible(settings, 'dettes') && (
        <>
        <SectionTitle>Dettes</SectionTitle>
        <Card style={{ marginBottom: 14 }}>
          {reductionDettes !== null ? (
            <>
              <Row label="Réduction depuis l'origine" value={pct(reductionDettes)} valueColor={reductionDettes >= 0 ? C.green : C.terracotta} />
              <Row label="Solde restant" value={fmt(totalCurDettes)} />
            </>
          ) : (
            <div style={{ fontSize: 12, color: C.fade }}>Aucune dette enregistrée.</div>
          )}
        </Card>
        </>
      )}

      {isModuleVisible(settings, 'provisions') && (
        <>
        <SectionTitle>Provisions</SectionTitle>
        <Card style={{ marginBottom: 14 }}>
          <Row label="Provisions à jour" value={`${provisionsAJour} / ${provisionsActives.length}`} valueColor={provisionsActives.length > 0 && provisionsAJour === provisionsActives.length ? C.green : C.terracotta} />
          <Row label="Projets/objectifs atteints" value={`${provisionsProjetsAtteints} / ${provisionsProjets.length}`} />
          <Row label="Total réservé" value={fmt(totalReserve)} />
        </Card>
        </>
      )}

      {isModuleVisible(settings, 'sagesse') && (
        <>
        <SectionTitle>Sagesse</SectionTitle>
        <Card style={{ marginBottom: 14 }}>
          <Row label="Décisions prises cette année" value={`${yearDecisions.length}`} />
          <Row label="Relectures faites (décisions majeures)" value={majeuresDuesY.length > 0 ? `${majeuresRelettesY.length} / ${majeuresDuesY.length}` : '—'} />
        </Card>
        </>
      )}

      {isModuleVisible(settings, 'vision') && (
        <>
        <SectionTitle>Vision</SectionTitle>
        <Card style={{ marginBottom: 14 }}>
          <Row label="Objectifs atteints" value={`${objectifsAtteints.length} / ${objectifsActifs.length}`} />
          <Row label="Revues trimestrielles faites" value={`${quartersFaits} / 4`} />
        </Card>
        </>
      )}

      {isModuleVisible(settings, 'croissance') && (
        <>
        <SectionTitle>Croissance</SectionTitle>
        <Card>
          <Row label="Livres terminés" value={`${livresTermines}`} />
          <Row label="Pages lues cette année" value={`${pagesAnnee}`} />
        </Card>
        </>
      )}
      </>
      )}
      </>
      )}
    </div>
  );
}

// ---------- Dépenses & Revenus (combined, toggle) ----------
function TransactionsTab({ settings, monthTx, addTransaction, updateTransaction, duplicateTransaction, deleteTransaction, groupTotals, debts, saveDebts, provisions, saveProvisions }) {
  const [kind, setKind] = useState('revenu');
  const [categoryId, setCategoryId] = useState(settings.categories[0]?.id || '');
  const [compteId, setCompteId] = useState(settings.comptes[0]?.id || '');
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [doneActions, setDoneActions] = useState({});

  useEffect(() => { if (!settings.categories.find(c => c.id === categoryId)) setCategoryId(settings.categories[0]?.id || ''); }, [settings.categories]);
  useEffect(() => { if (!settings.comptes.find(c => c.id === compteId)) setCompteId(settings.comptes[0]?.id || ''); }, [settings.comptes]);

  const catById = Object.fromEntries(settings.categories.map(c => [c.id, c]));
  const groupById = Object.fromEntries(settings.groups.map(g => [g.id, g]));
  const compteById = Object.fromEntries(settings.comptes.map(c => [c.id, c]));

  function resetForm() { setEditingId(null); setAmount(''); setNote(''); setSource(''); }
  function submit() {
    if (!amount) return;
    if (kind === 'revenu' && !source) return;
    if (kind === 'depense' && !categoryId) return;
    const payload = { type: kind, categoryId: kind === 'depense' ? categoryId : undefined, source: kind === 'revenu' ? source : undefined, compteId, amount: Number(amount), date, note };
    if (editingId) {
      updateTransaction(editingId, payload);
    } else {
      addTransaction(payload);
      if (kind === 'revenu') {
        const montant = Number(amount);
        const dime = Math.round(montant * 0.10 / 5) * 5;
        const epargne = Math.round(montant * 0.10 / 5) * 5;
        const dettesActives = (debts||[]).filter(d => d.currentBalance > 0).sort((a,b) => a.currentBalance - b.currentBalance);
        const detteDue = Math.min(dettesActives.reduce((s,d) => s + d.monthlyPayment, 0), montant - dime - epargne > 0 ? montant - dime - epargne : 0);
        const reste = Math.max(0, montant - dime - epargne - detteDue);
        setSuggestion({ montant, dime, epargne, detteDue, reste, dettePrioritaire: dettesActives[0] || null, provisionCible: (provisions||[])[0] || null });
        setDoneActions({});
      }
    }
    resetForm();
  }
  function enregistrerDime() {
    const tithe = settings.donTypes.find(d => d.isTithe) || settings.donTypes[0];
    if (!tithe) return;
    addTransaction({ type: 'don', donTypeId: tithe.id, beneficiary: '', compteId, amount: suggestion.dime, date: todayISO(), receipt: false });
    setDoneActions({ ...doneActions, dime: true });
  }
  function cotiserProvision() {
    if (!suggestion.provisionCible) return;
    saveProvisions(provisions.map(p => p.id === suggestion.provisionCible.id ? { ...p, reserveCurrent: p.reserveCurrent + suggestion.epargne } : p));
    setDoneActions({ ...doneActions, epargne: true });
  }
  function payerDette() {
    if (!suggestion.dettePrioritaire) return;
    saveDebts(debts.map(d => d.id === suggestion.dettePrioritaire.id ? { ...d, currentBalance: Math.max(0, d.currentBalance - suggestion.detteDue) } : d));
    setDoneActions({ ...doneActions, dette: true });
  }
  function startEdit(t) {
    setEditingId(t.id); setKind(t.type); setCategoryId(t.categoryId || settings.categories[0]?.id || '');
    setCompteId(t.compteId || settings.comptes[0]?.id || ''); setSource(t.source || '');
    setAmount(String(t.amount)); setDate(t.date); setNote(t.note || '');
  }

  const list = monthTx.filter(t => t.type === kind).sort((a,b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['revenu','depense'].map(k => (
          <button key={k} onClick={() => { setKind(k); resetForm(); }} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: kind === k ? C.navy : '#fff', color: kind === k ? '#fff' : C.ink,
          }}>{k === 'depense' ? 'Dépense' : 'Revenu'}</button>
        ))}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          {kind === 'depense' ? (
            <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              {settings.groups.filter(g => g.id !== 'g-royaume').map(g => (
                <optgroup key={g.id} label={g.name}>
                  {settings.categories.filter(c => c.groupId === g.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </Select>
          ) : (
            <TextInput placeholder="Source (ex: Salaire, Ventes Chariow)" value={source} onChange={e => setSource(e.target.value)} />
          )}
          <Select value={compteId} onChange={e => setCompteId(e.target.value)}>
            {settings.comptes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <TextInput type="number" placeholder={`Montant (${CURRENCIES[settings.currency||"FCFA"].symbol})`} value={amount} onChange={e => setAmount(e.target.value)} />
          <TextInput type="date" value={date} onChange={e => setDate(e.target.value)} />
          {kind === 'depense' && <TextInput placeholder="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} />}
          <div style={{ display: 'flex', gap: 8 }}>
            <PrimaryButton onClick={submit} disabled={!amount} style={{ flex: 1 }}>
              {editingId ? <><Pencil size={15}/> Enregistrer les modifications</> : <><Plus size={15}/> Enregistrer</>}
            </PrimaryButton>
            {editingId && <button onClick={resetForm} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>}
          </div>
        </div>
      </Card>

      {suggestion && kind === 'revenu' && (
        <Card style={{ marginBottom: 14, border: `1px solid ${C.gold}`, background: C.cream }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.heading }}>Comment gérer ce revenu de {fmt(suggestion.montant)} ?</span>
            <IconBtn onClick={() => setSuggestion(null)}><X size={15} /></IconBtn>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>Dîme (10%)</div><div style={{ fontSize: 11, color: C.fade }}>{fmt(suggestion.dime)}</div></div>
              {doneActions.dime ? <Pill color={C.green}>Enregistré ✓</Pill> : <button onClick={enregistrerDime} style={{ background: C.gold, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>Provisions / Épargne (10%)</div><div style={{ fontSize: 11, color: C.fade }}>{fmt(suggestion.epargne)}{suggestion.provisionCible ? ` · vers « ${suggestion.provisionCible.name} »` : ''}</div></div>
              {!suggestion.provisionCible ? <span style={{ fontSize: 10, color: C.fade }}>Aucune provision créée</span> : doneActions.epargne ? <Pill color={C.green}>Fait ✓</Pill> : <button onClick={cotiserProvision} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cotiser</button>}
            </div>
            {suggestion.detteDue > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>Dette prioritaire</div><div style={{ fontSize: 11, color: C.fade }}>{fmt(suggestion.detteDue)}{suggestion.dettePrioritaire ? ` · « ${suggestion.dettePrioritaire.name} »` : ''}</div></div>
                {doneActions.dette ? <Pill color={C.green}>Payé ✓</Pill> : <button onClick={payerDette} style={{ background: C.terracotta, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Payer</button>}
              </div>
            )}
            <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, color: C.fade }}>Reste disponible (besoins et désirs)</span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_MONO, color: C.heading }}>{fmt(suggestion.reste)}</span>
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.fade, marginTop: 8, fontStyle: 'italic' }}>Suggestion indicative, fondée sur des principes de gestion fidèle (dîme, provision, désendettement) — à toi d'ajuster selon ta situation.</div>
        </Card>
      )}

      {kind === 'depense' && (
        <>
          <SectionTitle>Par groupe (mois en cours)</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            {settings.groups.filter(g => g.id !== 'g-royaume').map(g => (
              <Row key={g.id} label={g.name} value={fmt(groupTotals[g.id] || 0)} />
            ))}
          </Card>
        </>
      )}

      <SectionTitle>{kind === 'depense' ? 'Détail des dépenses' : 'Revenus du mois'}</SectionTitle>
      {list.length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Rien d'enregistré ce mois.</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {list.map(t => (
          <Card key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{kind === 'depense' ? (catById[t.categoryId]?.name || 'Catégorie supprimée') : t.source}</div>
              <div style={{ fontSize: 11, color: C.fade }}>{t.date} · {compteById[t.compteId]?.name || '—'}{t.note ? ' · ' + t.note : ''}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: kind === 'depense' ? C.terracotta : C.navy }}>{fmt(t.amount)}</span>
              <IconBtn onClick={() => startEdit(t)}><Pencil size={15} /></IconBtn>
              <IconBtn onClick={() => duplicateTransaction(t)}><Copy size={15} /></IconBtn>
              <IconBtn onClick={() => deleteTransaction(t.id)}><Trash2 size={15} /></IconBtn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- Royaume (Dons + Disciplines) ----------
function RoyaumeTab({ settings, transactions, addTransaction, updateTransaction, duplicateTransaction, deleteTransaction, year, disciplineLogs, saveDisciplineLogs, disciplineSubjects, saveDisciplineSubjects }) {
  const [subview, setSubview] = useState('dons');
  const [donTypeId, setDonTypeId] = useState(settings.donTypes[0]?.id || '');
  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [receipt, setReceipt] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { if (!settings.donTypes.find(d => d.id === donTypeId)) setDonTypeId(settings.donTypes[0]?.id || ''); }, [settings.donTypes]);

  const typeById = Object.fromEntries(settings.donTypes.map(d => [d.id, d]));
  const yearDons = transactions.filter(t => t.type === 'don' && new Date(t.date).getFullYear() === year);
  const revenuAnnuel = transactions.filter(t => t.type === 'revenu' && new Date(t.date).getFullYear() === year).reduce((s,t) => s + Number(t.amount||0), 0);
  const totalGeneral = yearDons.reduce((s,t) => s + Number(t.amount||0), 0);

  function resetForm() { setEditingId(null); setAmount(''); setBeneficiary(''); setReceipt(false); }
  function submit() {
    if (!amount || !donTypeId) return;
    const payload = { type: 'don', donTypeId, beneficiary, amount: Number(amount), date, receipt };
    if (editingId) updateTransaction(editingId, payload);
    else addTransaction(payload);
    resetForm();
  }
  function startEdit(t) {
    setEditingId(t.id); setDonTypeId(t.donTypeId); setBeneficiary(t.beneficiary || '');
    setAmount(String(t.amount)); setDate(t.date); setReceipt(!!t.receipt);
  }

  const list = yearDons.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 30);
  const byType = settings.donTypes.map(dt => ({
    ...dt, total: yearDons.filter(t => t.donTypeId === dt.id).reduce((s,t) => s + Number(t.amount||0), 0),
  }));

  // --- disciplines logging ---
  const now = new Date();
  const [logValue, setLogValue] = useState({});
  const [expandedDiscId, setExpandedDiscId] = useState(null);
  function logToday(discId) {
    const val = Number(logValue[discId] || 1);
    if (!val) return;
    saveDisciplineLogs([{ id: uid(), disciplineId: discId, date: todayISO(), value: val }, ...disciplineLogs]);
    setLogValue({ ...logValue, [discId]: '' });
  }
  function monthTotal(discId) {
    return disciplineLogs.filter(l => l.disciplineId === discId && inMonth(l.date, now.getMonth(), now.getFullYear())).reduce((s,l) => s + Number(l.value||0), 0);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['dons','Dons'],['disciplines','Disciplines']].map(([k,label]) => (
          <button key={k} onClick={() => setSubview(k)} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: subview === k ? C.navy : '#fff', color: subview === k ? '#fff' : C.ink,
          }}>{label}</button>
        ))}
      </div>

      {subview === 'dons' && (
        <div>
          <SectionTitle>Ajouter un don</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <Select value={donTypeId} onChange={e => setDonTypeId(e.target.value)}>
                {settings.donTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <TextInput placeholder="Bénéficiaire / église" value={beneficiary} onChange={e => setBeneficiary(e.target.value)} />
              <TextInput type="number" placeholder={`Montant (${CURRENCIES[settings.currency||"FCFA"].symbol})`} value={amount} onChange={e => setAmount(e.target.value)} />
              <TextInput type="date" value={date} onChange={e => setDate(e.target.value)} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={receipt} onChange={e => setReceipt(e.target.checked)} /> Reçu obtenu
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <PrimaryButton onClick={submit} disabled={!amount} style={{ flex: 1 }}>
                  {editingId ? <><Pencil size={15}/> Enregistrer les modifications</> : <><Plus size={15}/> Enregistrer</>}
                </PrimaryButton>
                {editingId && <button onClick={resetForm} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>}
              </div>
            </div>
          </Card>

          <SectionTitle>Récapitulatif {year}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {byType.map(t => (
              <Card key={t.id}><div style={{fontSize:11,color:C.fade}}>{t.name}</div><div style={{fontFamily:FONT_MONO, fontWeight:700}}>{fmt(t.total)}</div></Card>
            ))}
            <Card style={{ background: `linear-gradient(155deg, ${C.gold} 0%, ${shade(C.gold,-18)} 100%)`, border: 'none', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <Watermark Icon={Crown} size={64} top={-14} right={-10} opacity={0.18} />
              <div style={{fontSize:11, opacity:0.9}}>% du revenu annuel</div>
              <div style={{fontFamily:FONT_MONO, fontWeight:700, fontVariantNumeric: 'tabular-nums'}}>{revenuAnnuel > 0 ? pct(totalGeneral/revenuAnnuel) : '—'}</div>
            </Card>
          </div>

          <SectionTitle>Historique</SectionTitle>
          {list.length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Aucun don enregistré cette année.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {list.map(t => (
              <Card key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{typeById[t.donTypeId]?.name || '—'}{t.beneficiary ? ' · ' + t.beneficiary : ''}</div>
                  <div style={{ fontSize: 11, color: C.fade }}>{t.date}{t.receipt ? ' · reçu ✓' : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.gold }}>{fmt(t.amount)}</span>
                  <IconBtn onClick={() => startEdit(t)}><Pencil size={15} /></IconBtn>
                  <IconBtn onClick={() => duplicateTransaction(t)}><Copy size={15} /></IconBtn>
                  <IconBtn onClick={() => deleteTransaction(t.id)}><Trash2 size={15} /></IconBtn>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {subview === 'disciplines' && (
        <div>
          <SectionTitle sub="Indicateurs de régularité aux engagements pris — pas une mesure de maturité spirituelle. Les sujets de prière et les notes de lecture n'entrent jamais dans l'Indice d'Intendance : ils restent un espace de mémoire, pas de performance.">Disciplines du mois</SectionTitle>
          <div style={{ display: 'grid', gap: 10 }}>
            {settings.disciplines.map(d => {
              const entryType = d.entryType || 'compteur';
              const total = monthTotal(d.id);
              const progress = d.monthlyTarget > 0 ? Math.min(1, total / d.monthlyTarget) : 0;
              const isOpen = expandedDiscId === d.id;
              const nEnAttente = disciplineSubjects.filter(s => s.disciplineId === d.id && s.statut === 'attente').length;
              const Icon = pickIcon(d.name);
              return (
                <Card key={d.id}>
                  <div onClick={() => setExpandedDiscId(isOpen ? null : d.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={19} color={C.gold} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{d.name}</div>
                      <div style={{ fontSize: 11.5, color: C.fade }}>{total} / {d.monthlyTarget} {d.unit}{entryType === 'sujets' && nEnAttente > 0 ? ` · ${nEnAttente} sujet(s) en attente` : ''}</div>
                    </div>
                    <RingProgress value={progress} size={38} color={progress >= 1 ? C.green : C.gold} />
                    <ChevronDown size={16} color={C.fade} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
                      {entryType === 'compteur' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <TextInput type="number" placeholder="Valeur du jour" value={logValue[d.id] || ''} onChange={e => setLogValue({ ...logValue, [d.id]: e.target.value })} style={{ flex: 1 }} />
                          <button onClick={() => logToday(d.id)} style={{ background: C.gold, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Ajouter</button>
                        </div>
                      )}
                      {entryType === 'sujets' && (
                        <>
                          <div style={{ fontSize: 10.5, color: C.fade, marginBottom: 4 }}>Jours de prière (régularité)</div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <TextInput type="number" placeholder="Ex : 1" value={logValue[d.id] || ''} onChange={e => setLogValue({ ...logValue, [d.id]: e.target.value })} style={{ flex: 1 }} />
                            <button onClick={() => logToday(d.id)} style={{ background: C.gold, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Ajouter</button>
                          </div>
                          <SujetsManager discipline={d} disciplineSubjects={disciplineSubjects} saveDisciplineSubjects={saveDisciplineSubjects} />
                        </>
                      )}
                      {entryType === 'notes' && (
                        <NotesJournal discipline={d} disciplineLogs={disciplineLogs} saveDisciplineLogs={saveDisciplineLogs} />
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
            {settings.disciplines.length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Aucune discipline définie — ajoute-en dans Paramètres.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Sujets de prière (mode "sujets") ----------
function SujetsManager({ discipline, disciplineSubjects, saveDisciplineSubjects }) {
  const [texte, setTexte] = useState('');
  const [noteDraft, setNoteDraft] = useState({});
  const mine = disciplineSubjects.filter(s => s.disciplineId === discipline.id);
  const enAttente = mine.filter(s => s.statut === 'attente').sort((a,b) => new Date(b.dateCreation) - new Date(a.dateCreation));
  const exauces = mine.filter(s => s.statut === 'exauce').sort((a,b) => new Date(b.dateReponse) - new Date(a.dateReponse));
  const sansReponse = mine.filter(s => s.statut === 'sans_reponse').sort((a,b) => new Date(b.dateReponse) - new Date(a.dateReponse));

  const thisYear = new Date().getFullYear();
  const isThisYear = (s) => s.dateReponse && new Date(s.dateReponse).getFullYear() === thisYear;
  const exaucesAnnee = exauces.filter(isThisYear).length;
  const sansReponseAnnee = sansReponse.filter(isThisYear).length;
  const tauxTotal = (exauces.length + sansReponse.length) > 0 ? exauces.length / (exauces.length + sansReponse.length) : null;
  const tauxAnnee = (exaucesAnnee + sansReponseAnnee) > 0 ? exaucesAnnee / (exaucesAnnee + sansReponseAnnee) : null;

  function addSujet() {
    if (!texte.trim()) return;
    saveDisciplineSubjects([{ id: uid(), disciplineId: discipline.id, texte: texte.trim(), statut: 'attente', dateCreation: todayISO(), dateReponse: null, note: '' }, ...disciplineSubjects]);
    setTexte('');
  }
  function setStatut(id, statut) {
    saveDisciplineSubjects(disciplineSubjects.map(s => s.id === id ? { ...s, statut, dateReponse: todayISO() } : s));
  }
  function reouvrir(id) {
    saveDisciplineSubjects(disciplineSubjects.map(s => s.id === id ? { ...s, statut: 'attente', dateReponse: null } : s));
  }
  function saveNote(id) {
    saveDisciplineSubjects(disciplineSubjects.map(s => s.id === id ? { ...s, note: noteDraft[id] ?? s.note } : s));
  }
  function removeSujet(id) {
    saveDisciplineSubjects(disciplineSubjects.filter(s => s.id !== id));
  }

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <Card style={{ padding: 8 }}>
          <div style={{ fontSize: 10, color: C.fade }}>Taux d'exaucement (cumul)</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.green, fontFamily: FONT_MONO }}>{tauxTotal !== null ? pct(tauxTotal) : '—'}</div>
          <div style={{ fontSize: 10, color: C.fade }}>{exauces.length} exaucé(s) · {sansReponse.length} sans réponse</div>
        </Card>
        <Card style={{ padding: 8 }}>
          <div style={{ fontSize: 10, color: C.fade }}>Taux d'exaucement ({thisYear})</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.green, fontFamily: FONT_MONO }}>{tauxAnnee !== null ? pct(tauxAnnee) : '—'}</div>
          <div style={{ fontSize: 10, color: C.fade }}>{exaucesAnnee} exaucé(s) · {sansReponseAnnee} sans réponse</div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <TextInput placeholder="Nouveau sujet de prière" value={texte} onChange={e => setTexte(e.target.value)} style={{ flex: 1 }} />
        <button onClick={addSujet} disabled={!texte.trim()} style={{ background: C.gold, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: texte.trim() ? 'pointer' : 'default' }}>+ Ajouter</button>
      </div>

      {enAttente.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.heading, marginBottom: 4 }}>En attente ({enAttente.length})</div>
          {enAttente.map(s => (
            <div key={s.id} style={{ padding: '7px 0', borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13 }}>{s.texte}<span style={{ color: C.fade, fontSize: 10 }}> · depuis le {s.dateCreation}</span></div>
                <IconBtn onClick={() => removeSujet(s.id)}><Trash2 size={13} /></IconBtn>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button onClick={() => setStatut(s.id, 'exauce')} style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✓ Exaucé</button>
                <button onClick={() => setStatut(s.id, 'sans_reponse')} style={{ background: C.fade, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Sans réponse</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {exauces.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 4 }}>Exaucés ({exauces.length})</div>
          {exauces.map(s => (
            <div key={s.id} style={{ padding: '7px 0', borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13 }}>{s.texte}<span style={{ color: C.fade, fontSize: 10 }}> · exaucé le {s.dateReponse}</span></div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => reouvrir(s.id)} style={{ background: 'none', border: `1px solid ${C.line}`, borderRadius: 6, padding: '2px 6px', fontSize: 9, cursor: 'pointer', color: C.fade }}>Rouvrir</button>
                  <IconBtn onClick={() => removeSujet(s.id)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              <TextInput placeholder="Témoignage : ce qui a été reçu…" value={noteDraft[s.id] ?? s.note} onChange={e => setNoteDraft({ ...noteDraft, [s.id]: e.target.value })} onBlur={() => saveNote(s.id)} style={{ marginTop: 4, fontSize: 12 }} />
            </div>
          ))}
        </div>
      )}

      {sansReponse.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.fade, marginBottom: 4 }}>Sans réponse ({sansReponse.length})</div>
          {sansReponse.map(s => (
            <div key={s.id} style={{ padding: '7px 0', borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13, color: C.fade }}>{s.texte}<span style={{ fontSize: 10 }}> · clos le {s.dateReponse}</span></div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => reouvrir(s.id)} style={{ background: 'none', border: `1px solid ${C.line}`, borderRadius: 6, padding: '2px 6px', fontSize: 9, cursor: 'pointer', color: C.fade }}>Rouvrir</button>
                  <IconBtn onClick={() => removeSujet(s.id)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Journal à notes (mode "notes") — Lecture biblique, habitudes de croissance ----------
function NotesJournal({ discipline, disciplineLogs, saveDisciplineLogs }) {
  const [val, setVal] = useState('');
  const [note, setNote] = useState('');
  const [showHist, setShowHist] = useState(false);
  const mine = disciplineLogs.filter(l => l.disciplineId === discipline.id).sort((a,b) => new Date(b.date) - new Date(a.date));
  const avecNote = mine.filter(l => l.note);

  function addEntry() {
    if (!val && !note) return;
    saveDisciplineLogs([{ id: uid(), disciplineId: discipline.id, date: todayISO(), value: Number(val || 0), note }, ...disciplineLogs]);
    setVal(''); setNote('');
  }
  function removeEntry(id) {
    saveDisciplineLogs(disciplineLogs.filter(l => l.id !== id));
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <div style={{ maxWidth: 90 }}>
          <div style={{ fontSize: 10, color: C.fade, marginBottom: 3 }}>{discipline.unit}</div>
          <TextInput type="number" placeholder="0" value={val} onChange={e => setVal(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.fade, marginBottom: 3 }}>Note du jour</div>
          <TextInput placeholder="Passage, réflexion…" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <button onClick={addEntry} disabled={!val && !note} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Ajouter</button>
      </div>
      {avecNote.length > 0 && (
        <button onClick={() => setShowHist(!showHist)} style={{ marginTop: 8, background: 'none', border: `1px solid ${C.line}`, color: C.fade, borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
          {showHist ? '▾ Masquer les notes passées' : `▸ Voir les notes passées (${avecNote.length})`}
        </button>
      )}
      {showHist && avecNote.map(l => (
        <div key={l.id} style={{ padding: '7px 0', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: C.fade }}>{l.date}{l.value ? ` · ${l.value} ${discipline.unit}` : ''}</div>
            <div style={{ fontSize: 13 }}>{l.note}</div>
          </div>
          <IconBtn onClick={() => removeEntry(l.id)}><Trash2 size={13} /></IconBtn>
        </div>
      ))}
      {avecNote.length === 0 && <p style={{ fontSize: 11, color: C.fade, marginTop: 6 }}>Aucune note enregistrée pour l'instant.</p>}
    </div>
  );
}

// ---------- Provisions / Lissage ----------
function monthsRemainingUntil(targetDate) {
  const today = new Date();
  const target = new Date(targetDate);
  let months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  if (target.getDate() < today.getDate()) months -= 1;
  return Math.max(1, months);
}

function monthsBetweenDates(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(1, months);
}

function ProvisionsTab({ settings, provisions, saveProvisions, monthIdx, onTrash }) {
  const [type, setType] = useState('recurrent');
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [annualAmount, setAnnualAmount] = useState('');
  const [startMonth, setStartMonth] = useState('1');
  const [dueMonth, setDueMonth] = useState('12');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [startDate, setStartDate] = useState('');

  function resetForm() {
    setEditingId(null); setName(''); setAnnualAmount(''); setStartMonth('1'); setDueMonth('12');
    setTargetAmount(''); setTargetDate(''); setStartDate('');
  }

  function addProvision() {
    if (!name) return;
    if (type === 'recurrent') {
      if (!annualAmount) return;
      if (editingId) {
        saveProvisions(provisions.map(p => p.id === editingId ? { ...p, name, annualAmount: Number(annualAmount), startMonth: Number(startMonth), dueMonth: Number(dueMonth) } : p));
      } else {
        saveProvisions([...provisions, { id: uid(), type: 'recurrent', name, annualAmount: Number(annualAmount), startMonth: Number(startMonth), dueMonth: Number(dueMonth), reserveCurrent: 0, createdAt: todayISO() }]);
      }
    } else {
      if (!targetAmount || !targetDate) return;
      if (editingId) {
        saveProvisions(provisions.map(p => p.id === editingId ? { ...p, name, targetAmount: Number(targetAmount), targetDate, startDate: startDate || undefined } : p));
      } else {
        saveProvisions([...provisions, { id: uid(), type: 'projet', name, targetAmount: Number(targetAmount), targetDate, startDate: startDate || undefined, reserveCurrent: 0, createdAt: todayISO() }]);
      }
    }
    resetForm();
  }
  function startEdit(p) {
    setEditingId(p.id);
    setType(p.type === 'projet' ? 'projet' : 'recurrent');
    setName(p.name);
    if (p.type === 'projet') {
      setTargetAmount(String(p.targetAmount)); setTargetDate(p.targetDate); setStartDate(p.startDate || '');
    } else {
      setAnnualAmount(String(p.annualAmount)); setStartMonth(String(p.startMonth || 1)); setDueMonth(String(p.dueMonth || 12));
    }
  }
  function duplicate(p) {
    saveProvisions([...provisions, { ...p, id: uid(), name: p.name + ' (copie)', reserveCurrent: 0, createdAt: todayISO() }]);
  }
  function cotiser(id, montant) {
    saveProvisions(provisions.map(p => p.id === id ? { ...p, reserveCurrent: p.reserveCurrent + montant } : p));
  }
  function payer(id) {
    saveProvisions(provisions.map(p => p.id === id ? { ...p, reserveCurrent: Math.max(0, p.reserveCurrent - p.annualAmount) } : p));
  }
  function remove(id) {
    const item = provisions.find(p => p.id === id);
    saveProvisions(provisions.filter(p => p.id !== id));
    if (item) onTrash('provision', item);
    if (editingId === id) resetForm();
  }

  const curSymbol = CURRENCIES[settings.currency || 'FCFA'].symbol;

  return (
    <div>
      <SectionTitle sub="Lisse les charges annuelles irrégulières et finance tes projets de vie (mariage, business, maternité...).">Provisions</SectionTitle>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[['recurrent','Charge récurrente'],['projet','Projet / Objectif']].map(([k,label]) => (
            <button key={k} onClick={() => { setType(k); if (!editingId) resetForm(); setType(k); }} style={{
              flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 12, cursor: 'pointer',
              background: type === k ? C.navy : '#fff', color: type === k ? '#fff' : C.ink,
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <TextInput placeholder={type === 'recurrent' ? 'Nom (ex: Assurance véhicule)' : 'Nom (ex: Projet de mariage)'} value={name} onChange={e => setName(e.target.value)} />
          {type === 'recurrent' ? (
            <>
              <TextInput type="number" placeholder={`Montant annuel (${curSymbol})`} value={annualAmount} onChange={e => setAnnualAmount(e.target.value)} />
              <div>
                <div style={{ fontSize: 11, color: C.fade, marginBottom: 4 }}>Mois de début de cotisation (optionnel)</div>
                <Select value={startMonth} onChange={e => setStartMonth(e.target.value)}>
                  {MONTHS_FR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </Select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.fade, marginBottom: 4 }}>Mois d'échéance (quand la charge doit être payée)</div>
                <Select value={dueMonth} onChange={e => setDueMonth(e.target.value)}>
                  {MONTHS_FR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </Select>
              </div>
            </>
          ) : (
            <>
              <TextInput type="number" placeholder={`Montant cible (${curSymbol})`} value={targetAmount} onChange={e => setTargetAmount(e.target.value)} />
              <div>
                <div style={{ fontSize: 11, color: C.fade, marginBottom: 4 }}>Date de début de cotisation (optionnel)</div>
                <TextInput type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.fade, marginBottom: 4 }}>Date de fin (échéance)</div>
                <TextInput type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <PrimaryButton onClick={addProvision} disabled={!name || (type === 'recurrent' ? !annualAmount : (!targetAmount || !targetDate))} style={{ flex: 1 }}>
              {editingId ? <><Pencil size={15}/> Enregistrer les modifications</> : <><Plus size={15}/> Créer la provision</>}
            </PrimaryButton>
            {editingId && <button onClick={resetForm} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>}
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 10 }}>
        {provisions.map(p => {
          if (p.type === 'projet') {
            const remaining = monthsRemainingUntil(p.targetDate);
            const restant = Math.max(0, p.targetAmount - p.reserveCurrent);
            const hasStarted = !p.startDate || new Date(p.startDate) <= new Date();
            const totalMonths = monthsBetweenDates(p.startDate || p.createdAt || todayISO(), p.targetDate);
            const monthlyNeeded = restant / (hasStarted ? Math.max(1, remaining) : totalMonths);
            const progress = p.targetAmount > 0 ? Math.min(1, p.reserveCurrent / p.targetAmount) : 0;
            const atteint = p.reserveCurrent >= p.targetAmount;
            return (
              <Card key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.fade }}>Échéance {p.targetDate} · cible {fmt(p.targetAmount)}{p.startDate && ` · début ${p.startDate}`}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <IconBtn onClick={() => startEdit(p)}><Pencil size={15} /></IconBtn>
                    <IconBtn onClick={() => duplicate(p)}><Copy size={15} /></IconBtn>
                    <IconBtn onClick={() => remove(p.id)}><Trash2 size={15} /></IconBtn>
                  </div>
                </div>
                <div style={{ height: 7, background: C.line, borderRadius: 8, marginTop: 8, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                  <div style={{ height: '100%', width: `${progress*100}%`, background: atteint ? C.green : C.purple }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT_MONO, color: atteint ? C.green : C.navy }}>{fmt(p.reserveCurrent)}</div>
                    {!hasStarted ? (
                      <Pill color={C.fade}>Cotisation à partir du {p.startDate}</Pill>
                    ) : (
                      <Pill color={atteint ? C.green : C.purple}>{atteint ? 'Objectif atteint' : `${fmt(monthlyNeeded)} / mois pour tenir le délai`}</Pill>
                    )}
                  </div>
                  {!atteint && hasStarted && (
                    <button onClick={() => cotiser(p.id, monthlyNeeded)} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Cotiser</button>
                  )}
                </div>
              </Card>
            );
          }
          const dueMonthP = p.dueMonth || 12;
          const startMonthP = Math.min(p.startMonth || 1, dueMonthP);
          const monthsToSave = Math.max(1, dueMonthP - startMonthP + 1);
          const monthly = p.annualAmount / monthsToSave;
          const monthsElapsedForThis = Math.min(Math.max(0, (monthIdx + 1) - (startMonthP - 1)), monthsToSave);
          const expected = monthly * monthsElapsedForThis;
          const cotisationStarted = (monthIdx + 1) >= startMonthP;
          const onTrack = p.reserveCurrent >= expected - 0.5;
          return (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.fade }}>{fmt(monthly)} / mois · du {MONTHS_FR[startMonthP-1]} à {MONTHS_FR[dueMonthP-1]}</div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn onClick={() => startEdit(p)}><Pencil size={15} /></IconBtn>
                  <IconBtn onClick={() => duplicate(p)}><Copy size={15} /></IconBtn>
                  <IconBtn onClick={() => remove(p.id)}><Trash2 size={15} /></IconBtn>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT_MONO, color: onTrack ? C.green : C.terracotta }}>{fmt(p.reserveCurrent)}</div>
                  {!cotisationStarted ? (
                    <Pill color={C.fade}>Cotisation à partir de {MONTHS_FR[startMonthP-1]}</Pill>
                  ) : (
                    <Pill color={onTrack ? C.green : C.terracotta}>{onTrack ? 'À jour' : 'Sous-provisionné'}</Pill>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => cotiser(p.id, monthly)} disabled={!cotisationStarted} style={{ background: cotisationStarted ? C.gold : C.line, color: cotisationStarted ? '#fff' : C.fade, border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: cotisationStarted ? 'pointer' : 'default' }}>+ Cotiser</button>
                  <button onClick={() => payer(p.id)} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Payer facture</button>
                </div>
              </div>
            </Card>
          );
        })}
        {provisions.length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Aucune provision créée pour l'instant.</p>}
      </div>
    </div>
  );
}

// ---------- Dettes ----------
function DettesTab({ settings, debts, saveDebts, onTrash }) {
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [startDate, setStartDate] = useState('');

  function resetForm() {
    setEditingId(null); setName(''); setInitialBalance(''); setCurrentBalance(''); setMonthlyPayment(''); setStartDate('');
  }
  function addDebt() {
    if (!name || !currentBalance || !monthlyPayment) return;
    if (editingId) {
      saveDebts(debts.map(d => d.id === editingId ? {
        ...d, name, initialBalance: Number(initialBalance || currentBalance), currentBalance: Number(currentBalance),
        monthlyPayment: Number(monthlyPayment), startDate: startDate || undefined,
      } : d));
    } else {
      saveDebts([...debts, { id: uid(), name, initialBalance: Number(initialBalance || currentBalance), currentBalance: Number(currentBalance), monthlyPayment: Number(monthlyPayment), startDate: startDate || undefined }]);
    }
    resetForm();
  }
  function startEdit(d) {
    setEditingId(d.id); setName(d.name); setInitialBalance(String(d.initialBalance || ''));
    setCurrentBalance(String(d.currentBalance)); setMonthlyPayment(String(d.monthlyPayment)); setStartDate(d.startDate || '');
  }
  function duplicate(d) {
    saveDebts([...debts, { ...d, id: uid(), name: d.name + ' (copie)' }]);
  }
  function recordPayment(id) {
    saveDebts(debts.map(d => d.id === id ? { ...d, currentBalance: Math.max(0, d.currentBalance - d.monthlyPayment) } : d));
  }
  function removeDebt(id) {
    const item = debts.find(d => d.id === id);
    saveDebts(debts.filter(d => d.id !== id));
    if (item) onTrash('debt', item);
    if (editingId === id) resetForm();
  }

  const sorted = [...debts].sort((a,b) => a.currentBalance - b.currentBalance);
  const totalRestant = debts.reduce((s,d) => s + d.currentBalance, 0);
  const curSymbol = CURRENCIES[settings.currency || 'FCFA'].symbol;

  return (
    <div>
      <SectionTitle>{editingId ? 'Modifier la dette' : 'Ajouter une dette'}</SectionTitle>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <TextInput placeholder="Nom de la dette" value={name} onChange={e => setName(e.target.value)} />
          <TextInput type="number" placeholder="Solde initial (optionnel)" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} />
          <TextInput type="number" placeholder={`Solde actuel (${curSymbol})`} value={currentBalance} onChange={e => setCurrentBalance(e.target.value)} />
          <TextInput type="number" placeholder={`Paiement mensuel (${curSymbol})`} value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} />
          <div>
            <div style={{ fontSize: 11, color: C.fade, marginBottom: 4 }}>Date de début de remboursement (optionnel)</div>
            <TextInput type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <PrimaryButton onClick={addDebt} disabled={!name || !currentBalance || !monthlyPayment} style={{ flex: 1 }}>
              {editingId ? <><Pencil size={15}/> Enregistrer les modifications</> : <><Plus size={15}/> Ajouter</>}
            </PrimaryButton>
            {editingId && <button onClick={resetForm} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>}
          </div>
        </div>
      </Card>
      <Card style={{ marginBottom: 14, background: C.navy, color: '#fff', border: 'none' }}>
        <div style={{ fontSize: 11, opacity: 0.8 }}>Total dettes restantes</div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT_MONO }}>{fmt(totalRestant)}</div>
      </Card>
      <SectionTitle>Stratégie boule de neige</SectionTitle>
      {sorted.length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Aucune dette enregistrée — bonne nouvelle !</p>}
      <div style={{ display: 'grid', gap: 10 }}>
        {sorted.map((d, i) => {
          const monthsLeft = d.monthlyPayment > 0 ? Math.ceil(d.currentBalance / d.monthlyPayment) : null;
          const progress = d.initialBalance > 0 ? 1 - (d.currentBalance / d.initialBalance) : 0;
          const remboursementStarted = !d.startDate || new Date(d.startDate) <= new Date();
          return (
            <Card key={d.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {i === 0 && <Pill color={C.green}>PRIORITÉ 1</Pill>}
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{d.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.fade, marginTop: 2 }}>
                    {fmt(d.monthlyPayment)} / mois{!remboursementStarted ? ` · remboursement à partir du ${d.startDate}` : (monthsLeft !== null ? ` · ${monthsLeft} mois restants` : '')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn onClick={() => startEdit(d)}><Pencil size={15} /></IconBtn>
                  <IconBtn onClick={() => duplicate(d)}><Copy size={15} /></IconBtn>
                  <IconBtn onClick={() => removeDebt(d.id)}><Trash2 size={15} /></IconBtn>
                </div>
              </div>
              <div style={{ height: 7, background: C.line, borderRadius: 8, marginTop: 8, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                <div style={{ height: '100%', width: `${Math.max(0,Math.min(100,progress*100))}%`, background: C.green }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: C.terracotta }}>{fmt(d.currentBalance)}</span>
                <button onClick={() => recordPayment(d.id)} disabled={!remboursementStarted} style={{ background: remboursementStarted ? C.gold : C.line, color: remboursementStarted ? '#fff' : C.fade, border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: remboursementStarted ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12}/> Paiement du mois</button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Sagesse (Décisions + Journal) ----------
function SagesseTab({ decisions, saveDecisions, journal, saveJournal, onTrash }) {
  const [subview, setSubview] = useState('decisions');

  // --- decision form state ---
  const [editingId, setEditingId] = useState(null);
  const [majeure, setMajeure] = useState(false);
  const [objet, setObjet] = useState('');
  const [cout, setCout] = useState('');
  const [note, setNote] = useState('');
  const [pourquoi, setPourquoi] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [risques, setRisques] = useState('');
  const [valeurs, setValeurs] = useState('');
  const [conseillers, setConseillers] = useState('');
  const [tagFruit, setTagFruit] = useState('');

  function resetForm() {
    setEditingId(null); setObjet(''); setCout(''); setNote(''); setPourquoi(''); setAlternatives('');
    setRisques(''); setValeurs(''); setConseillers(''); setMajeure(false); setTagFruit('');
  }
  function addDecision() {
    if (!objet) return;
    if (editingId) {
      saveDecisions(decisions.map(d => d.id === editingId ? {
        ...d, objet, cout: cout ? Number(cout) : null, note, majeure, tagFruit,
        pourquoi: majeure ? pourquoi : '', alternatives: majeure ? alternatives : '',
        risques: majeure ? risques : '', valeurs: majeure ? valeurs : '', conseillers: majeure ? conseillers : '',
      } : d));
      resetForm();
      return;
    }
    const date = todayISO();
    const d = {
      id: uid(), date, objet, cout: cout ? Number(cout) : null, note, majeure, tagFruit,
      pourquoi: majeure ? pourquoi : '', alternatives: majeure ? alternatives : '',
      risques: majeure ? risques : '', valeurs: majeure ? valeurs : '', conseillers: majeure ? conseillers : '',
      dateRelecture: majeure ? addMonths(date, 6) : null, resultat: '', statut: 'ouverte',
    };
    saveDecisions([d, ...decisions]);
    resetForm();
  }
  function startEditDecision(d) {
    setEditingId(d.id); setObjet(d.objet); setCout(d.cout != null ? String(d.cout) : ''); setNote(d.note || '');
    setMajeure(!!d.majeure); setPourquoi(d.pourquoi || ''); setAlternatives(d.alternatives || '');
    setRisques(d.risques || ''); setValeurs(d.valeurs || ''); setConseillers(d.conseillers || ''); setTagFruit(d.tagFruit || '');
  }
  function duplicateDecision(d) {
    const date = todayISO();
    saveDecisions([{ ...d, id: uid(), date, statut: 'ouverte', resultat: '', dateRelecture: d.majeure ? addMonths(date, 6) : null }, ...decisions]);
  }
  function removeDecision(id) {
    const item = decisions.find(d => d.id === id);
    saveDecisions(decisions.filter(d => d.id !== id));
    if (item) onTrash('decision', item);
    if (editingId === id) resetForm();
  }
  function submitRelecture(id, resultat) {
    saveDecisions(decisions.map(d => d.id === id ? { ...d, resultat, statut: 'relue' } : d));
  }

  // --- journal form state ---
  const [texte, setTexte] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  function addJournalEntry() {
    if (!texte) return;
    saveJournal([{ id: uid(), date: todayISO(), texte, tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean) }, ...journal]);
    setTexte(''); setTagsInput('');
  }
  function removeJournalEntry(id) {
    const item = journal.find(j => j.id === id);
    saveJournal(journal.filter(j => j.id !== id));
    if (item) onTrash('journal', item);
  }

  const today = todayISO();
  const dueDecisions = decisions.filter(d => d.majeure && d.statut === 'ouverte' && d.dateRelecture && d.dateRelecture <= today);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['decisions','Décisions'],['journal','Journal']].map(([k,label]) => (
          <button key={k} onClick={() => setSubview(k)} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: subview === k ? C.navy : '#fff', color: subview === k ? '#fff' : C.ink,
          }}>{label}</button>
        ))}
      </div>

      {subview === 'decisions' && (
        <div>
          {dueDecisions.length > 0 && (
            <Card style={{ marginBottom: 14, background: C.cream, borderColor: C.gold }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.heading, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color={C.gold} /> {dueDecisions.length} décision(s) à relire
              </div>
              <div style={{ fontSize: 11, color: C.fade, marginTop: 2 }}>« Qu'a produit cette décision ? » — 6 mois se sont écoulés.</div>
            </Card>
          )}

          <SectionTitle sub="Pourquoi ? Quel coût ? Quel fruit ? Est-ce aligné ?">Nouvelle décision</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <TextInput placeholder="Objet de la décision" value={objet} onChange={e => setObjet(e.target.value)} />
              <TextInput type="number" placeholder="Coût estimé (optionnel)" value={cout} onChange={e => setCout(e.target.value)} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={majeure} onChange={e => setMajeure(e.target.checked)} /> Décision majeure — analyse complète
              </label>
              {!majeure && <TextInput placeholder="Note libre (optionnel)" value={note} onChange={e => setNote(e.target.value)} />}
              {majeure && (
                <>
                  <TextInput placeholder="Pourquoi cette décision ?" value={pourquoi} onChange={e => setPourquoi(e.target.value)} />
                  <TextInput placeholder="Alternatives envisagées" value={alternatives} onChange={e => setAlternatives(e.target.value)} />
                  <TextInput placeholder="Risques" value={risques} onChange={e => setRisques(e.target.value)} />
                  <TextInput placeholder="Valeurs concernées" value={valeurs} onChange={e => setValeurs(e.target.value)} />
                  <TextInput placeholder="Conseillers consultés" value={conseillers} onChange={e => setConseillers(e.target.value)} />
                </>
              )}
              <Select value={tagFruit} onChange={e => setTagFruit(e.target.value)}>
                <option value="">Fruit visé (optionnel)</option>
                {FRUIT_TAGS.map(f => <option key={f} value={f}>{f}</option>)}
              </Select>
              <PrimaryButton onClick={addDecision} disabled={!objet} color={majeure ? C.gold : C.navy}>
                <Plus size={15}/> {editingId ? 'Enregistrer les modifications' : (majeure ? 'Enregistrer (relecture dans 6 mois)' : 'Enregistrer')}
              </PrimaryButton>
              {editingId && <button onClick={resetForm} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler la modification</button>}
            </div>
          </Card>

          <SectionTitle>Registre</SectionTitle>
          {decisions.length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Aucune décision enregistrée.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {decisions.map(d => (
              <DecisionCard key={d.id} d={d} onDelete={() => removeDecision(d.id)} onEdit={() => startEditDecision(d)} onDuplicate={() => duplicateDecision(d)} onRelecture={(r) => submitRelecture(d.id, r)} />
            ))}
          </div>
        </div>
      )}

      {subview === 'journal' && (
        <div>
          <SectionTitle sub="Leçons, erreurs, réflexions — libre, horodaté.">Nouvelle entrée</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <textarea value={texte} onChange={e => setTexte(e.target.value)} placeholder="Qu'as-tu appris aujourd'hui ?" rows={4}
                style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 10px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
              <TextInput placeholder="Tags séparés par des virgules (ex: finances, famille)" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
              <PrimaryButton onClick={addJournalEntry} disabled={!texte}><Plus size={15}/> Ajouter au journal</PrimaryButton>
            </div>
          </Card>
          <SectionTitle>Entrées</SectionTitle>
          {journal.length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Le journal est vide.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {journal.map(j => (
              <Card key={j.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, color: C.fade }}>{j.date}</span>
                  <IconBtn onClick={() => removeJournalEntry(j.id)}><Trash2 size={14} /></IconBtn>
                </div>
                <p style={{ fontSize: 13, margin: '4px 0' }}>{j.texte}</p>
                {j.tags.length > 0 && <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{j.tags.map((t,i) => <Pill key={i} color={C.purple}>{t}</Pill>)}</div>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DecisionCard({ d, onDelete, onEdit, onDuplicate, onRelecture }) {
  const [resultat, setResultat] = useState('');
  const [expanded, setExpanded] = useState(false);
  const due = d.majeure && d.statut === 'ouverte' && d.dateRelecture && d.dateRelecture <= todayISO();
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {d.majeure && <Pill color={C.gold}>MAJEURE</Pill>}
            {d.statut === 'relue' && <Pill color={C.green}>RELUE</Pill>}
            {due && <Pill color={C.terracotta}>À RELIRE</Pill>}
            <span style={{ fontSize: 13, fontWeight: 700 }}>{d.objet}</span>
          </div>
          <div style={{ fontSize: 11, color: C.fade, marginTop: 2 }}>{d.date}{d.cout ? ' · ' + fmt(d.cout) : ''}{d.tagFruit ? ' · fruit visé : ' + d.tagFruit : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconBtn onClick={onEdit}><Pencil size={15} /></IconBtn>
          <IconBtn onClick={onDuplicate}><Copy size={15} /></IconBtn>
          <IconBtn onClick={onDelete}><Trash2 size={15} /></IconBtn>
        </div>
      </div>
      {(d.note || d.pourquoi) && (
        <p style={{ fontSize: 12, color: C.ink, marginTop: 6, cursor: d.majeure ? 'pointer' : 'default' }} onClick={() => d.majeure && setExpanded(!expanded)}>
          {d.note || d.pourquoi}
        </p>
      )}
      {d.majeure && expanded && (
        <div style={{ fontSize: 12, color: C.fade, marginTop: 4, display: 'grid', gap: 3 }}>
          {d.alternatives && <div><b>Alternatives :</b> {d.alternatives}</div>}
          {d.risques && <div><b>Risques :</b> {d.risques}</div>}
          {d.valeurs && <div><b>Valeurs :</b> {d.valeurs}</div>}
          {d.conseillers && <div><b>Conseillers :</b> {d.conseillers}</div>}
        </div>
      )}
      {due && (
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          <TextInput placeholder="Qu'a produit cette décision ?" value={resultat} onChange={e => setResultat(e.target.value)} />
          <PrimaryButton onClick={() => onRelecture(resultat)} disabled={!resultat} color={C.gold}><Check size={14}/> Enregistrer la relecture</PrimaryButton>
        </div>
      )}
      {d.statut === 'relue' && d.resultat && (
        <div style={{ fontSize: 12, marginTop: 6, padding: 8, background: C.cream, borderRadius: 6 }}>
          <b>Résultat :</b> {d.resultat}
        </div>
      )}
    </Card>
  );
}

// ---------- Vision & Plan stratégique ----------
const HORIZONS = [
  { id: '10ans', label: '10 ans' },
  { id: 'annuel', label: 'Annuel' },
  { id: 'trimestriel', label: 'Trimestriel' },
];

function VisionTab({ visionDoc, saveVisionDoc, objectifs, saveObjectifs, revues, saveRevues, onTrash }) {
  const [subview, setSubview] = useState('vision');

  // vision doc editable fields
  const [appel, setAppel] = useState(visionDoc.appel || '');
  const [mission, setMission] = useState(visionDoc.mission || '');
  const [valeurs, setValeurs] = useState(visionDoc.valeurs || '');
  const [heritage, setHeritage] = useState(visionDoc.heritage || '');
  const [editingVision, setEditingVision] = useState(false);

  function saveVision() {
    saveVisionDoc({ appel, mission, valeurs, heritage, lastUpdated: todayISO() });
    setEditingVision(false);
  }

  // objectifs
  const [editingObjId, setEditingObjId] = useState(null);
  const [horizon, setHorizon] = useState('annuel');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [echeance, setEcheance] = useState('');
  const [filterHorizon, setFilterHorizon] = useState('annuel');

  function resetObjForm() { setEditingObjId(null); setTitre(''); setDescription(''); setEcheance(''); }
  function addObjectif() {
    if (!titre) return;
    if (editingObjId) {
      saveObjectifs(objectifs.map(o => o.id === editingObjId ? { ...o, horizon, titre, description, echeance } : o));
    } else {
      saveObjectifs([{ id: uid(), horizon, titre, description, echeance, statut: 'en cours' }, ...objectifs]);
    }
    resetObjForm();
  }
  function startEditObjectif(o) {
    setEditingObjId(o.id); setHorizon(o.horizon); setTitre(o.titre); setDescription(o.description || ''); setEcheance(o.echeance || '');
  }
  function duplicateObjectif(o) {
    saveObjectifs([{ ...o, id: uid(), statut: 'en cours' }, ...objectifs]);
  }
  function cycleStatut(id) {
    const order = ['en cours', 'atteint', 'abandonné'];
    saveObjectifs(objectifs.map(o => o.id === id ? { ...o, statut: order[(order.indexOf(o.statut) + 1) % order.length] } : o));
  }
  function removeObjectif(id) {
    const item = objectifs.find(o => o.id === id);
    saveObjectifs(objectifs.filter(o => o.id !== id));
    if (item) onTrash('objectif', item);
    if (editingObjId === id) resetObjForm();
  }

  // revue trimestrielle
  const [fruits, setFruits] = useState('');
  const [gaspillage, setGaspillage] = useState('');
  const [arreter, setArreter] = useState('');
  const [deleguer, setDeleguer] = useState('');
  const [portes, setPortes] = useState('');
  const [decisionFinale, setDecisionFinale] = useState('');

  function addRevue() {
    if (!decisionFinale) return;
    saveRevues([{ id: uid(), date: todayISO(), fruits, gaspillage, arreter, deleguer, portes, decisionFinale }, ...revues]);
    setFruits(''); setGaspillage(''); setArreter(''); setDeleguer(''); setPortes(''); setDecisionFinale('');
  }

  const statutColor = { 'en cours': C.navy, 'atteint': C.green, 'abandonné': C.fade };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['vision','Vision'],['objectifs','Objectifs'],['revue','Cour du Royaume']].map(([k,label]) => (
          <button key={k} onClick={() => setSubview(k)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 11.5, cursor: 'pointer',
            background: subview === k ? C.navy : '#fff', color: subview === k ? '#fff' : C.ink,
          }}>{label}</button>
        ))}
      </div>

      {subview === 'vision' && (
        <div>
          <SectionTitle sub={visionDoc.lastUpdated ? `Dernière mise à jour : ${visionDoc.lastUpdated}` : "Document vivant, révisé rarement, jamais improvisé."}>
            Vision du Royaume
          </SectionTitle>
          {!editingVision ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <Card><div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 4 }}>APPEL</div><p style={{ fontSize: 13, margin: 0 }}>{visionDoc.appel || '—'}</p></Card>
              <Card><div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 4 }}>MISSION</div><p style={{ fontSize: 13, margin: 0 }}>{visionDoc.mission || '—'}</p></Card>
              <Card><div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 4 }}>VALEURS</div><p style={{ fontSize: 13, margin: 0 }}>{visionDoc.valeurs || '—'}</p></Card>
              <Card><div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 4 }}>HÉRITAGE VISÉ</div><p style={{ fontSize: 13, margin: 0 }}>{visionDoc.heritage || '—'}</p></Card>
              <PrimaryButton onClick={() => setEditingVision(true)} color={C.gold}>Modifier</PrimaryButton>
            </div>
          ) : (
            <Card>
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.fade }}>Appel</label>
                <textarea value={appel} onChange={e => setAppel(e.target.value)} rows={2} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: 8, fontFamily: 'inherit', fontSize: 13 }} />
                <label style={{ fontSize: 11, fontWeight: 700, color: C.fade }}>Mission</label>
                <textarea value={mission} onChange={e => setMission(e.target.value)} rows={2} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: 8, fontFamily: 'inherit', fontSize: 13 }} />
                <label style={{ fontSize: 11, fontWeight: 700, color: C.fade }}>Valeurs</label>
                <textarea value={valeurs} onChange={e => setValeurs(e.target.value)} rows={2} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: 8, fontFamily: 'inherit', fontSize: 13 }} />
                <label style={{ fontSize: 11, fontWeight: 700, color: C.fade }}>Héritage visé</label>
                <textarea value={heritage} onChange={e => setHeritage(e.target.value)} rows={2} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: 8, fontFamily: 'inherit', fontSize: 13 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}><PrimaryButton onClick={saveVision} color={C.green}><Check size={14}/> Enregistrer</PrimaryButton></div>
                  <div style={{ flex: 1 }}><PrimaryButton onClick={() => setEditingVision(false)} color={C.fade}>Annuler</PrimaryButton></div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {subview === 'objectifs' && (
        <div>
          <SectionTitle sub="La vision guide les objectifs, les objectifs guident les actions.">Nouvel objectif</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <Select value={horizon} onChange={e => setHorizon(e.target.value)}>
                {HORIZONS.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
              </Select>
              <TextInput placeholder="Titre de l'objectif" value={titre} onChange={e => setTitre(e.target.value)} />
              <TextInput placeholder="Description (optionnel)" value={description} onChange={e => setDescription(e.target.value)} />
              <TextInput type="date" placeholder="Échéance" value={echeance} onChange={e => setEcheance(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <PrimaryButton onClick={addObjectif} disabled={!titre} style={{ flex: 1 }}>
                  {editingObjId ? <><Pencil size={15}/> Enregistrer les modifications</> : <><Plus size={15}/> Ajouter</>}
                </PrimaryButton>
                {editingObjId && <button onClick={resetObjForm} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>}
              </div>
            </div>
          </Card>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {HORIZONS.map(h => (
              <button key={h.id} onClick={() => setFilterHorizon(h.id)} style={{
                flex: 1, padding: '6px', borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: filterHorizon === h.id ? C.gold : '#fff', color: filterHorizon === h.id ? '#fff' : C.ink,
              }}>{h.label}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {objectifs.filter(o => o.horizon === filterHorizon).map(o => (
              <Card key={o.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{o.titre}</div>
                    {o.description && <div style={{ fontSize: 12, color: C.fade, marginTop: 2 }}>{o.description}</div>}
                    {o.echeance && <div style={{ fontSize: 11, color: C.fade, marginTop: 2 }}>Échéance : {o.echeance}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <IconBtn onClick={() => startEditObjectif(o)}><Pencil size={14} /></IconBtn>
                    <IconBtn onClick={() => duplicateObjectif(o)}><Copy size={14} /></IconBtn>
                    <IconBtn onClick={() => removeObjectif(o.id)}><Trash2 size={14} /></IconBtn>
                  </div>
                </div>
                <button onClick={() => cycleStatut(o.id)} style={{ marginTop: 8, background: statutColor[o.statut], color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {o.statut}
                </button>
              </Card>
            ))}
            {objectifs.filter(o => o.horizon === filterHorizon).length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Aucun objectif à cet horizon.</p>}
          </div>
        </div>
      )}

      {subview === 'revue' && (
        <div>
          <SectionTitle sub="Tous les trois mois : ce qui porte du fruit, ce qui n'en porte pas, ce qu'il faut arrêter ou déléguer.">Cour du Royaume</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Qu'est-ce qui produit le plus de fruit ?</label>
              <TextInput value={fruits} onChange={e => setFruits(e.target.value)} />
              <label style={{ fontSize: 12, fontWeight: 700 }}>Qu'est-ce qui consomme beaucoup sans résultat ?</label>
              <TextInput value={gaspillage} onChange={e => setGaspillage(e.target.value)} />
              <label style={{ fontSize: 12, fontWeight: 700 }}>Quelles activités dois-je arrêter ?</label>
              <TextInput value={arreter} onChange={e => setArreter(e.target.value)} />
              <label style={{ fontSize: 12, fontWeight: 700 }}>Quels projets dois-je déléguer ?</label>
              <TextInput value={deleguer} onChange={e => setDeleguer(e.target.value)} />
              <label style={{ fontSize: 12, fontWeight: 700 }}>Où Dieu semble-t-il ouvrir une porte ?</label>
              <TextInput value={portes} onChange={e => setPortes(e.target.value)} />
              <label style={{ fontSize: 12, fontWeight: 700 }}>Décision officielle de ce trimestre</label>
              <textarea value={decisionFinale} onChange={e => setDecisionFinale(e.target.value)} rows={3} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: 8, fontFamily: 'inherit', fontSize: 13 }} />
              <PrimaryButton onClick={addRevue} disabled={!decisionFinale} color={C.gold}><Check size={15}/> Clôturer la revue</PrimaryButton>
            </div>
          </Card>
          <SectionTitle>Historique des revues</SectionTitle>
          {revues.length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Aucune revue trimestrielle enregistrée.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {revues.map(r => (
              <Card key={r.id}>
                <div style={{ fontSize: 11, color: C.fade }}>{r.date}</div>
                <p style={{ fontSize: 13, margin: '4px 0', fontWeight: 700 }}>{r.decisionFinale}</p>
                {r.fruits && <div style={{ fontSize: 11, color: C.fade }}>Fruit : {r.fruits}</div>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Temps ----------
function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}
function inCurrentWeek(dateStr) {
  const start = new Date(startOfWeek(new Date()));
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const d = new Date(dateStr);
  return d >= start && d < end;
}

function TempsTab({ settings, timeLogs, saveTimeLogs }) {
  const [logValue, setLogValue] = useState({});
  const [note, setNote] = useState({});

  function logTime(catId) {
    const val = Number(logValue[catId] || 0);
    if (!val) return;
    saveTimeLogs([{ id: uid(), categoryId: catId, date: todayISO(), hours: val, note: note[catId] || '' }, ...timeLogs]);
    setLogValue({ ...logValue, [catId]: '' });
    setNote({ ...note, [catId]: '' });
  }
  function weekTotal(catId) {
    return timeLogs.filter(l => l.categoryId === catId && inCurrentWeek(l.date)).reduce((s,l) => s + Number(l.hours||0), 0);
  }

  const pieData = (settings.timeCategories || []).map(c => ({ name: c.name, value: weekTotal(c.id), color: c.color })).filter(d => d.value > 0);
  const totalWeek = pieData.reduce((s,d) => s + d.value, 0);

  return (
    <div>
      <SectionTitle sub="Dieu · Famille · Travail · Vision · Repos — la semaine qui suit la vision.">Cette semaine</SectionTitle>

      {pieData.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.heading, marginBottom: 4 }}>Répartition ({totalWeek.toFixed(1)} h enregistrées)</div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={64} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => v + ' h'} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {(settings.timeCategories || []).map(c => {
          const total = weekTotal(c.id);
          const progress = c.weeklyTarget > 0 ? Math.min(1, total / c.weeklyTarget) : 0;
          return (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: c.color }}>{c.name}</span>
                <span style={{ fontSize: 12, color: C.fade }}>{total.toFixed(1)} / {c.weeklyTarget} h</span>
              </div>
              <div style={{ height: 7, background: C.line, borderRadius: 8, marginTop: 8, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                <div style={{ height: '100%', width: `${progress*100}%`, background: c.color }} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <TextInput type="number" placeholder="Heures aujourd'hui" value={logValue[c.id] || ''} onChange={e => setLogValue({ ...logValue, [c.id]: e.target.value })} style={{ flex: 1 }} />
                <button onClick={() => logTime(c.id)} style={{ background: c.color, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Ajouter</button>
              </div>
            </Card>
          );
        })}
        {(!settings.timeCategories || settings.timeCategories.length === 0) && <p style={{ fontSize: 13, color: C.fade }}>Aucune catégorie de temps définie — ajoute-en dans Paramètres.</p>}
      </div>
    </div>
  );
}

// ---------- Santé ----------
function HealthTab({ settings, healthLogs, saveHealthLogs, poidsLogs, savePoidsLogs }) {
  const [logValue, setLogValue] = useState({});
  const [poidsValue, setPoidsValue] = useState('');

  function logMetric(id) {
    const val = Number(logValue[id] || 0);
    if (!val) return;
    saveHealthLogs([{ id: uid(), metricId: id, date: todayISO(), value: val }, ...healthLogs]);
    setLogValue({ ...logValue, [id]: '' });
  }
  function weekTotal(id) {
    return healthLogs.filter(l => l.metricId === id && inCurrentWeek(l.date)).reduce((s,l) => s + Number(l.value||0), 0);
  }
  function logPoids() {
    if (!poidsValue) return;
    savePoidsLogs([{ id: uid(), date: todayISO(), value: Number(poidsValue) }, ...poidsLogs]);
    setPoidsValue('');
  }
  const poidsChart = [...poidsLogs].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-12).map(p => ({ date: p.date.slice(5), poids: p.value }));

  return (
    <div>
      <SectionTitle sub="Sommeil, sport, hydratation, énergie — le corps confié, lui aussi.">Cette semaine</SectionTitle>
      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        {(settings.healthMetrics || []).map(m => {
          const total = weekTotal(m.id);
          const progress = m.weeklyTarget > 0 ? Math.min(1, total / m.weeklyTarget) : 0;
          return (
            <Card key={m.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</span>
                <span style={{ fontSize: 12, color: C.fade }}>{total.toFixed(1)} / {m.weeklyTarget} {m.unit}</span>
              </div>
              <div style={{ height: 7, background: C.line, borderRadius: 8, marginTop: 8, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                <div style={{ height: '100%', width: `${progress*100}%`, background: C.green }} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <TextInput type="number" placeholder={`Valeur (${m.unit})`} value={logValue[m.id] || ''} onChange={e => setLogValue({ ...logValue, [m.id]: e.target.value })} style={{ flex: 1 }} />
                <button onClick={() => logMetric(m.id)} style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Ajouter</button>
              </div>
            </Card>
          );
        })}
      </div>

      <SectionTitle sub="Le poids se suit en tendance, jamais en objectif chiffré imposé.">Poids</SectionTitle>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <TextInput type="number" placeholder="Poids (kg)" value={poidsValue} onChange={e => setPoidsValue(e.target.value)} style={{ flex: 1 }} />
          <button onClick={logPoids} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Ajouter</button>
        </div>
        {poidsChart.length > 1 && (
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={poidsChart}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip formatter={(v) => v + ' kg'} />
                <Line type="monotone" dataKey="poids" stroke={C.navy} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------- Indice d'Intendance (capstone) ----------
function computeFinances(settings, transactions, debts, year) {
  const yearTx = transactions.filter(t => new Date(t.date).getFullYear() === year);
  const revenuAnnuel = yearTx.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
  if (revenuAnnuel === 0) return null;
  const titheIds = settings.donTypes.filter(d => d.isTithe).map(d => d.id);
  const dimeAnnuelle = yearTx.filter(t => t.type === 'don' && titheIds.includes(t.donTypeId)).reduce((s,t) => s + Number(t.amount||0), 0);
  const ptsDime = Math.min(1, (dimeAnnuelle / revenuAnnuel) / 0.10) * 25;

  const epargneGroupId = settings.groups.find(g => g.name.toLowerCase().includes('épargne') || g.name.toLowerCase().includes('epargne'))?.id;
  const epargneCatIds = settings.categories.filter(c => c.groupId === epargneGroupId).map(c => c.id);
  const epargneAnnuelle = yearTx.filter(t => t.type === 'depense' && epargneCatIds.includes(t.categoryId)).reduce((s,t) => s + Number(t.amount||0), 0);
  const ptsEpargne = Math.min(1, (epargneAnnuelle / revenuAnnuel) / 0.15) * 25;

  let positiveMonths = 0;
  for (let m = 0; m < 12; m++) {
    const mtx = transactions.filter(t => inMonth(t.date, m, year));
    const rev = mtx.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
    const out = mtx.filter(t => t.type !== 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
    if (rev > 0 && rev - out >= 0) positiveMonths++;
    if (rev > 0) {} // month considered only if there is activity
  }
  const activeMonths = Array.from({length:12}, (_,m) => transactions.some(t => inMonth(t.date, m, year))).filter(Boolean).length || 1;
  const ptsSolde = Math.min(1, positiveMonths / activeMonths) * 25;

  const totalInit = debts.reduce((s,d) => s + Number(d.initialBalance||0), 0);
  const totalCur = debts.reduce((s,d) => s + Number(d.currentBalance||0), 0);
  const ptsDettes = totalInit > 0 ? Math.max(0, (1 - totalCur/totalInit)) * 25 : 25;

  return Math.min(100, ptsDime + ptsEpargne + ptsSolde + ptsDettes);
}

function computeDiscipline(settings, transactions, monthIdx, year) {
  const targeted = settings.categories.filter(c => c.target && c.target > 0);
  if (targeted.length === 0) return null;
  const overspends = targeted.map(c => {
    const spent = transactions.filter(t => t.type === 'depense' && t.categoryId === c.id && inMonth(t.date, monthIdx, year)).reduce((s,t) => s + Number(t.amount||0), 0);
    return Math.max(0, (spent - c.target) / c.target);
  });
  const avgOver = overspends.reduce((s,v) => s+v, 0) / overspends.length;
  return Math.max(0, Math.min(100, 100 - avgOver * 100));
}

function computeTemps(settings, timeLogs) {
  if (!settings.timeCategories || settings.timeCategories.length === 0) return null;
  const scores = settings.timeCategories.map(c => {
    const total = timeLogs.filter(l => l.categoryId === c.id && inCurrentWeek(l.date)).reduce((s,l) => s + Number(l.hours||0), 0);
    return c.weeklyTarget > 0 ? Math.min(1, total / c.weeklyTarget) : 0;
  });
  if (scores.every(s => s === 0)) return null;
  return (scores.reduce((s,v) => s+v, 0) / scores.length) * 100;
}

function computeSante(settings, healthLogs) {
  if (!settings.healthMetrics || settings.healthMetrics.length === 0) return null;
  const scores = settings.healthMetrics.map(m => {
    const total = healthLogs.filter(l => l.metricId === m.id && inCurrentWeek(l.date)).reduce((s,l) => s + Number(l.value||0), 0);
    return m.weeklyTarget > 0 ? Math.min(1, total / m.weeklyTarget) : 0;
  });
  if (scores.every(s => s === 0)) return null;
  return (scores.reduce((s,v) => s+v, 0) / scores.length) * 100;
}

function computeSagesse(decisions, monthIdx, year) {
  const monthDecisions = decisions.filter(d => inMonth(d.date, monthIdx, year));
  if (decisions.length === 0) return null;
  const ptsVolume = Math.min(1, monthDecisions.length / 4) * 70;
  const majeuresDues = decisions.filter(d => d.majeure && d.dateRelecture && d.dateRelecture <= todayISO());
  const majeuresRelues = majeuresDues.filter(d => d.statut === 'relue');
  const ptsRelecture = majeuresDues.length > 0 ? (majeuresRelues.length / majeuresDues.length) * 30 : 30;
  return Math.min(100, ptsVolume + ptsRelecture);
}

function computeVision(objectifs, revues) {
  if (objectifs.length === 0) return null;
  const actifs = objectifs.filter(o => o.statut !== 'abandonné');
  const atteints = objectifs.filter(o => o.statut === 'atteint');
  const ptsObjectifs = actifs.length > 0 ? (atteints.length / actifs.length) * 70 : 0;
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const revueThisQuarter = revues.some(r => {
    const d = new Date(r.date);
    return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth()/3) === currentQuarter;
  });
  return Math.min(100, ptsObjectifs + (revueThisQuarter ? 30 : 0));
}

function computeFinancesUpTo(settings, transactions, debts, monthIdx, year) {
  const yearTxToDate = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() <= monthIdx;
  });
  const revenuADate = yearTxToDate.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
  if (revenuADate === 0) return null;
  const titheIds = settings.donTypes.filter(d => d.isTithe).map(d => d.id);
  const dimeADate = yearTxToDate.filter(t => t.type === 'don' && titheIds.includes(t.donTypeId)).reduce((s,t) => s + Number(t.amount||0), 0);
  const ptsDime = Math.min(1, (dimeADate / revenuADate) / 0.10) * 25;

  const epargneGroupId = settings.groups.find(g => g.name.toLowerCase().includes('épargne') || g.name.toLowerCase().includes('epargne'))?.id;
  const epargneCatIds = settings.categories.filter(c => c.groupId === epargneGroupId).map(c => c.id);
  const epargneADate = yearTxToDate.filter(t => t.type === 'depense' && epargneCatIds.includes(t.categoryId)).reduce((s,t) => s + Number(t.amount||0), 0);
  const ptsEpargne = Math.min(1, (epargneADate / revenuADate) / 0.15) * 25;

  let positiveMonths = 0;
  for (let m = 0; m <= monthIdx; m++) {
    const mtx = transactions.filter(t => inMonth(t.date, m, year));
    const rev = mtx.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
    const out = mtx.filter(t => t.type !== 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
    if (rev > 0 && rev - out >= 0) positiveMonths++;
  }
  const activeMonths = Array.from({length: monthIdx+1}, (_,m) => transactions.some(t => inMonth(t.date, m, year))).filter(Boolean).length || 1;
  const ptsSolde = Math.min(1, positiveMonths / activeMonths) * 25;

  // Note: le solde des dettes est une photo actuelle (pas d'historique de dette conservé),
  // donc cette composante reste identique quel que soit le mois choisi.
  const totalInit = debts.reduce((s,d) => s + Number(d.initialBalance||0), 0);
  const totalCur = debts.reduce((s,d) => s + Number(d.currentBalance||0), 0);
  const ptsDettes = totalInit > 0 ? Math.max(0, (1 - totalCur/totalInit)) * 25 : 25;

  return Math.min(100, ptsDime + ptsEpargne + ptsSolde + ptsDettes);
}

function computeTempsForMonth(settings, timeLogs, monthIdx, year) {
  if (!settings.timeCategories || settings.timeCategories.length === 0) return null;
  const scores = settings.timeCategories.map(c => {
    const total = timeLogs.filter(l => l.categoryId === c.id && inMonth(l.date, monthIdx, year)).reduce((s,l) => s + Number(l.hours||0), 0);
    const monthlyTarget = c.weeklyTarget > 0 ? c.weeklyTarget * 4.345 : 0;
    return monthlyTarget > 0 ? Math.min(1, total / monthlyTarget) : 0;
  });
  if (scores.every(s => s === 0)) return null;
  return (scores.reduce((s,v) => s+v, 0) / scores.length) * 100;
}

function computeSanteForMonth(settings, healthLogs, monthIdx, year) {
  if (!settings.healthMetrics || settings.healthMetrics.length === 0) return null;
  const scores = settings.healthMetrics.map(m => {
    const total = healthLogs.filter(l => l.metricId === m.id && inMonth(l.date, monthIdx, year)).reduce((s,l) => s + Number(l.value||0), 0);
    const monthlyTarget = m.weeklyTarget > 0 ? m.weeklyTarget * 4.345 : 0;
    return monthlyTarget > 0 ? Math.min(1, total / monthlyTarget) : 0;
  });
  if (scores.every(s => s === 0)) return null;
  return (scores.reduce((s,v) => s+v, 0) / scores.length) * 100;
}

// Mapping des capitaux/modules vers les dimensions de l'Indice qu'ils gouvernent.
// Utilisé pour retirer une dimension du score (avec redistribution du poids) quand
// le capital est désactivé, ou quand un module qui est seul propriétaire d'une
// dimension est désactivé individuellement.
const CAPITAL_DIMS = {
  financier: ['finances', 'discipline'],
  spirituel: ['sagesse'],
  temporel: ['temps', 'vision'],
  physique: ['sante'],
  intellectuel: [],
  relationnel: [],
};
const MODULE_DIMS = {
  sagesse: ['sagesse'],
  temps: ['temps'],
  vision: ['vision'],
  sante: ['sante'],
};

function getDisabledDims(settings) {
  const disabledCapitals = settings.disabledCapitals || [];
  const disabledModules = settings.disabledModules || [];
  const dims = new Set();
  disabledCapitals.forEach(capId => (CAPITAL_DIMS[capId] || []).forEach(d => dims.add(d)));
  disabledModules.forEach(modId => (MODULE_DIMS[modId] || []).forEach(d => dims.add(d)));
  return dims;
}

// Filtre les dimensions désactivées et redistribue proportionnellement leur poids sur celles qui restent.
function applyDisabledDims(dims, disabledDimsSet) {
  const active = dims.filter(d => !disabledDimsSet.has(d.key));
  const sumWeight = active.reduce((s,d) => s + d.weight, 0);
  return { active, sumWeight };
}

// Score de l'Indice pour un mois donné de l'année sélectionnée — utilisé pour la courbe annuelle.
// Limites connues : Dettes (photo actuelle, pas d'historique) et Vision (statut des objectifs
// et revues = état courant) restent constantes sur la courbe ; les autres dimensions varient réellement.
function computeIndiceForMonth({ settings, transactions, debts, timeLogs, healthLogs, decisions, objectifs, revues, monthIdx, year }) {
  const finances = computeFinancesUpTo(settings, transactions, debts, monthIdx, year);
  const discipline = computeDiscipline(settings, transactions, monthIdx, year);
  const temps = computeTempsForMonth(settings, timeLogs, monthIdx, year);
  const sante = computeSanteForMonth(settings, healthLogs, monthIdx, year);
  const sagesse = computeSagesse(decisions, monthIdx, year);
  const vision = computeVision(objectifs, revues);

  const dims = [
    { key: 'finances', weight: 0.20, score: finances }, { key: 'temps', weight: 0.20, score: temps }, { key: 'discipline', weight: 0.15, score: discipline },
    { key: 'sante', weight: 0.10, score: sante }, { key: 'sagesse', weight: 0.20, score: sagesse }, { key: 'vision', weight: 0.15, score: vision },
  ];
  const { active, sumWeight } = applyDisabledDims(dims, getDisabledDims(settings));
  if (sumWeight <= 0) return 0;
  return active.reduce((s,d) => s + (d.score === null ? 0 : d.score) * (d.weight / sumWeight), 0);
}

function computeIndiceGlobal({ settings, transactions, debts, timeLogs, healthLogs, decisions, objectifs, revues, monthIdx, year, manualScores }) {
  const finances = computeFinances(settings, transactions, debts, year);
  const discipline = computeDiscipline(settings, transactions, monthIdx, year);
  const temps = computeTemps(settings, timeLogs);
  const sante = computeSante(settings, healthLogs);
  const sagesse = computeSagesse(decisions, monthIdx, year);
  const vision = computeVision(objectifs, revues);

  const dims = [
    { key: 'finances', label: 'Finances', weight: 0.20, score: finances },
    { key: 'temps', label: 'Temps', weight: 0.20, score: temps },
    { key: 'discipline', label: 'Discipline budgétaire', weight: 0.15, score: discipline },
    { key: 'sante', label: 'Santé', weight: 0.10, score: sante },
    { key: 'sagesse', label: 'Sagesse', weight: 0.20, score: sagesse },
    { key: 'vision', label: 'Vision', weight: 0.15, score: vision },
  ];

  const disabledDims = getDisabledDims(settings);
  const { active, sumWeight } = applyDisabledDims(dims, disabledDims);

  const total = sumWeight > 0 ? active.reduce((s,d) => {
    const val = d.score === null ? (Number((manualScores || {})[d.key]) || 0) : d.score;
    return s + val * (d.weight / sumWeight);
  }, 0) : 0;

  const niveau = total >= 90 ? '👑 Roi Sage' : total >= 75 ? '👑 Intendant fidèle' : total >= 60 ? '🌱 En croissance' : total >= 40 ? '⚠️ Vigilance requise' : '🔴 Alerte intendance';

  return { total, niveau, dims, disabledDims };
}

function DimScore({ label, weight, score, manualValue, onManualChange, hint }) {
  const isManual = score === null;
  const displayed = isManual ? Number(manualValue) || 0 : score;
  return (
    <Card style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: 10, color: C.fade, marginLeft: 6 }}>({(weight*100).toFixed(0)}%)</span>
        </div>
        {isManual ? (
          <TextInput type="number" placeholder="Saisie manuelle /100" value={manualValue} onChange={e => onManualChange(e.target.value)} style={{ width: 100 }} />
        ) : (
          <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.heading }}>{displayed.toFixed(0)} /100</span>
        )}
      </div>
      {isManual && <div style={{ fontSize: 10, color: C.terracotta, marginTop: 4 }}>Pas assez de données — saisie temporaire{hint ? ` · ${hint}` : ''}</div>}
    </Card>
  );
}

function IndiceIntendanceTab({ settings, transactions, debts, timeLogs, healthLogs, decisions, objectifs, revues, monthIdx, year, manualScores, saveManualScores }) {
  const { total, niveau, dims, disabledDims } = computeIndiceGlobal({ settings, transactions, debts, timeLogs, healthLogs, decisions, objectifs, revues, monthIdx, year, manualScores });
  const activeDims = dims.filter(d => !disabledDims.has(d.key));
  const sumActiveWeight = activeDims.reduce((s,d) => s + d.weight, 0);
  const disabledLabels = dims.filter(d => disabledDims.has(d.key)).map(d => d.label);

  function setManual(key, val) {
    saveManualScores({ ...manualScores, [key]: val });
  }

  return (
    <div>
      <Card style={{ marginBottom: 16, background: `linear-gradient(160deg, ${C.navy} 0%, #072238 100%)`, color: '#fff', border: 'none', textAlign: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
        <Watermark Icon={Crown} size={120} top={-30} right={-24} opacity={0.07} />
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 700, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{total.toFixed(0)}</div>
        <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>sur 100</div>
        <div style={{ background: `linear-gradient(155deg, ${C.gold} 0%, ${shade(C.gold,-18)} 100%)`, display: 'inline-block', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>{niveau}</div>
      </Card>

      <SectionTitle sub="Calculé à partir des données réelles quand elles existent ; saisie manuelle temporaire sinon, toujours indiquée comme telle.">Détail par dimension</SectionTitle>
      {activeDims.map(d => (
        <DimScore key={d.key} label={d.label} weight={sumActiveWeight > 0 ? d.weight / sumActiveWeight : 0} score={d.score} manualValue={manualScores[d.key] || ''} onManualChange={(v) => setManual(d.key, v)}
          hint={d.key === 'discipline' && d.score === null ? "définis un budget mensuel sur au moins une catégorie dans Paramètres > Groupes & Catégories" : undefined} />
      ))}

      {disabledLabels.length > 0 && (
        <Card style={{ marginBottom: 10, background: C.cream }}>
          <p style={{ fontSize: 11, color: C.fade, margin: 0 }}>
            Dimension(s) désactivée(s) dans Paramètres — exclue(s) du score, poids redistribué sur les autres : {disabledLabels.join(', ')}.
          </p>
        </Card>
      )}

      <Card style={{ marginTop: 10, background: C.cream }}>
        <p style={{ fontSize: 11, color: C.fade, margin: 0 }}>
          Le Royaume (dîme, offrandes, disciplines) n'entre pas dans ce score : c'est un indicateur de régularité, jamais une mesure de communion avec Dieu. Consulte-le dans l'onglet Royaume.
        </p>
      </Card>
    </div>
  );
}

// ---------- Croissance ----------
function CroissanceTab({ settings, lectures, saveLectures, lectureLogs, saveLectureLogs, growthLogs, saveGrowthLogs, onTrash }) {
  const [subview, setSubview] = useState('lectures');
  const [titre, setTitre] = useState('');
  const [auteur, setAuteur] = useState('');
  const [totalPagesLivre, setTotalPagesLivre] = useState('');
  const [typeL, setTypeL] = useState('Livre');
  const [logValue, setLogValue] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [expandedHabitId, setExpandedHabitId] = useState(null);
  const [pageValue, setPageValue] = useState({});
  const [noteValue, setNoteValue] = useState({});
  const [editingLectureId, setEditingLectureId] = useState(null);
  const [editTitre, setEditTitre] = useState('');
  const [editAuteur, setEditAuteur] = useState('');
  const [editPages, setEditPages] = useState('');
  const [editType, setEditType] = useState('Livre');

  function addLecture() {
    if (!titre) return;
    saveLectures([{ id: uid(), titre, auteur: auteur || undefined, totalPages: totalPagesLivre ? Number(totalPagesLivre) : undefined, type: typeL, statut: 'à lire', dateAjout: todayISO() }, ...lectures]);
    setTitre(''); setAuteur(''); setTotalPagesLivre('');
  }
  function cycleStatut(id) {
    const order = ['à lire', 'en cours', 'terminé'];
    saveLectures(lectures.map(l => l.id === id ? { ...l, statut: order[(order.indexOf(l.statut) + 1) % order.length] } : l));
  }
  function removeLecture(id) {
    const item = lectures.find(l => l.id === id);
    saveLectures(lectures.filter(l => l.id !== id));
    if (item) onTrash('lecture', item);
  }
  function startEditLecture(l) {
    setEditingLectureId(l.id); setEditTitre(l.titre); setEditAuteur(l.auteur || ''); setEditPages(l.totalPages ? String(l.totalPages) : ''); setEditType(l.type);
  }
  function saveEditLecture() {
    saveLectures(lectures.map(l => l.id === editingLectureId ? { ...l, titre: editTitre, auteur: editAuteur || undefined, totalPages: editPages ? Number(editPages) : undefined, type: editType } : l));
    setEditingLectureId(null);
  }
  function duplicateLecture(l) {
    saveLectures([{ ...l, id: uid(), titre: l.titre + ' (copie)', statut: 'à lire', dateAjout: todayISO() }, ...lectures]);
  }

  function logLecture(id) {
    const pages = Number(pageValue[id] || 0);
    const note = (noteValue[id] || '').trim();
    if (!pages && !note) return;
    saveLectureLogs([{ id: uid(), lectureId: id, date: todayISO(), pages, note }, ...(lectureLogs || [])]);
    setPageValue({ ...pageValue, [id]: '' });
    setNoteValue({ ...noteValue, [id]: '' });
  }
  function removeLectureLog(id) { saveLectureLogs((lectureLogs || []).filter(e => e.id !== id)); }
  function logsFor(id) { return (lectureLogs || []).filter(e => e.lectureId === id); }
  function totalPages(id) { return logsFor(id).reduce((s,e) => s + Number(e.pages||0), 0); }

  function logHabit(id) {
    const val = Number(logValue[id] || 0);
    if (!val) return;
    saveGrowthLogs([{ id: uid(), habitId: id, date: todayISO(), value: val }, ...growthLogs]);
    setLogValue({ ...logValue, [id]: '' });
  }
  function weekTotal(id) {
    return growthLogs.filter(l => l.habitId === id && inCurrentWeek(l.date)).reduce((s,l) => s + Number(l.value||0), 0);
  }

  const statutColor = { 'à lire': C.fade, 'en cours': C.navy, 'terminé': C.green };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['lectures','Lectures'],['habitudes','Habitudes']].map(([k,label]) => (
          <button key={k} onClick={() => setSubview(k)} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: subview === k ? C.navy : '#fff', color: subview === k ? '#fff' : C.ink,
          }}>{label}</button>
        ))}
      </div>

      {subview === 'lectures' && (
        <div>
          <SectionTitle>Ajouter une lecture</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <TextInput placeholder="Titre du livre / cours" value={titre} onChange={e => setTitre(e.target.value)} />
              <TextInput placeholder="Auteur (optionnel)" value={auteur} onChange={e => setAuteur(e.target.value)} />
              <TextInput type="number" placeholder="Nombre total de pages (optionnel)" value={totalPagesLivre} onChange={e => setTotalPagesLivre(e.target.value)} />
              <Select value={typeL} onChange={e => setTypeL(e.target.value)}>
                <option value="Livre">Livre</option>
                <option value="Cours">Cours</option>
              </Select>
              <PrimaryButton onClick={addLecture} disabled={!titre}><Plus size={15}/> Ajouter</PrimaryButton>
            </div>
          </Card>
          <div style={{ display: 'grid', gap: 8 }}>
            {lectures.map(l => {
              const total = totalPages(l.id);
              const isOpen = expandedId === l.id;
              const isEditing = editingLectureId === l.id;
              const progressPct = l.totalPages > 0 ? Math.min(100, Math.round((total / l.totalPages) * 100)) : null;
              if (isEditing) {
                return (
                  <Card key={l.id}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <TextInput placeholder="Titre" value={editTitre} onChange={e => setEditTitre(e.target.value)} />
                      <TextInput placeholder="Auteur" value={editAuteur} onChange={e => setEditAuteur(e.target.value)} />
                      <TextInput type="number" placeholder="Nombre total de pages" value={editPages} onChange={e => setEditPages(e.target.value)} />
                      <Select value={editType} onChange={e => setEditType(e.target.value)}>
                        <option value="Livre">Livre</option>
                        <option value="Cours">Cours</option>
                      </Select>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <PrimaryButton onClick={saveEditLecture} disabled={!editTitre} style={{ flex: 1 }}><Pencil size={15}/> Enregistrer</PrimaryButton>
                        <button onClick={() => setEditingLectureId(null)} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>
                      </div>
                    </div>
                  </Card>
                );
              }
              return (
                <Card key={l.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => setExpandedId(isOpen ? null : l.id)}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{l.titre}</div>
                      <div style={{ fontSize: 11, color: C.fade }}>
                        {l.type}{l.auteur ? ` · ${l.auteur}` : ''}
                        {l.totalPages ? ` · ${total}/${l.totalPages} pages (${progressPct}%)` : (total > 0 ? ` · ${total} pages lues` : '')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button onClick={(e) => { e.stopPropagation(); cycleStatut(l.id); }} style={{ background: statutColor[l.statut], color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{l.statut}</button>
                      <IconBtn onClick={() => startEditLecture(l)}><Pencil size={14} /></IconBtn>
                      <IconBtn onClick={() => duplicateLecture(l)}><Copy size={14} /></IconBtn>
                      <IconBtn onClick={() => removeLecture(l.id)}><Trash2 size={14} /></IconBtn>
                    </div>
                  </div>
                  {l.totalPages > 0 && (
                    <div style={{ height: 6, background: C.line, borderRadius: 8, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, background: C.purple }} />
                    </div>
                  )}

                  {isOpen && (
                    <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                      <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                        <TextInput type="number" placeholder="Pages lues aujourd'hui" value={pageValue[l.id] || ''} onChange={e => setPageValue({ ...pageValue, [l.id]: e.target.value })} />
                        <TextInput placeholder="Ce que j'ai appris aujourd'hui" value={noteValue[l.id] || ''} onChange={e => setNoteValue({ ...noteValue, [l.id]: e.target.value })} />
                        <PrimaryButton onClick={() => logLecture(l.id)} disabled={!pageValue[l.id] && !noteValue[l.id]}><Plus size={15}/> Enregistrer l'entrée du jour</PrimaryButton>
                      </div>
                      <div>
                        {logsFor(l.id).length === 0 && <p style={{ fontSize: 12, color: C.fade }}>Aucune entrée enregistrée.</p>}
                        {logsFor(l.id).map(entry => (
                          <div key={entry.id} style={{ padding: '8px 0', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, color: C.fade, display: 'flex', gap: 8 }}>
                                <span>{entry.date}</span>
                                {entry.pages > 0 && <span style={{ fontFamily: FONT_MONO, fontWeight: 700 }}>{entry.pages} pages</span>}
                              </div>
                              {entry.note && <div style={{ fontSize: 13, marginTop: 2 }}>{entry.note}</div>}
                            </div>
                            <IconBtn onClick={() => removeLectureLog(entry.id)}><Trash2 size={13} /></IconBtn>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
            {lectures.length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Aucune lecture enregistrée.</p>}
          </div>
        </div>
      )}

      {subview === 'habitudes' && (
        <div>
          <SectionTitle sub="Développement personnel — compétences, disciplines d'apprentissage. Astuce : dans Paramètres, adapte ces habitudes à ta Vision, ton Appel, ta Mission et l'héritage que tu veux laisser (voir l'onglet Vision).">Cette semaine</SectionTitle>
          <div style={{ display: 'grid', gap: 10 }}>
            {(settings.growthHabits || []).map(h => {
              const total = weekTotal(h.id);
              const progress = h.weeklyTarget > 0 ? Math.min(1, total / h.weeklyTarget) : 0;
              const isOpen = expandedHabitId === h.id;
              const Icon = pickIcon(h.name);
              return (
                <Card key={h.id}>
                  <div onClick={() => setExpandedHabitId(isOpen ? null : h.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={19} color={C.purple} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{h.name}</div>
                      <div style={{ fontSize: 11.5, color: C.fade }}>{total.toFixed(1)} / {h.weeklyTarget} {h.unit}</div>
                    </div>
                    <RingProgress value={progress} size={38} color={progress >= 1 ? C.green : C.purple} />
                    <ChevronDown size={16} color={C.fade} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
                      {(h.entryType||'compteur') === 'compteur' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <TextInput type="number" placeholder="Valeur" value={logValue[h.id] || ''} onChange={e => setLogValue({ ...logValue, [h.id]: e.target.value })} style={{ flex: 1 }} />
                          <button onClick={() => logHabit(h.id)} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Ajouter</button>
                        </div>
                      ) : (
                        <GrowthNotesJournal habit={h} growthLogs={growthLogs} saveGrowthLogs={saveGrowthLogs} />
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
            {(!settings.growthHabits || settings.growthHabits.length === 0) && <p style={{ fontSize: 13, color: C.fade }}>Aucune habitude définie — ajoute-en dans Paramètres.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function GrowthNotesJournal({ habit, growthLogs, saveGrowthLogs }) {
  const [val, setVal] = useState('');
  const [note, setNote] = useState('');
  const [showHist, setShowHist] = useState(false);
  const mine = growthLogs.filter(l => l.habitId === habit.id).sort((a,b) => new Date(b.date) - new Date(a.date));
  const avecNote = mine.filter(l => l.note);

  function addEntry() {
    if (!val && !note) return;
    saveGrowthLogs([{ id: uid(), habitId: habit.id, date: todayISO(), value: Number(val || 0), note }, ...growthLogs]);
    setVal(''); setNote('');
  }
  function removeEntry(id) { saveGrowthLogs(growthLogs.filter(l => l.id !== id)); }

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <div style={{ maxWidth: 90 }}>
          <div style={{ fontSize: 10, color: C.fade, marginBottom: 3 }}>{habit.unit}</div>
          <TextInput type="number" placeholder="0" value={val} onChange={e => setVal(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.fade, marginBottom: 3 }}>Note du jour</div>
          <TextInput placeholder="Ce qui a été pratiqué…" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <button onClick={addEntry} disabled={!val && !note} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Ajouter</button>
      </div>
      {avecNote.length > 0 && (
        <button onClick={() => setShowHist(!showHist)} style={{ marginTop: 8, background: 'none', border: `1px solid ${C.line}`, color: C.fade, borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
          {showHist ? '▾ Masquer les notes passées' : `▸ Voir les notes passées (${avecNote.length})`}
        </button>
      )}
      {showHist && avecNote.map(l => (
        <div key={l.id} style={{ padding: '7px 0', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: C.fade }}>{l.date}{l.value ? ` · ${l.value} ${habit.unit}` : ''}</div>
            <div style={{ fontSize: 13 }}>{l.note}</div>
          </div>
          <IconBtn onClick={() => removeEntry(l.id)}><Trash2 size={13} /></IconBtn>
        </div>
      ))}
      {avecNote.length === 0 && <p style={{ fontSize: 11, color: C.fade, marginTop: 6 }}>Aucune note enregistrée pour l'instant.</p>}
    </div>
  );
}
function RelationsTab({ settings, contacts, saveContacts, relationLogs, saveRelationLogs, onTrash }) {
  const [editingId, setEditingId] = useState(null);
  const [nom, setNom] = useState('');
  const [categorieId, setCategorieId] = useState(settings.relationCategories?.[0]?.id || '');
  const [frequenceCible, setFrequenceCible] = useState('30');
  const [notes, setNotes] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [echangeNote, setEchangeNote] = useState({});

  useEffect(() => { if (!settings.relationCategories.find(c => c.id === categorieId)) setCategorieId(settings.relationCategories[0]?.id || ''); }, [settings.relationCategories]);

  function resetForm() { setEditingId(null); setNom(''); setNotes(''); setFrequenceCible('30'); }
  function addContact() {
    if (!nom) return;
    if (editingId) {
      saveContacts(contacts.map(c => c.id === editingId ? { ...c, nom, categorieId, frequenceCible: Number(frequenceCible), notes } : c));
    } else {
      saveContacts([{ id: uid(), nom, categorieId, frequenceCible: Number(frequenceCible), dernierContact: todayISO(), notes }, ...contacts]);
    }
    resetForm();
  }
  function startEdit(c) {
    setEditingId(c.id); setNom(c.nom); setCategorieId(c.categorieId); setFrequenceCible(String(c.frequenceCible)); setNotes(c.notes || '');
  }
  function duplicateContact(c) {
    saveContacts([{ ...c, id: uid(), nom: c.nom + ' (copie)', dernierContact: todayISO() }, ...contacts]);
  }
  function marquerContacte(id, note = '') {
    saveContacts(contacts.map(c => c.id === id ? { ...c, dernierContact: todayISO() } : c));
    saveRelationLogs([{ id: uid(), contactId: id, date: todayISO(), note }, ...relationLogs]);
    setEchangeNote({ ...echangeNote, [id]: '' });
  }
  function removeContact(id) {
    const item = contacts.find(c => c.id === id);
    saveContacts(contacts.filter(c => c.id !== id));
    if (item) onTrash('contact', item);
    if (editingId === id) resetForm();
  }
  function removeLog(id) { saveRelationLogs(relationLogs.filter(l => l.id !== id)); }
  function logsFor(id) { return relationLogs.filter(l => l.contactId === id).sort((a,b) => new Date(b.date) - new Date(a.date)); }

  const catById = Object.fromEntries((settings.relationCategories||[]).map(c => [c.id, c]));
  const today = new Date();
  const withStatus = contacts.map(c => {
    const jours = Math.floor((today - new Date(c.dernierContact)) / 86400000);
    const enRetard = jours > c.frequenceCible;
    return { ...c, jours, enRetard };
  }).sort((a,b) => b.jours - a.jours);

  return (
    <div>
      <SectionTitle sub="Famille, amis, mentors, disciples — la fidélité relationnelle, pas seulement financière.">{editingId ? 'Modifier le contact' : 'Ajouter un contact'}</SectionTitle>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <TextInput placeholder="Nom" value={nom} onChange={e => setNom(e.target.value)} />
          <Select value={categorieId} onChange={e => setCategorieId(e.target.value)}>
            {(settings.relationCategories||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <TextInput type="number" placeholder="Fréquence souhaitée (jours)" value={frequenceCible} onChange={e => setFrequenceCible(e.target.value)} />
          <TextInput placeholder="Note (optionnel)" value={notes} onChange={e => setNotes(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <PrimaryButton onClick={addContact} disabled={!nom} style={{ flex: 1 }}>
              {editingId ? <><Pencil size={15}/> Enregistrer les modifications</> : <><Plus size={15}/> Ajouter</>}
            </PrimaryButton>
            {editingId && <button onClick={resetForm} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>}
          </div>
        </div>
      </Card>

      <SectionTitle sub="Touche une carte pour voir l'historique des échanges et y ajouter une note.">Fidélité relationnelle</SectionTitle>
      <div style={{ display: 'grid', gap: 8 }}>
        {withStatus.map(c => {
          const isOpen = expandedId === c.id;
          const hist = logsFor(c.id);
          return (
          <Card key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => setExpandedId(isOpen ? null : c.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.enRetard && <Pill color={C.terracotta}>À RECONTACTER</Pill>}
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{c.nom}</span>
                </div>
                <div style={{ fontSize: 11, color: C.fade, marginTop: 2 }}>{catById[c.categorieId]?.name || '—'} · dernier contact il y a {c.jours} j (objectif : {c.frequenceCible} j) · {hist.length} échange(s) noté(s)</div>
                {c.notes && <div style={{ fontSize: 11, color: C.fade, marginTop: 2 }}>{c.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <IconBtn onClick={() => startEdit(c)}><Pencil size={14} /></IconBtn>
                <IconBtn onClick={() => duplicateContact(c)}><Copy size={14} /></IconBtn>
                <IconBtn onClick={() => removeContact(c.id)}><Trash2 size={14} /></IconBtn>
              </div>
            </div>
            <button onClick={() => marquerContacte(c.id)} style={{ marginTop: 8, background: C.green, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Contacté aujourd'hui</button>

            {isOpen && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <TextInput placeholder="Ce dont on a parlé, comment il/elle va…" value={echangeNote[c.id] || ''} onChange={e => setEchangeNote({ ...echangeNote, [c.id]: e.target.value })} style={{ flex: 1 }} />
                  <button onClick={() => marquerContacte(c.id, echangeNote[c.id] || '')} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Noter l'échange</button>
                </div>
                {hist.length === 0 && <p style={{ fontSize: 11, color: C.fade }}>Aucun échange noté pour l'instant.</p>}
                {hist.filter(l => l.note).map(l => (
                  <div key={l.id} style={{ padding: '6px 0', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div><div style={{ fontSize: 10, color: C.fade }}>{l.date}</div><div style={{ fontSize: 13 }}>{l.note}</div></div>
                    <IconBtn onClick={() => removeLog(l.id)}><Trash2 size={13} /></IconBtn>
                  </div>
                ))}
              </div>
            )}
          </Card>
          );
        })}
        {withStatus.length === 0 && <p style={{ fontSize: 13, color: C.fade }}>Aucun contact enregistré.</p>}
      </div>
    </div>
  );
}

// ---------- Paramètres ----------
function trashLabel(entry, settings) {
  const { type, item } = entry;
  const catById = Object.fromEntries((settings.categories||[]).map(c => [c.id, c]));
  switch (type) {
    case 'transaction':
      return { title: item.type === 'depense' ? (catById[item.categoryId]?.name || 'Dépense') : (item.source || 'Revenu'), subtitle: `Transaction · ${fmt(item.amount)} · ${item.date}` };
    case 'debt':
      return { title: item.name, subtitle: `Dette · solde ${fmt(item.currentBalance)}` };
    case 'provision':
      return { title: item.name, subtitle: 'Provision' };
    case 'decision':
      return { title: item.objet, subtitle: `Décision · ${item.date}` };
    case 'journal':
      return { title: (item.texte || '').slice(0, 40) + ((item.texte||'').length > 40 ? '…' : ''), subtitle: `Journal · ${item.date}` };
    case 'objectif':
      return { title: item.titre, subtitle: 'Objectif' };
    case 'lecture':
      return { title: item.titre, subtitle: `Lecture${item.auteur ? ' · ' + item.auteur : ''}` };
    case 'contact':
      return { title: item.nom, subtitle: 'Contact' };
    default:
      return { title: 'Élément', subtitle: type };
  }
}

function ParametresPanel({ settings, saveSettings, onClose, onExport, onImport, onChangeCurrency, userEmail, trash, onRestore, onPurgeOne, onPurgeAll }) {
  const [pendingImport, setPendingImport] = useState(null);
  const [confirmCurrency, setConfirmCurrency] = useState(null);
  const [usdRate, setUsdRate] = useState(String((settings.exchangeRates || DEFAULT_EXCHANGE_RATES).USD));
  const [importMsg, setImportMsg] = useState(null);
  const [newGroup, setNewGroup] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatGroup, setNewCatGroup] = useState(settings.groups.find(g => g.id !== 'g-royaume')?.id || '');
  const [newCompte, setNewCompte] = useState('');
  const [newCompteType, setNewCompteType] = useState('banque');
  const [newDonType, setNewDonType] = useState('');
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscUnit, setNewDiscUnit] = useState('jours');
  const [newDiscTarget, setNewDiscTarget] = useState('');
  const [newTimeName, setNewTimeName] = useState('');
  const [newTimeTarget, setNewTimeTarget] = useState('');
  const [newHealthName, setNewHealthName] = useState('');
  const [newHealthUnit, setNewHealthUnit] = useState('');
  const [newHealthTarget, setNewHealthTarget] = useState('');
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitUnit, setNewHabitUnit] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState('');
  const [newRelCat, setNewRelCat] = useState('');

  function addGroup() {
    if (!newGroup) return;
    const color = PALETTE[settings.groups.length % PALETTE.length];
    saveSettings({ ...settings, groups: [...settings.groups, { id: uid(), name: newGroup, color }] });
    setNewGroup('');
  }
  function removeGroup(id) {
    saveSettings({ ...settings, groups: settings.groups.filter(g => g.id !== id), categories: settings.categories.filter(c => c.groupId !== id) });
  }
  function addCategory() {
    if (!newCatName || !newCatGroup) return;
    saveSettings({ ...settings, categories: [...settings.categories, { id: uid(), name: newCatName, groupId: newCatGroup, target: null }] });
    setNewCatName('');
  }
  function removeCategory(id) {
    saveSettings({ ...settings, categories: settings.categories.filter(c => c.id !== id) });
  }
  function addCompte() {
    if (!newCompte) return;
    saveSettings({ ...settings, comptes: [...settings.comptes, { id: uid(), name: newCompte, type: newCompteType }] });
    setNewCompte('');
  }
  function removeCompte(id) {
    saveSettings({ ...settings, comptes: settings.comptes.filter(c => c.id !== id) });
  }
  function addDonType() {
    if (!newDonType) return;
    saveSettings({ ...settings, donTypes: [...settings.donTypes, { id: uid(), name: newDonType, isTithe: false }] });
    setNewDonType('');
  }
  function removeDonType(id) {
    saveSettings({ ...settings, donTypes: settings.donTypes.filter(d => d.id !== id) });
  }
  function addDiscipline() {
    if (!newDiscName || !newDiscTarget) return;
    saveSettings({ ...settings, disciplines: [...settings.disciplines, { id: uid(), name: newDiscName, unit: newDiscUnit, monthlyTarget: Number(newDiscTarget), entryType: 'compteur' }] });
    setNewDiscName(''); setNewDiscTarget('');
  }
  function removeDiscipline(id) {
    saveSettings({ ...settings, disciplines: settings.disciplines.filter(d => d.id !== id) });
  }
  function cycleDisciplineEntryType(id) {
    const order = ['compteur', 'sujets', 'notes'];
    saveSettings({ ...settings, disciplines: settings.disciplines.map(d => d.id === id ? { ...d, entryType: order[(order.indexOf(d.entryType||'compteur')+1) % order.length] } : d) });
  }
  function addTimeCategory() {
    if (!newTimeName || !newTimeTarget) return;
    const color = PALETTE[(settings.timeCategories||[]).length % PALETTE.length];
    saveSettings({ ...settings, timeCategories: [...(settings.timeCategories||[]), { id: uid(), name: newTimeName, color, weeklyTarget: Number(newTimeTarget) }] });
    setNewTimeName(''); setNewTimeTarget('');
  }
  function removeTimeCategory(id) {
    saveSettings({ ...settings, timeCategories: (settings.timeCategories||[]).filter(t => t.id !== id) });
  }
  function addHealthMetric() {
    if (!newHealthName || !newHealthTarget) return;
    saveSettings({ ...settings, healthMetrics: [...(settings.healthMetrics||[]), { id: uid(), name: newHealthName, unit: newHealthUnit || '', weeklyTarget: Number(newHealthTarget) }] });
    setNewHealthName(''); setNewHealthUnit(''); setNewHealthTarget('');
  }
  function removeHealthMetric(id) {
    saveSettings({ ...settings, healthMetrics: (settings.healthMetrics||[]).filter(h => h.id !== id) });
  }
  function addHabit() {
    if (!newHabitName || !newHabitTarget) return;
    saveSettings({ ...settings, growthHabits: [...(settings.growthHabits||[]), { id: uid(), name: newHabitName, unit: newHabitUnit || '', weeklyTarget: Number(newHabitTarget), entryType: 'compteur' }] });
    setNewHabitName(''); setNewHabitUnit(''); setNewHabitTarget('');
  }
  function removeHabit(id) {
    saveSettings({ ...settings, growthHabits: (settings.growthHabits||[]).filter(h => h.id !== id) });
  }
  function cycleHabitEntryType(id) {
    saveSettings({ ...settings, growthHabits: (settings.growthHabits||[]).map(h => h.id === id ? { ...h, entryType: (h.entryType||'compteur') === 'compteur' ? 'notes' : 'compteur' } : h) });
  }
  function addRelCat() {
    if (!newRelCat) return;
    saveSettings({ ...settings, relationCategories: [...(settings.relationCategories||[]), { id: uid(), name: newRelCat }] });
    setNewRelCat('');
  }
  function removeRelCat(id) {
    saveSettings({ ...settings, relationCategories: (settings.relationCategories||[]).filter(c => c.id !== id) });
  }
  function toggleObjectifZero() {
    saveSettings({ ...settings, objectifZero: !settings.objectifZero });
  }
  function toggleCapital(capId) {
    const disabled = settings.disabledCapitals || [];
    const next = disabled.includes(capId) ? disabled.filter(id => id !== capId) : [...disabled, capId];
    saveSettings({ ...settings, disabledCapitals: next });
  }
  function toggleModule(modId) {
    const disabled = settings.disabledModules || [];
    const next = disabled.includes(modId) ? disabled.filter(id => id !== modId) : [...disabled, modId];
    saveSettings({ ...settings, disabledModules: next });
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.cream, zIndex: 20, overflowY: 'auto', paddingBottom: 40 }}>
      <div style={{ background: C.navy, color: '#fff', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700 }}>Paramètres</span>
        <IconBtn onClick={onClose} color="#fff"><X size={20} /></IconBtn>
      </div>
      <div style={{ padding: 16 }}>

        <SectionTitle sub="Rien n'est figé : ajoute, renomme, retire librement.">Comptes</SectionTitle>
        <Card style={{ marginBottom: 10 }}>
          {settings.comptes.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
              <span style={{ fontSize: 13 }}>{c.name} <span style={{ color: C.fade, fontSize: 11 }}>({c.type})</span></span>
              <IconBtn onClick={() => removeCompte(c.id)}><Trash2 size={14} /></IconBtn>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <TextInput placeholder="Nom du compte" value={newCompte} onChange={e => setNewCompte(e.target.value)} />
            <Select value={newCompteType} onChange={e => setNewCompteType(e.target.value)}>
              <option value="banque">Banque</option>
              <option value="caisse">Caisse (liquide)</option>
            </Select>
            <PrimaryButton onClick={addCompte} disabled={!newCompte}><Plus size={14}/> Ajouter un compte</PrimaryButton>
          </div>
        </Card>

        <SectionTitle sub="Rien n'est figé : ajoute, renomme, retire librement. Le budget mensuel alimente l'indicateur de Discipline. (Les dons/dîme se gèrent dans Royaume et Types de dons ci-dessous, pas ici.)">Groupes & Catégories</SectionTitle>
        <Card style={{ marginBottom: 10 }}>
          {settings.groups.filter(g => g.id !== 'g-royaume').map(g => (
            <div key={g.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{g.name}</span>
                <IconBtn onClick={() => removeGroup(g.id)}><Trash2 size={14} /></IconBtn>
              </div>
              {settings.categories.filter(c => c.groupId === g.id).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0 3px 10px', gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.fade, flex: 1 }}>· {c.name}</span>
                  <input type="number" placeholder="budget/mois" value={c.target || ''} onChange={e => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    saveSettings({ ...settings, categories: settings.categories.map(cc => cc.id === c.id ? { ...cc, target: val } : cc) });
                  }} style={{ width: 80, fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 6, padding: '2px 6px' }} />
                  <IconBtn onClick={() => removeCategory(c.id)}><Trash2 size={12} /></IconBtn>
                </div>
              ))}
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: 10 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <TextInput placeholder="Nouveau groupe" value={newGroup} onChange={e => setNewGroup(e.target.value)} />
            <PrimaryButton onClick={addGroup} disabled={!newGroup} color={C.gold}><Plus size={14}/> Ajouter un groupe</PrimaryButton>
          </div>
        </Card>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <TextInput placeholder="Nouvelle catégorie" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
            <Select value={newCatGroup} onChange={e => setNewCatGroup(e.target.value)}>
              {settings.groups.filter(g => g.id !== 'g-royaume').map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
            <PrimaryButton onClick={addCategory} disabled={!newCatName}><Plus size={14}/> Ajouter une catégorie</PrimaryButton>
          </div>
        </Card>

        <SectionTitle>Types de dons</SectionTitle>
        <Card style={{ marginBottom: 10 }}>
          {settings.donTypes.map(d => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
              <span style={{ fontSize: 13 }}>{d.name}{d.isTithe ? ' (compte pour la dîme)' : ''}</span>
              <IconBtn onClick={() => removeDonType(d.id)}><Trash2 size={14} /></IconBtn>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <TextInput placeholder="Nouveau type de don" value={newDonType} onChange={e => setNewDonType(e.target.value)} />
            <PrimaryButton onClick={addDonType} disabled={!newDonType}><Plus size={14}/> Ajouter un type</PrimaryButton>
          </div>
        </Card>

        <SectionTitle sub="Le mode de suivi détermine comment la discipline se saisit : Compteur (un nombre par jour), Sujets (une liste vivante de points avec statut, idéale pour la prière), ou Notes (un nombre + un texte libre à chaque entrée, idéal pour la lecture).">Disciplines (Royaume)</SectionTitle>
        <Card style={{ marginBottom: 10 }}>
          {settings.disciplines.map(d => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 13 }}>{d.name} <span style={{ color: C.fade, fontSize: 11 }}>({d.monthlyTarget} {d.unit}/mois)</span></span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => cycleDisciplineEntryType(d.id)} style={{
                  background: d.entryType === 'sujets' ? C.gold : d.entryType === 'notes' ? C.purple : C.line,
                  color: d.entryType ? '#fff' : C.ink, border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                }}>{d.entryType === 'sujets' ? 'Sujets' : d.entryType === 'notes' ? 'Notes' : 'Compteur'}</button>
                <IconBtn onClick={() => removeDiscipline(d.id)}><Trash2 size={14} /></IconBtn>
              </div>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <TextInput placeholder="Nom (ex: Méditation)" value={newDiscName} onChange={e => setNewDiscName(e.target.value)} />
            <Select value={newDiscUnit} onChange={e => setNewDiscUnit(e.target.value)}>
              <option value="jours">jours</option>
              <option value="chapitres">chapitres</option>
              <option value="heures">heures</option>
              <option value="personnes">personnes</option>
              <option value="fois">fois</option>
            </Select>
            <TextInput type="number" placeholder="Objectif mensuel" value={newDiscTarget} onChange={e => setNewDiscTarget(e.target.value)} />
            <PrimaryButton onClick={addDiscipline} disabled={!newDiscName || !newDiscTarget} color={C.gold}><Plus size={14}/> Ajouter une discipline</PrimaryButton>
          </div>
        </Card>

        <SectionTitle>Catégories de temps</SectionTitle>
        <Card style={{ marginBottom: 10 }}>
          {(settings.timeCategories||[]).map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
              <span style={{ fontSize: 13, color: t.color, fontWeight: 700 }}>{t.name} <span style={{ color: C.fade, fontSize: 11, fontWeight: 400 }}>({t.weeklyTarget} h/semaine)</span></span>
              <IconBtn onClick={() => removeTimeCategory(t.id)}><Trash2 size={14} /></IconBtn>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <TextInput placeholder="Nom (ex: Formation)" value={newTimeName} onChange={e => setNewTimeName(e.target.value)} />
            <TextInput type="number" placeholder="Objectif hebdomadaire (heures)" value={newTimeTarget} onChange={e => setNewTimeTarget(e.target.value)} />
            <PrimaryButton onClick={addTimeCategory} disabled={!newTimeName || !newTimeTarget} color={C.gold}><Plus size={14}/> Ajouter une catégorie de temps</PrimaryButton>
          </div>
        </Card>

        <SectionTitle>Indicateurs de santé</SectionTitle>
        <Card style={{ marginBottom: 10 }}>
          {(settings.healthMetrics||[]).map(h => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
              <span style={{ fontSize: 13 }}>{h.name} <span style={{ color: C.fade, fontSize: 11 }}>({h.weeklyTarget} {h.unit}/semaine)</span></span>
              <IconBtn onClick={() => removeHealthMetric(h.id)}><Trash2 size={14} /></IconBtn>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <TextInput placeholder="Nom (ex: Méditation active)" value={newHealthName} onChange={e => setNewHealthName(e.target.value)} />
            <TextInput placeholder="Unité (ex: h, L, /10)" value={newHealthUnit} onChange={e => setNewHealthUnit(e.target.value)} />
            <TextInput type="number" placeholder="Objectif hebdomadaire" value={newHealthTarget} onChange={e => setNewHealthTarget(e.target.value)} />
            <PrimaryButton onClick={addHealthMetric} disabled={!newHealthName || !newHealthTarget} color={C.green}><Plus size={14}/> Ajouter un indicateur</PrimaryButton>
          </div>
        </Card>

        <SectionTitle sub="Mode Notes : chaque entrée porte un nombre et un texte libre, comme le module Lecture (idéal pour documenter concrètement une pratique).">Habitudes de croissance</SectionTitle>
        <Card style={{ marginBottom: 10 }}>
          {(settings.growthHabits||[]).map(h => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 13 }}>{h.name} <span style={{ color: C.fade, fontSize: 11 }}>({h.weeklyTarget} {h.unit}/semaine)</span></span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => cycleHabitEntryType(h.id)} style={{
                  background: (h.entryType||'compteur') === 'notes' ? C.purple : C.line, color: (h.entryType||'compteur') === 'notes' ? '#fff' : C.ink,
                  border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                }}>{(h.entryType||'compteur') === 'notes' ? 'Notes' : 'Compteur'}</button>
                <IconBtn onClick={() => removeHabit(h.id)}><Trash2 size={14} /></IconBtn>
              </div>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <TextInput placeholder="Nom (ex: Langue étrangère)" value={newHabitName} onChange={e => setNewHabitName(e.target.value)} />
            <TextInput placeholder="Unité (ex: h, pages)" value={newHabitUnit} onChange={e => setNewHabitUnit(e.target.value)} />
            <TextInput type="number" placeholder="Objectif hebdomadaire" value={newHabitTarget} onChange={e => setNewHabitTarget(e.target.value)} />
            <PrimaryButton onClick={addHabit} disabled={!newHabitName || !newHabitTarget} color={C.purple}><Plus size={14}/> Ajouter une habitude</PrimaryButton>
          </div>
        </Card>

        <SectionTitle>Catégories de relations</SectionTitle>
        <Card style={{ marginBottom: 10 }}>
          {(settings.relationCategories||[]).map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
              <span style={{ fontSize: 13 }}>{c.name}</span>
              <IconBtn onClick={() => removeRelCat(c.id)}><Trash2 size={14} /></IconBtn>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <TextInput placeholder="Nouvelle catégorie (ex: Église)" value={newRelCat} onChange={e => setNewRelCat(e.target.value)} />
            <PrimaryButton onClick={addRelCat} disabled={!newRelCat} color={C.terracotta}><Plus size={14}/> Ajouter une catégorie</PrimaryButton>
          </div>
        </Card>

        <SectionTitle sub="Change la devise utilisée dans toute l'application. Les montants déjà enregistrés sont convertis automatiquement au taux indiqué.">Devise</SectionTitle>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {Object.keys(CURRENCIES).map(code => (
              <button key={code} onClick={() => { if (code !== settings.currency) setConfirmCurrency(code); }} style={{
                flex: 1, padding: '9px 4px', borderRadius: 8, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                background: settings.currency === code ? C.navy : '#fff', color: settings.currency === code ? '#fff' : C.ink,
              }}>{CURRENCIES[code].symbol} · {code}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: C.fade, flex: 1 }}>1 USD =</span>
            <TextInput type="number" value={usdRate} onChange={e => setUsdRate(e.target.value)} style={{ maxWidth: 110 }} />
            <span style={{ fontSize: 11.5, color: C.fade }}>FCFA</span>
            <button onClick={() => saveSettings({ ...settings, exchangeRates: { ...(settings.exchangeRates || DEFAULT_EXCHANGE_RATES), USD: Number(usdRate) || DEFAULT_EXCHANGE_RATES.USD } })} style={{ background: C.gold, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>OK</button>
          </div>
          <div style={{ fontSize: 10.5, color: C.fade, marginTop: 6 }}>Le taux EUR/FCFA est fixe (parité officielle). Le taux USD/FCFA fluctue — ajuste-le au taux du jour si besoin.</div>

          {confirmCurrency && (
            <div style={{ background: C.cream, border: `1px solid ${C.gold}`, borderRadius: 10, padding: 12, marginTop: 10 }}>
              <div style={{ fontSize: 12.5, color: C.heading, marginBottom: 8 }}>
                Passer de <strong>{settings.currency}</strong> à <strong>{confirmCurrency}</strong> va convertir tous tes montants déjà enregistrés (transactions, dettes, provisions, objectifs de dépense) au taux actuel. Continuer ?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmCurrency(null)} style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', color: C.ink }}>Annuler</button>
                <button onClick={() => { onChangeCurrency(confirmCurrency, Number(usdRate) || DEFAULT_EXCHANGE_RATES.USD); setConfirmCurrency(null); }} style={{ flex: 1, background: C.green, border: 'none', borderRadius: 8, padding: '9px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', color: '#fff' }}>Convertir</button>
              </div>
            </div>
          )}
        </Card>

        <SectionTitle>Apparence</SectionTitle>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['light','Clair'],['dark','Sombre'],['system','Système']].map(([k,label]) => (
              <button key={k} onClick={() => saveSettings({ ...settings, theme: k })} style={{
                flex: 1, padding: '9px 4px', borderRadius: 8, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                background: (settings.theme||'system') === k ? C.navy : C.surface, color: (settings.theme||'system') === k ? '#fff' : C.ink,
              }}>{label}</button>
            ))}
          </div>
        </Card>

        <SectionTitle>Préférences</SectionTitle>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Mode Objectif Zéro</div>
              <div style={{ fontSize: 11, color: C.fade, maxWidth: 220 }}>Affiche si chaque franc du mois a une destination. Désactivé par défaut.</div>
            </div>
            <button onClick={toggleObjectifZero} style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: settings.objectifZero ? C.green : C.line, position: 'relative',
            }}>
              <span style={{ position: 'absolute', top: 2, left: settings.objectifZero ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
            </button>
          </div>
        </Card>

        <SectionTitle sub="Désactive un capital entier ou juste un module précis. Un capital désactivé masque tous ses modules du menu ET retire ses dimensions du score de l'Indice (le poids est redistribué sur les dimensions restantes).">Capitaux & modules</SectionTitle>
        <Card style={{ marginBottom: 18 }}>
          {CAPITALS.map(cap => {
            const capOff = (settings.disabledCapitals || []).includes(cap.id);
            const dims = CAPITAL_DIMS[cap.id] || [];
            return (
              <div key={cap.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: capOff ? C.fade : C.navy }}>{cap.name}</div>
                    {dims.length > 0 && <div style={{ fontSize: 10, color: C.fade }}>Score : {dims.join(', ')}</div>}
                  </div>
                  <button onClick={() => toggleCapital(cap.id)} style={{
                    width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                    background: capOff ? C.line : C.green, position: 'relative', flexShrink: 0,
                  }}>
                    <span style={{ position: 'absolute', top: 2, left: capOff ? 2 : 20, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                  </button>
                </div>
                <div style={{ marginTop: 8, display: 'grid', gap: 6, opacity: capOff ? 0.4 : 1 }}>
                  {cap.modules.map(m => {
                    const modOff = (settings.disabledModules || []).includes(m.id);
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 6 }}>
                        <span style={{ fontSize: 12, color: C.fade }}>· {m.label}</span>
                        <button disabled={capOff} onClick={() => toggleModule(m.id)} style={{
                          width: 34, height: 19, borderRadius: 10, border: 'none', cursor: capOff ? 'default' : 'pointer',
                          background: modOff ? C.line : C.green, position: 'relative', flexShrink: 0,
                        }}>
                          <span style={{ position: 'absolute', top: 2, left: modOff ? 2 : 17, width: 15, height: 15, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Card>

        <SectionTitle>Mon compte</SectionTitle>
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: C.fade }}>Connecté en tant que</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.heading }}>{userEmail || '—'}</div>
            </div>
            <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: `1px solid ${C.terracotta}`, color: C.terracotta, borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Se déconnecter</button>
          </div>
        </Card>

        <SectionTitle sub="Les éléments supprimés (transactions, dettes, provisions, décisions, objectifs, lectures, contacts, entrées de journal) restent ici 30 jours avant suppression définitive.">Corbeille{trash.length > 0 ? ` (${trash.length})` : ''}</SectionTitle>
        <Card style={{ marginBottom: 18 }}>
          {trash.length === 0 ? (
            <p style={{ fontSize: 12.5, color: C.fade }}>La corbeille est vide.</p>
          ) : (
            <>
              {trash.map(t => (
                <div key={t.trashId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.line}` }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{trashLabel(t, settings).title}</div>
                    <div style={{ fontSize: 10.5, color: C.fade }}>{trashLabel(t, settings).subtitle} · supprimé le {t.deletedAt}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => onRestore(t.trashId)} style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 9px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Restaurer</button>
                    <IconBtn onClick={() => onPurgeOne(t.trashId)}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>
              ))}
              <button onClick={onPurgeAll} style={{ marginTop: 10, background: 'none', border: `1px solid ${C.terracotta}`, color: C.terracotta, borderRadius: 8, padding: '8px', fontWeight: 700, fontSize: 12, cursor: 'pointer', width: '100%' }}>Vider définitivement la corbeille</button>
            </>
          )}
        </Card>

        <SectionTitle sub="Exporte régulièrement une copie de tes données — en cas de perte, de changement de téléphone, ou de mise à jour de l'app.">Sauvegarde</SectionTitle>
        <Card style={{ marginBottom: 18 }}>
          <PrimaryButton onClick={onExport}><Download size={15}/> Exporter mes données (.json)</PrimaryButton>
          <div style={{ height: 8 }} />
          {!pendingImport ? (
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 14px', fontWeight: 700, fontSize: 13, color: C.heading,
            }}>
              <Upload size={15}/> Importer une sauvegarde
              <input type="file" accept="application/json" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0];
                setImportMsg(null);
                if (file) setPendingImport(file);
                e.target.value = '';
              }} />
            </label>
          ) : (
            <div style={{ background: C.cream, border: `1px solid ${C.gold}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12.5, color: C.heading, marginBottom: 8 }}>
                Importer <strong>{pendingImport.name}</strong> va remplacer toutes les données actuelles. Continuer ?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPendingImport(null)} style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', color: C.ink }}>Annuler</button>
                <button onClick={async () => {
                  const file = pendingImport;
                  setPendingImport(null);
                  setImportMsg('loading');
                  const ok = await onImport(file);
                  setImportMsg(ok ? 'success' : 'error');
                }} style={{ flex: 1, background: C.terracotta, border: 'none', borderRadius: 8, padding: '9px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', color: '#fff' }}>Remplacer</button>
              </div>
            </div>
          )}
          {importMsg === 'loading' && <div style={{ fontSize: 12, color: C.fade, marginTop: 8, textAlign: 'center' }}>Import en cours…</div>}
          {importMsg === 'success' && <div style={{ fontSize: 12, color: C.green, marginTop: 8, textAlign: 'center', fontWeight: 700 }}>Sauvegarde importée avec succès.</div>}
          {importMsg === 'error' && <div style={{ fontSize: 12, color: C.terracotta, marginTop: 8, textAlign: 'center', fontWeight: 700 }}>Échec de l'import — fichier invalide.</div>}
        </Card>
      </div>
    </div>
  );
}
const CAPITALS = [
  { id: 'financier', name: 'Capital financier', icon: Wallet, color: C.gold,
    modules: [
      { id: 'transactions', label: 'Mouvements', icon: Receipt },
      { id: 'provisions', label: 'Provisions', icon: PiggyBank },
      { id: 'dettes', label: 'Dettes', icon: CreditCard },
    ] },
  { id: 'spirituel', name: 'Capital spirituel', icon: Crown, color: C.gold,
    modules: [
      { id: 'royaume', label: 'Royaume', icon: Crown },
      { id: 'sagesse', label: 'Sagesse', icon: BookOpen },
    ] },
  { id: 'temporel', name: 'Capital temporel', icon: Clock, color: C.heading,
    modules: [
      { id: 'temps', label: 'Temps', icon: Clock },
      { id: 'vision', label: 'Vision', icon: Compass },
    ] },
  { id: 'physique', name: 'Capital physique', icon: HeartPulse, color: C.terracotta,
    modules: [ { id: 'sante', label: 'Santé', icon: HeartPulse } ] },
  { id: 'intellectuel', name: 'Capital intellectuel', icon: GraduationCap, color: C.purple,
    modules: [ { id: 'croissance', label: 'Croissance', icon: GraduationCap } ] },
  { id: 'relationnel', name: 'Capital relationnel', icon: Users, color: C.green,
    modules: [ { id: 'relations', label: 'Relations', icon: Users } ] },
];

function ModulesLauncher({ onSelect, onClose, settings, currentTab }) {
  const disabledCapitals = settings.disabledCapitals || [];
  const disabledModules = settings.disabledModules || [];
  const visibleCapitals = CAPITALS
    .filter(cap => !disabledCapitals.includes(cap.id))
    .map(cap => ({ ...cap, modules: cap.modules.filter(m => !disabledModules.includes(m.id)) }))
    .filter(cap => cap.modules.length > 0);
  const currentCapId = visibleCapitals.find(cap => cap.modules.some(m => m.id === currentTab))?.id;
  const [openId, setOpenId] = useState(currentCapId || visibleCapitals[0]?.id || null);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 25 }}>
      <style>{`
        @keyframes edenSheetBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes edenSheetSlideIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(11,47,78,0.45)', animation: 'edenSheetBackdropIn 0.18s ease-out' }}
      />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '78vh',
        background: C.cream, borderTopLeftRadius: 22, borderTopRightRadius: 22,
        boxShadow: '0 -8px 30px rgba(11,47,78,0.25)', display: 'flex', flexDirection: 'column',
        animation: 'edenSheetSlideIn 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 4, background: C.line }} />
        </div>
        <div style={{ padding: '10px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: C.heading }}>Modules</span>
          <IconBtn onClick={onClose}><X size={19} /></IconBtn>
        </div>
        <div style={{ padding: 16, overflowY: 'auto' }}>
          {visibleCapitals.map(cap => {
            const CapIcon = cap.icon;
            const isOpen = openId === cap.id;
            return (
              <div key={cap.id} style={{ marginBottom: 10, border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden', background: C.surface }}>
                <button
                  onClick={() => setOpenId(isOpen ? null : cap.id)}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: cap.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CapIcon size={15} color="#fff" />
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: C.heading, letterSpacing: 0.2 }}>{cap.name}</span>
                  </div>
                  <ChevronRight size={18} color={C.fade} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                {isOpen && (
                  <div style={{ padding: '4px 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {cap.modules.map(m => {
                      const MIcon = m.icon;
                      return (
                        <button key={m.id} onClick={() => onSelect(m.id)} style={{
                          gridColumn: cap.modules.length === 1 ? '1 / -1' : 'auto',
                          background: C.cream, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 12px',
                          display: 'flex', flexDirection: cap.modules.length === 1 ? 'row' : 'column', alignItems: 'center',
                          justifyContent: cap.modules.length === 1 ? 'center' : 'flex-start', gap: 8, cursor: 'pointer',
                        }}>
                          <MIcon size={22} color={cap.color} />
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Recherche globale ----------
function SearchPanel({ settings, transactions, debts, provisions, decisions, journal, objectifs, lectures, contacts, onNavigate, onClose }) {
  const [q, setQ] = useState('');
  const catById = Object.fromEntries((settings.categories||[]).map(c => [c.id, c]));
  const query = q.trim().toLowerCase();
  const match = (...vals) => query.length >= 2 && vals.some(v => (v||'').toString().toLowerCase().includes(query));

  const results = query.length < 2 ? [] : [
    ...transactions.filter(t => match(t.source, t.note, catById[t.categoryId]?.name)).map(t => ({
      tab: 'transactions', title: t.type === 'depense' ? (catById[t.categoryId]?.name || 'Dépense') : (t.source || 'Revenu'),
      subtitle: `Transaction · ${fmt(t.amount)} · ${t.date}`,
    })),
    ...debts.filter(d => match(d.name)).map(d => ({ tab: 'dettes', title: d.name, subtitle: `Dette · solde ${fmt(d.currentBalance)}` })),
    ...provisions.filter(p => match(p.name)).map(p => ({ tab: 'provisions', title: p.name, subtitle: 'Provision' })),
    ...decisions.filter(d => match(d.objet, d.note, d.pourquoi)).map(d => ({ tab: 'sagesse', title: d.objet, subtitle: `Décision · ${d.date}` })),
    ...journal.filter(j => match(j.texte, (j.tags||[]).join(' '))).map(j => ({ tab: 'sagesse', title: (j.texte||'').slice(0,50), subtitle: `Journal · ${j.date}` })),
    ...objectifs.filter(o => match(o.titre, o.description)).map(o => ({ tab: 'vision', title: o.titre, subtitle: `Objectif · ${o.statut}` })),
    ...lectures.filter(l => match(l.titre, l.auteur)).map(l => ({ tab: 'croissance', title: l.titre, subtitle: `Lecture${l.auteur ? ' · '+l.auteur : ''}` })),
    ...contacts.filter(c => match(c.nom, c.notes)).map(c => ({ tab: 'relations', title: c.nom, subtitle: 'Contact' })),
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, zIndex: 26, overflowY: 'auto' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Search size={18} />
        <input autoFocus placeholder="Rechercher : transaction, décision, contact, lecture…" value={q} onChange={e => setQ(e.target.value)}
          style={{ flex: 1, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14 }} />
        <IconBtn onClick={onClose} color="#fff"><X size={20} /></IconBtn>
      </div>
      <div style={{ padding: 16 }}>
        {query.length > 0 && query.length < 2 && <p style={{ fontSize: 12.5, color: C.fade }}>Continue à taper (2 caractères minimum)…</p>}
        {query.length >= 2 && results.length === 0 && <p style={{ fontSize: 12.5, color: C.fade }}>Aucun résultat pour « {q} ».</p>}
        <div style={{ display: 'grid', gap: 8 }}>
          {results.map((r, i) => (
            <Card key={i} style={{ cursor: 'pointer' }}>
              <div onClick={() => onNavigate(r.tab)}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: C.fade, marginTop: 2 }}>{r.subtitle}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Tab bar (minimal: Accueil · Intendance · Modules) ----------
function TabBar({ tab, setTab, onOpenModules }) {
  const items = [
    { id: 'dashboard', label: 'Accueil', icon: Home },
    { id: 'intendance', label: 'Intendance', icon: Gauge },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '10px 10px 12px', boxShadow: '0 -4px 14px rgba(11,47,78,0.04)' }}>
      {items.map(it => {
        const Icon = it.icon; const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <Icon size={19} strokeWidth={active ? 2.4 : 2} color={active ? C.gold : C.fade} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? C.navy : C.fade }}>{it.label}</span>
          </button>
        );
      })}
      <button onClick={onOpenModules} style={{
        width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
        background: `linear-gradient(155deg, ${C.gold} 0%, ${shade(C.gold, -18)} 100%)`,
        boxShadow: `0 4px 12px ${C.gold}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6,
      }}>
        <LayoutGrid size={20} color="#fff" />
      </button>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(defaultSettings());
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [provisions, setProvisions] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [journal, setJournal] = useState([]);
  const [disciplineLogs, setDisciplineLogs] = useState([]);
  const [visionDoc, setVisionDoc] = useState({});
  const [objectifs, setObjectifs] = useState([]);
  const [revues, setRevues] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [healthLogs, setHealthLogs] = useState([]);
  const [poidsLogs, setPoidsLogs] = useState([]);
  const [manualScores, setManualScores] = useState({});
  const [lectures, setLectures] = useState([]);
  const [lectureLogs, setLectureLogs] = useState([]);
  const [growthLogs, setGrowthLogs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [disciplineSubjects, setDisciplineSubjects] = useState([]);
  const [relationLogs, setRelationLogs] = useState([]);
  const [trash, setTrash] = useState([]);
  const [tab, setTabRaw] = useState('dashboard');
  const [prevTab, setPrevTab] = useState(null);
  function navigateTab(id) {
    if (id === tab) return;
    setPrevTab(tab);
    setTabRaw(id);
  }
  function goBack() {
    setTabRaw(prevTab || 'dashboard');
    setPrevTab(null);
  }
  useEffect(() => {
    const disabledModules = settings.disabledModules || [];
    const disabledCapitals = settings.disabledCapitals || [];
    const capOfTab = CAPITALS.find(c => c.modules.some(m => m.id === tab));
    const tabDisabled = disabledModules.includes(tab) || (capOfTab && disabledCapitals.includes(capOfTab.id));
    if (tabDisabled) navigateTab('dashboard');
  }, [settings.disabledModules, settings.disabledCapitals]);
  useEffect(() => { setCurrentCurrency(settings.currency || 'FCFA'); }, [settings.currency]);
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const mode = settings.theme || 'system';
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function resolve() { return mode === 'system' ? (mq && mq.matches ? 'dark' : 'light') : mode; }
    function refresh() { applyTheme(resolve()); setThemeTick(t => t + 1); document.body.style.background = C.bg; }
    refresh();
    if (mode === 'system' && mq) {
      mq.addEventListener ? mq.addEventListener('change', refresh) : mq.addListener(refresh);
      return () => { mq.removeEventListener ? mq.removeEventListener('change', refresh) : mq.removeListener(refresh); };
    }
  }, [settings.theme]);
  const [userEmail, setUserEmail] = useState('');
  const [savePending, setSavePending] = useState(0);
  useEffect(() => {
    function onStatus(e) { setSavePending(e.detail.pending); }
    window.addEventListener('eden-save-status', onStatus);
    return () => window.removeEventListener('eden-save-status', onStatus);
  }, []);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email || '')); }, []);
  const [showSettings, setShowSettings] = useState(false);
  const [showModules, setShowModules] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const now = new Date();
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    (async () => {
      try {
        const s = await window.storage.get('settings');
        if (s) {
          const loaded = JSON.parse(s.value);
          const migrated = {
            ...loaded,
            currency: loaded.currency || 'FCFA',
            exchangeRates: { ...DEFAULT_EXCHANGE_RATES, ...(loaded.exchangeRates || {}) },
            disciplines: (loaded.disciplines || []).map(d => {
              if (d.name === 'Prière' && d.monthlyTarget === 26) return { ...d, monthlyTarget: 30 };
              if (d.name === 'Jeûne' && d.monthlyTarget === 2) return { ...d, monthlyTarget: 4 };
              return d;
            }),
          };
          setSettings(migrated);
          setCurrentCurrency(migrated.currency);
        }
      } catch (e) {}
      try { const t = await window.storage.get('transactions'); setTransactions(t ? JSON.parse(t.value) : []); } catch (e) { setTransactions([]); }
      try { const d = await window.storage.get('debts'); setDebts(d ? JSON.parse(d.value) : []); } catch (e) { setDebts([]); }
      try { const p = await window.storage.get('provisions'); setProvisions(p ? JSON.parse(p.value) : []); } catch (e) { setProvisions([]); }
      try { const dc = await window.storage.get('decisions'); setDecisions(dc ? JSON.parse(dc.value) : []); } catch (e) { setDecisions([]); }
      try { const jr = await window.storage.get('journal'); setJournal(jr ? JSON.parse(jr.value) : []); } catch (e) { setJournal([]); }
      try { const dl = await window.storage.get('disciplineLogs'); setDisciplineLogs(dl ? JSON.parse(dl.value) : []); } catch (e) { setDisciplineLogs([]); }
      try { const vd = await window.storage.get('visionDoc'); setVisionDoc(vd ? JSON.parse(vd.value) : {}); } catch (e) { setVisionDoc({}); }
      try { const ob = await window.storage.get('objectifs'); setObjectifs(ob ? JSON.parse(ob.value) : []); } catch (e) { setObjectifs([]); }
      try { const rv = await window.storage.get('revues'); setRevues(rv ? JSON.parse(rv.value) : []); } catch (e) { setRevues([]); }
      try { const tl = await window.storage.get('timeLogs'); setTimeLogs(tl ? JSON.parse(tl.value) : []); } catch (e) { setTimeLogs([]); }
      try { const hl = await window.storage.get('healthLogs'); setHealthLogs(hl ? JSON.parse(hl.value) : []); } catch (e) { setHealthLogs([]); }
      try { const pl = await window.storage.get('poidsLogs'); setPoidsLogs(pl ? JSON.parse(pl.value) : []); } catch (e) { setPoidsLogs([]); }
      try { const ms = await window.storage.get('manualScores'); setManualScores(ms ? JSON.parse(ms.value) : {}); } catch (e) { setManualScores({}); }
      try { const lc = await window.storage.get('lectures'); setLectures(lc ? JSON.parse(lc.value) : []); } catch (e) { setLectures([]); }
      try { const ll = await window.storage.get('lectureLogs'); setLectureLogs(ll ? JSON.parse(ll.value) : []); } catch (e) { setLectureLogs([]); }
      try { const gl = await window.storage.get('growthLogs'); setGrowthLogs(gl ? JSON.parse(gl.value) : []); } catch (e) { setGrowthLogs([]); }
      try { const ct = await window.storage.get('contacts'); setContacts(ct ? JSON.parse(ct.value) : []); } catch (e) { setContacts([]); }
      try { const ds = await window.storage.get('disciplineSubjects'); setDisciplineSubjects(ds ? JSON.parse(ds.value) : []); } catch (e) { setDisciplineSubjects([]); }
      try { const rl = await window.storage.get('relationLogs'); setRelationLogs(rl ? JSON.parse(rl.value) : []); } catch (e) { setRelationLogs([]); }
      try {
        const tr = await window.storage.get('trash');
        const loaded = tr ? JSON.parse(tr.value) : [];
        const cutoff = Date.now() - 30 * 86400000;
        const kept = loaded.filter(t => new Date(t.deletedAt).getTime() >= cutoff);
        setTrash(kept);
        if (kept.length !== loaded.length) { try { await window.storage.set('trash', JSON.stringify(kept)); } catch (e) {} }
      } catch (e) { setTrash([]); }
      setLoading(false);
    })();
  }, []);

  async function saveSettings(next) {
    setSettings(next);
    try { await window.storage.set('settings', JSON.stringify(next)); } catch (e) { console.error(e); }
  }

  function exportData() {
    const data = {
      version: 1, exportedAt: new Date().toISOString(),
      settings, transactions, debts, provisions, decisions, journal, disciplineLogs, visionDoc,
      objectifs, revues, timeLogs, healthLogs, poidsLogs, manualScores, lectures, lectureLogs,
      growthLogs, contacts, disciplineSubjects, relationLogs, trash,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eden-os-sauvegarde-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const setters = {
        settings: setSettings, transactions: setTransactions, debts: setDebts, provisions: setProvisions,
        decisions: setDecisions, journal: setJournal, disciplineLogs: setDisciplineLogs, visionDoc: setVisionDoc,
        objectifs: setObjectifs, revues: setRevues, timeLogs: setTimeLogs, healthLogs: setHealthLogs,
        poidsLogs: setPoidsLogs, manualScores: setManualScores, lectures: setLectures, lectureLogs: setLectureLogs,
        growthLogs: setGrowthLogs, contacts: setContacts, disciplineSubjects: setDisciplineSubjects, relationLogs: setRelationLogs, trash: setTrash,
      };
      for (const key of Object.keys(setters)) {
        if (data[key] !== undefined) {
          setters[key](data[key]);
          try { await window.storage.set(key, JSON.stringify(data[key])); } catch (e) { console.error(e); }
        }
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  async function saveTransactions(next) {
    setTransactions(next);
    try { await window.storage.set('transactions', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveDebts(next) {
    setDebts(next);
    try { await window.storage.set('debts', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveProvisions(next) {
    setProvisions(next);
    try { await window.storage.set('provisions', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveDecisions(next) {
    setDecisions(next);
    try { await window.storage.set('decisions', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveJournal(next) {
    setJournal(next);
    try { await window.storage.set('journal', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveDisciplineLogs(next) {
    setDisciplineLogs(next);
    try { await window.storage.set('disciplineLogs', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveVisionDoc(next) {
    setVisionDoc(next);
    try { await window.storage.set('visionDoc', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveObjectifs(next) {
    setObjectifs(next);
    try { await window.storage.set('objectifs', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveRevues(next) {
    setRevues(next);
    try { await window.storage.set('revues', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveTimeLogs(next) {
    setTimeLogs(next);
    try { await window.storage.set('timeLogs', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveHealthLogs(next) {
    setHealthLogs(next);
    try { await window.storage.set('healthLogs', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function savePoidsLogs(next) {
    setPoidsLogs(next);
    try { await window.storage.set('poidsLogs', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveManualScores(next) {
    setManualScores(next);
    try { await window.storage.set('manualScores', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveLectures(next) {
    setLectures(next);
    try { await window.storage.set('lectures', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveLectureLogs(next) {
    setLectureLogs(next);
    try { await window.storage.set('lectureLogs', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveGrowthLogs(next) {
    setGrowthLogs(next);
    try { await window.storage.set('growthLogs', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveContacts(next) {
    setContacts(next);
    try { await window.storage.set('contacts', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveDisciplineSubjects(next) {
    setDisciplineSubjects(next);
    try { await window.storage.set('disciplineSubjects', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveRelationLogs(next) {
    setRelationLogs(next);
    try { await window.storage.set('relationLogs', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function saveTrash(next) {
    setTrash(next);
    try { await window.storage.set('trash', JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  function moveToTrash(type, item) {
    saveTrash([{ trashId: uid(), type, item, deletedAt: todayISO() }, ...trash]);
  }
  function restoreFromTrash(trashId) {
    const entry = trash.find(t => t.trashId === trashId);
    if (!entry) return;
    const { type, item } = entry;
    if (type === 'transaction') saveTransactions([item, ...transactions]);
    else if (type === 'debt') saveDebts([item, ...debts]);
    else if (type === 'provision') saveProvisions([item, ...provisions]);
    else if (type === 'decision') saveDecisions([item, ...decisions]);
    else if (type === 'journal') saveJournal([item, ...journal]);
    else if (type === 'objectif') saveObjectifs([item, ...objectifs]);
    else if (type === 'lecture') saveLectures([item, ...lectures]);
    else if (type === 'contact') saveContacts([item, ...contacts]);
    saveTrash(trash.filter(t => t.trashId !== trashId));
  }
  function purgeTrashItem(trashId) {
    saveTrash(trash.filter(t => t.trashId !== trashId));
  }
  function purgeAllTrash() {
    saveTrash([]);
  }
  async function changeCurrency(newCode, newUsdRate) {
    const fromCode = settings.currency || 'FCFA';
    if (fromCode === newCode) return;
    const rates = { ...(settings.exchangeRates || DEFAULT_EXCHANGE_RATES), USD: newUsdRate || (settings.exchangeRates || DEFAULT_EXCHANGE_RATES).USD };
    const conv = (v) => convertAmount(v, fromCode, newCode, rates);

    const nextTransactions = transactions.map(t => ({ ...t, amount: conv(t.amount) }));
    const nextDebts = debts.map(d => ({
      ...d,
      initialBalance: conv(d.initialBalance),
      currentBalance: conv(d.currentBalance),
      monthlyPayment: conv(d.monthlyPayment),
    }));
    const nextProvisions = provisions.map(p => ({
      ...p,
      annualAmount: p.annualAmount != null ? conv(p.annualAmount) : p.annualAmount,
      targetAmount: p.targetAmount != null ? conv(p.targetAmount) : p.targetAmount,
      reserveCurrent: conv(p.reserveCurrent),
    }));
    const nextSettings = {
      ...settings,
      currency: newCode,
      exchangeRates: rates,
      categories: settings.categories.map(c => ({ ...c, target: c.target != null ? conv(c.target) : c.target })),
    };

    await saveTransactions(nextTransactions);
    await saveDebts(nextDebts);
    await saveProvisions(nextProvisions);
    await saveSettings(nextSettings);
  }
  function addTransaction(tx) { saveTransactions([{ ...tx, id: uid() }, ...transactions]); }
  function updateTransaction(id, patch) { saveTransactions(transactions.map(t => t.id === id ? { ...t, ...patch } : t)); }
  function duplicateTransaction(t) { saveTransactions([{ ...t, id: uid(), date: todayISO() }, ...transactions]); }
  function deleteTransaction(id) {
    const item = transactions.find(t => t.id === id);
    saveTransactions(transactions.filter(t => t.id !== id));
    if (item) moveToTrash('transaction', item);
  }
  function prevMonth() { if (monthIdx === 0) { setMonthIdx(11); setYear(year - 1); } else setMonthIdx(monthIdx - 1); }
  function nextMonth() { if (monthIdx === 11) { setMonthIdx(0); setYear(year + 1); } else setMonthIdx(monthIdx + 1); }

  const monthTx = useMemo(() => transactions.filter(t => inMonth(t.date, monthIdx, year)), [transactions, monthIdx, year]);
  const revenuMois = useMemo(() => monthTx.filter(t=>t.type==='revenu').reduce((s,t)=>s+Number(t.amount||0),0), [monthTx]);
  const donsMois = useMemo(() => monthTx.filter(t=>t.type==='don').reduce((s,t)=>s+Number(t.amount||0),0), [monthTx]);
  const depensesMois = useMemo(() => monthTx.filter(t=>t.type==='depense').reduce((s,t)=>s+Number(t.amount||0),0), [monthTx]);
  const soldeMois = revenuMois - donsMois - depensesMois;
  const titheTypeIds = settings.donTypes.filter(d => d.isTithe).map(d => d.id);
  const dimeMois = useMemo(() => monthTx.filter(t=>t.type==='don' && titheTypeIds.includes(t.donTypeId)).reduce((s,t)=>s+Number(t.amount||0),0), [monthTx, settings.donTypes]);
  const tauxDime = revenuMois > 0 ? dimeMois / revenuMois : 0;

  const catById = Object.fromEntries(settings.categories.map(c => [c.id, c]));
  const groupTotals = useMemo(() => {
    const totals = {};
    settings.groups.forEach(g => { totals[g.id] = 0; });
    totals['g-royaume'] = donsMois;
    monthTx.filter(t => t.type === 'depense').forEach(t => {
      const cat = catById[t.categoryId];
      if (cat) totals[cat.groupId] = (totals[cat.groupId] || 0) + Number(t.amount || 0);
    });
    return totals;
  }, [monthTx, donsMois, settings]);
  const pieData = settings.groups.map(g => ({ name: g.name, value: groupTotals[g.id] || 0, color: g.color })).filter(d => d.value > 0);

  const comptesSoldes = useMemo(() => settings.comptes.map(c => {
    const rev = transactions.filter(t => t.compteId === c.id && t.type === 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
    const out = transactions.filter(t => t.compteId === c.id && t.type !== 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
    return { ...c, balance: rev - out };
  }), [transactions, settings.comptes]);

  const last6 = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, monthIdx - i, 1);
      const m = d.getMonth(), y = d.getFullYear();
      const tx = transactions.filter(t => inMonth(t.date, m, y));
      const rev = tx.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
      const dep = tx.filter(t => t.type !== 'revenu').reduce((s,t) => s + Number(t.amount||0), 0);
      arr.push({ mois: MONTHS_FR[m].slice(0,3), Revenus: rev, Dépenses: dep });
    }
    return arr;
  }, [transactions, monthIdx, year]);

  const indiceGlobal = useMemo(() => computeIndiceGlobal({
    settings, transactions, debts, timeLogs, healthLogs, decisions, objectifs, revues, monthIdx, year, manualScores,
  }), [settings, transactions, debts, timeLogs, healthLogs, decisions, objectifs, revues, monthIdx, year, manualScores]);

  if (loading) {
    return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: C.heading, fontFamily: FONT_DISPLAY }}>Chargement...</p></div>;
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', minHeight: '100vh', background: C.surface, boxShadow: '0 0 30px rgba(0,0,0,0.08)', position: 'relative', paddingBottom: 76 }}>
        {savePending > 0 && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 50, background: C.gold, color: '#fff',
            textAlign: 'center', fontSize: 11.5, fontWeight: 700, padding: '5px 0',
          }}>
            Enregistrement en cours… ne ferme pas l'application
          </div>
        )}
        <Header monthIdx={monthIdx} year={year} onPrev={prevMonth} onNext={nextMonth} tauxDime={tauxDime} onOpenSettings={() => setShowSettings(true)} onOpenSearch={() => setShowSearch(true)} showBack={tab !== 'dashboard'} onBack={goBack} />
        <div style={{ padding: '16px 16px 8px' }}>
          {tab === 'dashboard' && <Dashboard revenuMois={revenuMois} donsMois={donsMois} depensesMois={depensesMois} soldeMois={soldeMois} tauxDime={tauxDime} pieData={pieData} last6={last6} comptesSoldes={comptesSoldes} objectifZero={settings.objectifZero} indice={indiceGlobal} settings={settings} transactions={transactions} debts={debts} timeLogs={timeLogs} healthLogs={healthLogs} disciplineLogs={disciplineLogs} decisions={decisions} objectifs={objectifs} revues={revues} provisions={provisions} lectures={lectures} lectureLogs={lectureLogs} growthLogs={growthLogs} monthIdx={monthIdx} year={year} />}
          {tab === 'transactions' && <TransactionsTab settings={settings} monthTx={monthTx} addTransaction={addTransaction} updateTransaction={updateTransaction} duplicateTransaction={duplicateTransaction} deleteTransaction={deleteTransaction} groupTotals={groupTotals} debts={debts} saveDebts={saveDebts} provisions={provisions} saveProvisions={saveProvisions} />}
          {tab === 'royaume' && <RoyaumeTab settings={settings} transactions={transactions} addTransaction={addTransaction} updateTransaction={updateTransaction} duplicateTransaction={duplicateTransaction} deleteTransaction={deleteTransaction} year={year} disciplineLogs={disciplineLogs} saveDisciplineLogs={saveDisciplineLogs} disciplineSubjects={disciplineSubjects} saveDisciplineSubjects={saveDisciplineSubjects} />}
          {tab === 'provisions' && <ProvisionsTab settings={settings} provisions={provisions} saveProvisions={saveProvisions} monthIdx={monthIdx} onTrash={moveToTrash} />}
          {tab === 'dettes' && <DettesTab settings={settings} debts={debts} saveDebts={saveDebts} onTrash={moveToTrash} />}
          {tab === 'sagesse' && <SagesseTab decisions={decisions} saveDecisions={saveDecisions} journal={journal} saveJournal={saveJournal} onTrash={moveToTrash} />}
          {tab === 'vision' && <VisionTab visionDoc={visionDoc} saveVisionDoc={saveVisionDoc} objectifs={objectifs} saveObjectifs={saveObjectifs} revues={revues} saveRevues={saveRevues} onTrash={moveToTrash} />}
          {tab === 'temps' && <TempsTab settings={settings} timeLogs={timeLogs} saveTimeLogs={saveTimeLogs} />}
          {tab === 'sante' && <HealthTab settings={settings} healthLogs={healthLogs} saveHealthLogs={saveHealthLogs} poidsLogs={poidsLogs} savePoidsLogs={savePoidsLogs} />}
          {tab === 'croissance' && <CroissanceTab settings={settings} lectures={lectures} saveLectures={saveLectures} lectureLogs={lectureLogs} saveLectureLogs={saveLectureLogs} growthLogs={growthLogs} saveGrowthLogs={saveGrowthLogs} onTrash={moveToTrash} />}
          {tab === 'relations' && <RelationsTab settings={settings} contacts={contacts} saveContacts={saveContacts} relationLogs={relationLogs} saveRelationLogs={saveRelationLogs} onTrash={moveToTrash} />}
          {tab === 'intendance' && <IndiceIntendanceTab settings={settings} transactions={transactions} debts={debts} timeLogs={timeLogs} healthLogs={healthLogs} decisions={decisions} objectifs={objectifs} revues={revues} monthIdx={monthIdx} year={year} manualScores={manualScores} saveManualScores={saveManualScores} />}
        </div>
        <TabBar tab={tab} setTab={navigateTab} onOpenModules={() => setShowModules(true)} />
        {showSettings && <ParametresPanel settings={settings} saveSettings={saveSettings} onClose={() => setShowSettings(false)} onExport={exportData} onImport={importData} onChangeCurrency={changeCurrency} userEmail={userEmail} trash={trash} onRestore={restoreFromTrash} onPurgeOne={purgeTrashItem} onPurgeAll={purgeAllTrash} />}
        {showModules && <ModulesLauncher settings={settings} currentTab={tab} onSelect={(id) => { navigateTab(id); setShowModules(false); }} onClose={() => setShowModules(false)} />}
        {showSearch && <SearchPanel settings={settings} transactions={transactions} debts={debts} provisions={provisions} decisions={decisions} journal={journal} objectifs={objectifs} lectures={lectures} contacts={contacts} onNavigate={(id) => { navigateTab(id); setShowSearch(false); }} onClose={() => setShowSearch(false)} />}
      </div>
    </div>
  );
}
