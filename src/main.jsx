import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// ---------------------------------------------------------------
// localStorage shim exposing the same window.storage API used
// throughout App.jsx, so the app code did not need to change.
// Prefixes every key to avoid collisions with other sites' data.
// ---------------------------------------------------------------
const PREFIX = 'intendance:';

window.storage = {
  async get(key) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) throw new Error('Key not found: ' + key);
    return { key, value: raw, shared: false };
  },
  async set(key, value) {
    localStorage.setItem(PREFIX + key, value);
    return { key, value, shared: false };
  },
  async delete(key) {
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: true, shared: false };
  },
  async list(prefix) {
    const keys = Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX + (prefix || '')))
      .map((k) => k.slice(PREFIX.length));
    return { keys, prefix, shared: false };
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
