import React, { useState, useEffect, useMemo } from 'react';
import { Home, Receipt, HandCoins, CreditCard, PiggyBank, Settings as Gear, Plus, Trash2, ChevronLeft, ChevronRight, Check, X, BookOpen, Sparkles, Crown, Compass, Clock, HeartPulse, Gauge, GraduationCap, Users, LayoutGrid, Wallet, Download, Upload, Pencil, Copy } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { supabase } from './supabaseClient.js';

const C = {
  navy: '#0B2F4E', gold: '#C98A2B', goldLight: '#EFDBA8', cream: '#F7F3EA',
  ink: '#1F2421', green: '#2F6B3A', terracotta: '#B5482A', line: '#E5DFCC',
  purple: '#8A6FB0', gray: '#6B7280', fade: '#8C8474',
};
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
    { id: 'g-besoins', name: 'Besoins essentiels', color: C.navy },
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
    { id: uid(), name: 'Travail', color: C.navy, weeklyTarget: 40 },
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
  return { groups: g, categories: cats, donTypes, comptes, disciplines, timeCategories, healthMetrics, growthHabits, relationCategories, objectifZero: false, disabledCapitals: [], disabledModules: [], currency: 'FCFA', exchangeRates: { ...DEFAULT_EXCHANGE_RATES } };
}

// ---------- shared UI ----------
function Card({ children, style }) {
  return <div style={{
    background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: 14,
    boxShadow: '0 1px 2px rgba(11,47,78,0.04), 0 4px 14px rgba(11,47,78,0.05)',
    ...style,
  }}>{children}</div>;
}
function SectionTitle({ children, sub }) {
  return (
    <div style={{ margin: '4px 0 10px' }}>
      <h2 style={{ fontFamily: FONT_DISPLAY, color: C.navy, fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.2 }}>{children}</h2>
      <div style={{ width: 30, height: 2.5, background: `linear-gradient(90deg, ${C.gold} 0%, transparent 100%)`, borderRadius: 2, margin: '5px 0' }} />
      {sub && <p style={{ fontSize: 11, color: C.fade, margin: 0 }}>{sub}</p>}
    </div>
  );
}
function TextInput(props) {
  return <input {...props} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 10px', fontSize: 14, fontFamily: 'inherit', color: C.ink, ...(props.style||{}) }} />;
}
function Select(props) {
  return <select {...props} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 10px', fontSize: 14, fontFamily: 'inherit', color: C.ink, background: '#fff', ...(props.style||{}) }} />;
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
function Watermark({ Icon, size = 90, top = -18, right = -18, opacity = 0.08, color = '#fff' }) {
  return (
    <Icon size={size} color={color} style={{ position: 'absolute', top, right, opacity, pointerEvents: 'none' }} />
  );
}

// ---------- Header ----------
function Header({ monthIdx, year, onPrev, onNext, tauxDime, onOpenSettings, showBack, onBack }) {
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
          <button onClick={onOpenSettings} style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, padding: 8, color: '#fff', cursor: 'pointer' }}>
            <Gear size={17} />
          </button>
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
          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>Mode Objectif Zéro actif</div>
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
            <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.navy }}>{fmt(c.balance)}</span>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Répartition (mois en cours)</div>
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
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Revenus vs dépenses — 6 mois</div>
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
function TransactionsTab({ settings, monthTx, addTransaction, updateTransaction, duplicateTransaction, deleteTransaction, groupTotals }) {
  const [kind, setKind] = useState('revenu');
  const [categoryId, setCategoryId] = useState(settings.categories[0]?.id || '');
  const [compteId, setCompteId] = useState(settings.comptes[0]?.id || '');
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState(null);

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
    if (editingId) updateTransaction(editingId, payload);
    else addTransaction(payload);
    resetForm();
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
            {editingId && <button onClick={resetForm} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>}
          </div>
        </div>
      </Card>

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
                {editingId && <button onClick={resetForm} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>}
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
              const sujetsOuverts = expandedDiscId === d.id;
              const nEnAttente = disciplineSubjects.filter(s => s.disciplineId === d.id && s.statut === 'attente').length;
              return (
                <Card key={d.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{d.name}</span>
                    <span style={{ fontSize: 12, color: C.fade }}>{total} / {d.monthlyTarget} {d.unit}</span>
                  </div>
                  <div style={{ height: 7, background: C.line, borderRadius: 8, marginTop: 8, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                    <div style={{ height: '100%', width: `${progress*100}%`, background: C.gold }} />
                  </div>

                  {entryType === 'compteur' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <TextInput type="number" placeholder="Valeur du jour" value={logValue[d.id] || ''} onChange={e => setLogValue({ ...logValue, [d.id]: e.target.value })} style={{ flex: 1 }} />
                      <button onClick={() => logToday(d.id)} style={{ background: C.gold, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Ajouter</button>
                    </div>
                  )}

                  {entryType === 'sujets' && (
                    <>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                        <TextInput type="number" placeholder="Jours de prière (régularité)" value={logValue[d.id] || ''} onChange={e => setLogValue({ ...logValue, [d.id]: e.target.value })} style={{ flex: 1 }} />
                        <button onClick={() => logToday(d.id)} style={{ background: C.gold, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Ajouter</button>
                      </div>
                      <button onClick={() => setExpandedDiscId(sujetsOuverts ? null : d.id)} style={{ marginTop: 8, background: 'none', border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                        {sujetsOuverts ? '▾ Masquer les sujets de prière' : `▸ Sujets de prière${nEnAttente ? ` (${nEnAttente} en attente)` : ''}`}
                      </button>
                      {sujetsOuverts && <SujetsManager discipline={d} disciplineSubjects={disciplineSubjects} saveDisciplineSubjects={saveDisciplineSubjects} />}
                    </>
                  )}

                  {entryType === 'notes' && (
                    <NotesJournal discipline={d} disciplineLogs={disciplineLogs} saveDisciplineLogs={saveDisciplineLogs} />
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
          <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4 }}>En attente ({enAttente.length})</div>
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
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <TextInput placeholder={`${discipline.unit} aujourd'hui`} type="number" value={val} onChange={e => setVal(e.target.value)} style={{ maxWidth: 110 }} />
        <TextInput placeholder="Note : passage, réflexion, ce qui a marqué…" value={note} onChange={e => setNote(e.target.value)} style={{ flex: 1 }} />
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

function ProvisionsTab({ settings, provisions, saveProvisions, monthIdx }) {
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
    saveProvisions(provisions.filter(p => p.id !== id));
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
            {editingId && <button onClick={resetForm} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>}
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
function DettesTab({ settings, debts, saveDebts }) {
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
  function removeDebt(id) { saveDebts(debts.filter(d => d.id !== id)); if (editingId === id) resetForm(); }

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
            {editingId && <button onClick={resetForm} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler</button>}
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
function SagesseTab({ decisions, saveDecisions, journal, saveJournal }) {
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
  function removeDecision(id) { saveDecisions(decisions.filter(d => d.id !== id)); if (editingId === id) resetForm(); }
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
  function removeJournalEntry(id) { saveJournal(journal.filter(j => j.id !== id)); }

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
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: 'flex', alignItems: 'center', gap: 6 }}>
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
              {editingId && <button onClick={resetForm} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: C.ink }}>Annuler la modification</button>}
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

function VisionTab({ visionDoc, saveVisionDoc, objectifs, saveObjectifs, revues, saveRevues }) {
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
  function removeObjectif(id) { saveObjectifs(objectifs.filter(o => o.id !== id)); if (editingObjId === id) resetObjForm(); }

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
              <TextInput type="date" place
