// Zero-dependency DOM & HTMLMediaElement Mock for testing

class MockEventTarget {
  constructor() {
    this._listeners = new Map();
  }

  addEventListener(type, listener, options) {
    if (typeof listener !== 'function') return;
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    const list = this._listeners.get(type);
    if (!list.some(item => item.listener === listener)) {
      list.push({ listener, once: options?.once === true });
    }
  }

  removeEventListener(type, listener) {
    if (!this._listeners.has(type)) return;
    const list = this._listeners.get(type).filter(item => item.listener !== listener);
    this._listeners.set(type, list);
  }

  dispatchEvent(event) {
    if (!event) return true;
    const type = event.type;
    try {
      Object.defineProperty(event, 'target', { value: this, configurable: true });
    } catch (e) {}
    if (!this._listeners.has(type)) return true;

    const list = [...this._listeners.get(type)];
    for (const item of list) {
      if (item.once) {
        this.removeEventListener(type, item.listener);
      }
      try {
        item.listener.call(this, event);
      } catch (e) {
        console.error(`Mock event error on ${type}:`, e);
      }
    }
    return !event.defaultPrevented;
  }
}

class MockElement extends MockEventTarget {
  constructor(tagName) {
    super();
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.className = '';
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.classList = {
      _classes: new Set(),
      add: (...names) => names.forEach(n => this.classList._classes.add(n)),
      remove: (...names) => names.forEach(n => this.classList._classes.delete(n)),
      contains: (name) => this.classList._classes.has(name),
      toggle: (name, force) => {
        if (force === true) {
          this.classList._classes.add(name);
          return true;
        } else if (force === false) {
          this.classList._classes.delete(name);
          return false;
        }
        if (this.classList._classes.has(name)) {
          this.classList._classes.delete(name);
          return false;
        } else {
          this.classList._classes.add(name);
          return true;
        }
      }
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
    if (name === 'class') this.className = String(value);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'id') this.id = '';
    if (name === 'class') this.className = '';
  }

  appendChild(child) {
    if (child) {
      child.parentNode = this;
      this.children.push(child);
    }
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      if (this.id === id) return this;
      for (const c of this.children) {
        const found = c.querySelector(selector);
        if (found) return found;
      }
    }
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      if (this.classList.contains(cls) || this.className.includes(cls)) return this;
      for (const c of this.children) {
        const found = c.querySelector(selector);
        if (found) return found;
      }
    }
    const tag = selector.toUpperCase();
    if (this.tagName === tag) return this;
    for (const c of this.children) {
      const found = c.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    const check = (node) => {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        if (node.classList?.contains(cls) || node.className?.includes(cls)) results.push(node);
      } else if (selector.startsWith('#')) {
        const id = selector.slice(1);
        if (node.id === id) results.push(node);
      } else if (node.tagName === selector.toUpperCase()) {
        results.push(node);
      }
      for (const c of node.children || []) {
        check(c);
      }
    };
    check(this);
    return results;
  }
}

export class MockMediaElement extends MockElement {
  constructor(tagName) {
    super(tagName);
    this._currentTime = 0;
    this._duration = 300;
    this._playbackRate = 1.0;
    this._paused = true;
    this._muted = false;
    this._volume = 1.0;
    this._src = '';
    this.seeking = false;
    this.error = null;
  }

  get currentTime() { return this._currentTime; }
  set currentTime(v) {
    const prev = this._currentTime;
    this._currentTime = Number(v) || 0;
    this.seeking = true;
    this.dispatchEvent(new Event('seeking'));
    this.seeking = false;
    this.dispatchEvent(new Event('seeked'));
    this.dispatchEvent(new Event('timeupdate'));
  }

  get duration() { return this._duration; }
  set duration(v) { this._duration = Number(v); }

  get playbackRate() { return this._playbackRate; }
  set playbackRate(v) {
    this._playbackRate = Number(v) || 1.0;
    this.dispatchEvent(new Event('ratechange'));
  }

  get paused() { return this._paused; }

  get muted() { return this._muted; }
  set muted(v) {
    this._muted = Boolean(v);
    this.dispatchEvent(new Event('volumechange'));
  }

  get volume() { return this._volume; }
  set volume(v) {
    this._volume = Math.max(0, Math.min(1, Number(v) || 0));
    this.dispatchEvent(new Event('volumechange'));
  }

  get src() { return this._src; }
  set src(v) {
    this._src = String(v || '');
    this.dispatchEvent(new Event('loadstart'));
  }

  play() {
    this._paused = false;
    this.dispatchEvent(new Event('play'));
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  }

  pause() {
    this._paused = true;
    this.dispatchEvent(new Event('pause'));
  }

  load() {
    this.dispatchEvent(new Event('loadstart'));
  }
}

class MockStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
  get length() { return this.map.size; }
  key(index) { return Array.from(this.map.keys())[index] || null; }
}

export function createMockDom() {
  const root = new MockElement('HTML');
  const body = new MockElement('BODY');
  root.appendChild(body);

  const document = new MockEventTarget();
  document.documentElement = root;
  document.body = body;
  document.hidden = false;
  document.visibilityState = 'visible';

  document.createElement = (tag) => {
    const t = tag.toUpperCase();
    if (t === 'VIDEO' || t === 'AUDIO') {
      return new MockMediaElement(t);
    }
    return new MockElement(t);
  };

  document.getElementById = (id) => root.querySelector(`#${id}`);
  document.querySelector = (sel) => root.querySelector(sel);
  document.querySelectorAll = (sel) => root.querySelectorAll(sel);

  const window = new MockEventTarget();
  window.document = document;
  window.location = {
    href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    search: '?v=dQw4w9WgXcQ',
    hostname: 'www.youtube.com',
  };
  window.localStorage = new MockStorage();
  window.sessionStorage = new MockStorage();
  window.Event = Event;
  window.CustomEvent = CustomEvent;
  window.postMessage = (data, targetOrigin) => {
    window.dispatchEvent(new MessageEvent('message', { data, source: window }));
  };

  return { document, window, body, root };
}
