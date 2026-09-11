// Zero-dependency Chrome Extension Manifest V3 Mock for testing

class MockStorageArea {
  constructor() {
    this.data = new Map();
  }

  async get(keys) {
    if (!keys) {
      return Object.fromEntries(this.data);
    }
    if (typeof keys === 'string') {
      return { [keys]: this.data.get(keys) };
    }
    if (Array.isArray(keys)) {
      const result = {};
      for (const k of keys) {
        if (this.data.has(k)) {
          result[k] = this.data.get(k);
        }
      }
      return result;
    }
    if (typeof keys === 'object') {
      const result = { ...keys };
      for (const k of Object.keys(keys)) {
        if (this.data.has(k)) {
          result[k] = this.data.get(k);
        }
      }
      return result;
    }
    return {};
  }

  async set(items) {
    if (items && typeof items === 'object') {
      for (const [k, v] of Object.entries(items)) {
        this.data.set(k, v);
      }
    }
  }

  async remove(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      this.data.delete(k);
    }
  }

  async clear() {
    this.data.clear();
  }
}

class MockListenerList {
  constructor() {
    this.listeners = [];
  }

  addListener(fn) {
    if (typeof fn === 'function' && !this.listeners.includes(fn)) {
      this.listeners.push(fn);
    }
  }

  removeListener(fn) {
    this.listeners = this.listeners.filter(l => l !== fn);
  }

  hasListener(fn) {
    return this.listeners.includes(fn);
  }

  dispatch(...args) {
    for (const fn of [...this.listeners]) {
      try {
        fn(...args);
      } catch (e) {
        console.error('Mock listener error:', e);
      }
    }
  }
}

export function createMockChrome() {
  const localStorage = new MockStorageArea();
  const sessionStorage = new MockStorageArea();
  const runtimeMessageListeners = new MockListenerList();
  const tabActivatedListeners = new MockListenerList();
  const storageChangedListeners = new MockListenerList();
  const alarmListeners = new MockListenerList();
  const sessionRules = [];

  const mock = {
    runtime: {
      lastError: null,
      getManifest: () => ({ version: '0.1.5', name: 'YTSpoofingStream' }),
      onMessage: runtimeMessageListeners,
      sendMessage(msg, callback) {
        let responded = false;
        const sendResponse = (res) => {
          responded = true;
          if (typeof callback === 'function') callback(res);
        };
        for (const listener of runtimeMessageListeners.listeners) {
          const result = listener(msg, { id: 'test-tab' }, sendResponse);
          if (result === true) {
            // async response handler
          }
        }
        if (!responded && typeof callback === 'function') {
          queueMicrotask(() => {
            if (!responded) callback(null);
          });
        }
        return Promise.resolve();
      },
      reload() {},
      onInstalled: new MockListenerList(),
      onStartup: new MockListenerList(),
    },
    storage: {
      local: localStorage,
      session: sessionStorage,
      onChanged: storageChangedListeners,
    },
    tabs: {
      query: async (queryInfo, callback) => {
        const tabs = [{ id: 1, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', active: true }];
        if (typeof callback === 'function') callback(tabs);
        return tabs;
      },
      get: async (tabId) => ({
        id: tabId,
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        active: true,
      }),
      sendMessage: async (tabId, msg, callback) => {
        if (typeof callback === 'function') callback({ success: true });
        return { success: true };
      },
      reload: async () => {},
      onActivated: tabActivatedListeners,
    },
    scripting: {
      executeScript: async ({ target, func, args }, callback) => {
        let res = null;
        if (typeof func === 'function') {
          res = func(...(args || []));
        }
        const results = [{ result: res }];
        if (typeof callback === 'function') callback(results);
        return results;
      },
    },
    declarativeNetRequest: {
      getSessionRules: async () => [...sessionRules],
      updateSessionRules: async ({ addRules = [], removeRuleIds = [] }) => {
        for (const id of removeRuleIds) {
          const idx = sessionRules.findIndex(r => r.id === id);
          if (idx !== -1) sessionRules.splice(idx, 1);
        }
        for (const rule of addRules) {
          sessionRules.push(rule);
        }
      },
    },
    cookies: {
      get: async ({ url, name }) => null,
    },
    alarms: {
      create: (name, alarmInfo) => {},
      onAlarm: alarmListeners,
    },
  };

  return mock;
}
