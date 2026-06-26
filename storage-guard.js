(() => {
  'use strict';

  const BOLEIROS_KEYS = [
    'boleiros_save_v10',
    'boleiros_save_v9',
    'boleiros_save_v8',
    'boleiros_save_v7',
    'boleiros_save_v6',
    'boleiros_live_v6',
    'boleiros_ux_v5',
    'boleiros_ux_v4',
    'boleiros_ux_v3',
    'boleiros_v1'
  ];

  const ACTIVE_KEYS = new Set(['boleiros_save_v10', 'boleiros_save_v9', 'boleiros_save_v8']);
  const MAX_LOCAL_SAVE_CHARS = 2600000;

  function isQuotaError(error) {
    return error && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014 ||
      /quota/i.test(String(error.message || ''))
    );
  }

  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  function cleanLegacyAndOversized() {
    try {
      for (const key of BOLEIROS_KEYS) {
        const value = localStorage.getItem(key);
        if (!value) continue;
        if (!ACTIVE_KEYS.has(key) || value.length > MAX_LOCAL_SAVE_CHARS) {
          safeRemove(key);
        }
      }
    } catch {}
  }

  function buildEmergencySave(value) {
    try {
      const state = JSON.parse(value);
      return JSON.stringify({
        storageMode: 'compact-emergency',
        version: state.version || 0,
        week: state.week || 1,
        season: state.season || 1,
        phase: state.phase || 'temporada',
        user: state.user || null,
        finance: state.finance || null,
        career: state.career || null,
        tactics: state.tactics || null,
        training: state.training || null,
        matchMode: state.matchMode || 'tecnico',
        filters: state.filters || { position: 'Todos' },
        news: Array.isArray(state.news) ? state.news.slice(-12) : [],
        warning: 'Save compactado porque o navegador bloqueou armazenamento grande.'
      });
    } catch {
      return null;
    }
  }

  function showStorageWarning() {
    // Intentionally silent. The previous warning blocked the mobile UI.
    // The guard still protects the game from QuotaExceededError.
    try { sessionStorage.setItem('boleiros_storage_guard_used', '1'); } catch {}
  }

  function removeOldBlockingWarning() {
    try { document.querySelectorAll('[data-storage-warning]').forEach(node => node.remove()); } catch {}
  }

  cleanLegacyAndOversized();
  removeOldBlockingWarning();
  window.addEventListener('DOMContentLoaded', removeOldBlockingWarning);

  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    try {
      return originalSetItem.call(this, key, value);
    } catch (error) {
      if (!isQuotaError(error) || !String(key).startsWith('boleiros')) throw error;

      cleanLegacyAndOversized();
      removeOldBlockingWarning();

      try {
        return originalSetItem.call(this, key, value);
      } catch (secondError) {
        if (!isQuotaError(secondError)) throw secondError;
      }

      const compact = buildEmergencySave(value);
      if (compact) {
        try {
          originalSetItem.call(this, key, compact);
          showStorageWarning();
          return undefined;
        } catch {}
      }

      safeRemove(key);
      showStorageWarning();
      return undefined;
    }
  };
})();
