import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { supabase } from './supabaseClient.js';

// ---------------------------------------------------------------
// window.storage backed by Supabase (table app_data, RLS scoped
// to auth.uid()). Preloads all rows for the signed-in user once,
// then serves get/set/list from an in-memory cache kept in sync.
// Keys in SHARED_KEYS are routed to foyer_data (shared with a
// household partner) instead of app_data, whenever the user
// belongs to a foyer.
// ---------------------------------------------------------------
const SHARED_KEYS = new Set(['transactions', 'debts', 'provisions', 'objectifs', 'revues']);

function notifySaveStatus(pending) {
  window.dispatchEvent(new CustomEvent('eden-save-status', { detail: { pending } }));
}

function buildStorage(userId, foyerId) {
  const cache = new Map();
  let pending = 0;
  function target(key) {
    return (foyerId && SHARED_KEYS.has(key))
      ? { table: 'foyer_data', col: 'foyer_id', id: foyerId }
      : { table: 'app_data', col: 'user_id', id: userId };
  }
  return {
    async _preload() {
      const { data: personal, error: e1 } = await supabase.from('app_data').select('key,value').eq('user_id', userId);
      if (e1) { window.alert('Erreur de chargement des données : ' + e1.message); throw e1; }
      (personal || []).forEach(row => cache.set(row.key, row.value));
      if (foyerId) {
        const { data: shared, error: e2 } = await supabase.from('foyer_data').select('key,value').eq('foyer_id', foyerId);
        if (e2) { window.alert('Erreur de chargement des données du foyer : ' + e2.message); throw e2; }
        (shared || []).forEach(row => cache.set(row.key, row.value));
      }
    },
    async get(key) {
      if (!cache.has(key)) throw new Error('Key not found: ' + key);
      return { key, value: JSON.stringify(cache.get(key)), shared: false };
    },
    async set(key, value) {
      const parsed = JSON.parse(value);
      cache.set(key, parsed);
      pending++; notifySaveStatus(pending);
      try {
        const t = target(key);
        const row = { [t.col]: t.id, key, value: parsed, updated_at: new Date().toISOString() };
        const { error } = await supabase.from(t.table).upsert(row, { onConflict: `${t.col},key` });
        if (error) { console.error('Supabase set error:', error); window.alert('Erreur de sauvegarde (' + key + ') : ' + error.message); }
      } finally {
        pending--; notifySaveStatus(pending);
      }
      return { key, value, shared: false };
    },
    async delete(key) {
      cache.delete(key);
      const t = target(key);
      const { error } = await supabase.from(t.table).delete().eq(t.col, t.id).eq('key', key);
      if (error) console.error('Supabase delete error:', error);
      return { key, deleted: true, shared: false };
    },
    async list(prefix) {
      const keys = Array.from(cache.keys()).filter(k => k.startsWith(prefix || ''));
      return { keys, prefix, shared: false };
    },
  };
}

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setInfo("Compte créé. Vérifie ta boîte mail pour confirmer, puis connecte-toi.");
          setMode('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B2F4E', fontFamily: 'system-ui, -apple-system, sans-serif', padding: 20 }}>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0B2F4E', marginBottom: 4 }}>Eden OS</h1>
        <p style={{ fontSize: 13, color: '#5B6672', marginBottom: 20 }}>{mode === 'login' ? 'Connecte-toi à ton compte' : 'Crée ton compte'}</p>
        <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 8, border: '1px solid #D8D2C4', marginBottom: 10, fontSize: 15 }} />
        <input type="password" required minLength={6} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 8, border: '1px solid #D8D2C4', marginBottom: 14, fontSize: 15 }} />
        {error && <div style={{ color: '#B4553E', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {info && <div style={{ color: '#3E7A4C', fontSize: 13, marginBottom: 12 }}>{info}</div>}
        <button type="submit" disabled={busy} style={{ width: '100%', background: '#C98A2B', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 12 }}>
          {busy ? 'Patiente…' : (mode === 'login' ? 'Se connecter' : "Créer mon compte")}
        </button>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#5B6672' }}>
          {mode === 'login' ? (
            <>Pas encore de compte ? <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setError(''); setInfo(''); }} style={{ color: '#0B2F4E', fontWeight: 700 }}>Créer un compte</a></>
          ) : (
            <>Déjà un compte ? <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setError(''); setInfo(''); }} style={{ color: '#0B2F4E', fontWeight: 700 }}>Se connecter</a></>
          )}
        </div>
      </form>
    </div>
  );
}

function Loading(text) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B6672', fontFamily: 'system-ui, sans-serif' }}>{text}</div>;
}

function Root() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setReady(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      (async () => {
        let foyerId = null;
        try {
          const { data } = await supabase.rpc('my_foyer');
          foyerId = (data && data[0] && data[0].foyer_id) || null;
        } catch (e) { /* pas de foyer, ou table pas encore migrée — on continue en mode personnel */ }
        window.storage = buildStorage(session.user.id, foyerId);
        window.storage._preload().then(() => setReady(true));
      })();
    }
  }, [session]);

  if (session === undefined) return Loading('Chargement…');
  if (!session) return <AuthScreen />;
  if (!ready) return Loading('Chargement de tes données…');

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
