// YTSpoofingStream v0.1.6 — Popup Controller (Studio 774 Dual-Stream Engine)
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const log = (msg) => console.log('[YTSS Popup]', msg);

  // ─── TRANSLATION DICTIONARY ───────────────────────────────────────
  const I18N = {
    vi: {
      hdr_ver: 'v0.1.6 &bull; Engine Luồng Kép Studio 774',
      enable_ext: 'Kích hoạt Extension',
      sec_opmode: 'Chế độ hoạt động',
      mode_hybrid_name: 'Chế độ: Hybrid Mix (774 Opus ★)',
      badge_recommended: 'Khuyên dùng',
      mode_hybrid_desc: 'Khớp chuẩn video • Thu nhận Opus 280k+ chuẩn từ YTM & TV • Hủy nếu không có 774',
      mode_ytm_name: 'Chỉ thu nhận từ YTM (774 Opus ★)',
      badge_direct_hq: 'Trực tiếp HQ',
      mode_ytm_desc: 'Khớp chuẩn video • HTTPS trực tiếp Opus 774 từ YouTube Music • Hủy nếu không có 774',
      mode_tv_name: 'Chỉ chuyển tiếp Smart TV (774 Opus ★)',
      badge_tv: 'TV Premium',
      mode_tv_desc: 'Khớp chuẩn video • Cần đăng nhập TV Premium • Chuyển tiếp giải mã 774 • Hủy nếu không có 774',
      sec_controls: 'Điều khiển',
      ctrl_autoreload: 'Tự động tải lại trang khi thay đổi',
      ctrl_stats_title: 'Ghi đè Thống kê chi tiết (Giả lập 774)',
      ctrl_stats_desc: 'Hiển thị thông số Opus 774 trong Thống kê chi tiết của trình phát',
      sec_status: 'Trạng thái',
      st_active: 'Hoạt động',
      st_inactive: 'Không hoạt động',
      st_disabled: 'Đã tắt',
      info_mode: 'Chế độ',
      info_method: 'Phương thức hoạt động',
      info_streams: 'Luồng phát',
      info_audio: 'Âm thanh kích hoạt',
      sec_actions: 'Thao tác',
      btn_refresh: '↻ Tải lại trang',
      btn_reload: '⟳ Tải lại',
      sec_tv_auth: 'Đăng nhập TVHTML5',
      tv_status_checking: 'Trạng thái: Đang kiểm tra...',
      tv_status_logged_in: 'Trạng thái: Đã đăng nhập ({name} đã xác thực)',
      tv_status_not_logged_in: 'Trạng thái: Chưa đăng nhập',
      tv_status_waiting: 'Trạng thái: Đang chờ bạn kích hoạt...',
      tv_status_error: 'Trạng thái: Lỗi - {error}',
      tv_enter_code: 'Nhập mã tại',
      btn_tv_login: 'Đăng nhập TV',
      btn_tv_logout: 'Đăng xuất',
      tv_loading: 'Đang tải...',
      method_fallback: 'CHUYỂN VỀ GỐC',
      method_active_suffix: '(Đang phát)',
      method_original: 'Âm thanh gốc',
      sw_active: 'SW: v{version} Hoạt động',
      sw_offline: 'SW: Ngoại tuyến (Cần tải lại)',
    },
    en: {
      hdr_ver: 'v0.1.6 &bull; Studio 774 Dual-Stream Engine',
      enable_ext: 'Enable Extension',
      sec_opmode: 'Operation Mode',
      mode_hybrid_name: 'Mode: Hybrid Mix (774 Opus ★)',
      badge_recommended: 'Recommended',
      mode_hybrid_desc: 'Strict exact video • Harvests genuine Opus 280k+ from YTM & TV • Cancels if no 774',
      mode_ytm_name: 'YTM Harvester Only (774 Opus ★)',
      badge_direct_hq: 'Direct HQ',
      mode_ytm_desc: 'Strict exact video • Direct HTTPS Opus 774 from YouTube Music • Cancels if no 774',
      mode_tv_name: 'Smart TV Relay Only (774 Opus ★)',
      badge_tv: 'TV Premium',
      mode_tv_desc: 'Strict exact video • Requires TV Premium login • Deciphered 774 relay • Cancels if no 774',
      sec_controls: 'Controls',
      ctrl_autoreload: 'Auto-reload page on change',
      ctrl_stats_title: 'Stats for Nerds Override (774 Spoof)',
      ctrl_stats_desc: 'Display Opus 774 metrics in player Stats for Nerds',
      sec_status: 'Status',
      st_active: 'Active',
      st_inactive: 'Inactive',
      st_disabled: 'Disabled',
      info_mode: 'Mode',
      info_method: 'Active Method',
      info_streams: 'Streams',
      info_audio: 'Active Audio',
      sec_actions: 'Actions',
      btn_refresh: '↻ Refresh Page',
      btn_reload: '⟳ Reload',
      sec_tv_auth: 'TVHTML5 Login',
      tv_status_checking: 'Status: Checking...',
      tv_status_logged_in: 'Status: Logged In ({name} Authenticated)',
      tv_status_not_logged_in: 'Status: Not Logged In',
      tv_status_waiting: 'Status: Waiting for you to activate...',
      tv_status_error: 'Status: Error - {error}',
      tv_enter_code: 'Enter code at',
      btn_tv_login: 'Login to TV',
      btn_tv_logout: 'Logout',
      tv_loading: 'Loading...',
      method_fallback: 'FALLBACK TO ORIGINAL',
      method_active_suffix: '(Active)',
      method_original: 'Original',
      sw_active: 'SW: v{version} Active',
      sw_offline: 'SW: Offline (Reload required)',
    }
  };

  // ─── SETTINGS ────────────────────────────────────────────────────
  const KEYS = {
    enabled: '#en',
    autoReload: '#ar',
    shadowPlayer: '#sp',
  };

  let settings = {
    enabled: true,
    autoReload: true,
    operationMode: 'HYBRID_HQ',
    shadowPlayer: true,
    shadowVolume: 1.0,
    lang: 'vi',
  };

  const SETTING_KEYS = Object.keys(settings);

  function pickSettings(data) {
    const out = {};
    if (!data) return out;
    for (const key of SETTING_KEYS) {
      if (data[key] !== undefined) out[key] = data[key];
    }
    return out;
  }

  function t(key, vars = {}) {
    const lang = settings.lang || 'vi';
    let str = I18N[lang]?.[key] || I18N.en?.[key] || key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return str;
  }

  function applyLanguage() {
    const lang = settings.lang || 'vi';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (I18N[lang] && I18N[lang][key]) {
        el.innerHTML = I18N[lang][key];
      }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    if (typeof refreshAuthStatus === 'function') {
      refreshAuthStatus();
    }
  }

  // Load from chrome.storage
  chrome.storage.local.get(SETTING_KEYS, (data) => {
    if (data && Object.keys(data).length > 0) {
      Object.assign(settings, pickSettings(data));
      if (settings.operationMode === 'SAFE_NATIVE') {
        settings.operationMode = 'HYBRID_HQ';
        chrome.storage.local.set({ operationMode: 'HYBRID_HQ' });
      }
    } else {
      loadLegacy();
    }
    applyUI();
    log(`Settings loaded. OpMode: ${settings.operationMode}, Lang: ${settings.lang}`);
  });

  // Listen to remote changes (e.g. In-Player HUD in YouTube tab)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      let updated = false;
      for (const key of SETTING_KEYS) {
        if (changes[key] && changes[key].newValue !== undefined) {
          settings[key] = changes[key].newValue;
          updated = true;
        }
      }
      if (updated) {
        applyUI();
      }
    }
  });

  function loadLegacy() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => localStorage.getItem('ytss_settings'),
      }, (results) => {
        if (results?.[0]?.result) {
          try {
            Object.assign(settings, pickSettings(JSON.parse(results[0].result)));
            if (settings.operationMode === 'SAFE_NATIVE') {
              settings.operationMode = 'HYBRID_HQ';
            }
            chrome.storage.local.set(settings);
            applyUI();
          } catch (e) { }
        }
      });
    });
  }

  function applyUI() {
    applyLanguage();

    for (const [key, sel] of Object.entries(KEYS)) {
      const el = $(sel);
      if (el) el.checked = !!settings[key];
    }

    const activeOpMode = (settings.operationMode === 'SAFE_NATIVE' || !settings.operationMode) ? 'HYBRID_HQ' : settings.operationMode;
    document.querySelectorAll('.op-mode').forEach(m => {
      const isActive = m.dataset.opmode === activeOpMode;
      m.classList.toggle('active', isActive);
      const radio = m.querySelector('input');
      if (radio) radio.checked = isActive;
    });

    const isEnabled = !!settings.enabled;
    const wrapper = $('#mainContentWrapper');
    if (wrapper) {
      wrapper.classList.toggle('disabled-ui', !isEnabled);
    }
    const stText = $('#stText');
    const stBadge = $('#stBadge');
    if (!isEnabled) {
      if (stText) stText.textContent = t('st_disabled');
      if (stBadge) {
        stBadge.style.background = 'rgba(120, 120, 120, 0.2)';
        stBadge.style.color = '#aaa';
      }
    }
  }

  function save(shouldReload = true) {
    if ($('#en')) settings.enabled = $('#en').checked;
    if ($('#ar')) settings.autoReload = $('#ar').checked;
    if ($('#sp')) settings.shadowPlayer = $('#sp').checked;

    applyUI();
    chrome.storage.local.set(settings);
    log(`Settings saved. OpMode: ${settings.operationMode}, Lang: ${settings.lang}, StatsOverride: ${settings.shadowPlayer}`);

    // Send settings to content script and trigger reload if autoReload enabled and shouldReload is true
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      const tabId = tabs[0].id;

      chrome.scripting.executeScript({
        target: { tabId },
        func: (s, reload) => {
          localStorage.setItem('ytss_settings', JSON.stringify(s));
          localStorage.setItem('ytSpoofingStream_settings', JSON.stringify(s));
          if (window.YTSS_SpoofingMethods && typeof window.YTSS_SpoofingMethods.applySettings === 'function') {
            window.YTSS_SpoofingMethods.applySettings(s, reload);
          } else {
            window.postMessage({ type: 'YTSpoofingStream_settingsUpdate', settings: s }, '*');
            if (reload && s.autoReload && window.location.href.includes('youtube.com')) {
              window.location.reload();
            }
          }
        },
        args: [settings, shouldReload],
      }, () => {
        if (shouldReload && settings.autoReload && /youtube\.com/.test(tabs[0].url || '')) {
          log('Config applied — reloading YouTube page...');
        }
      });
    });
  }

  // ─── CLIENT OAUTH HANDLERS ─────────────────────────────────────────
  let refreshAuthStatus = null;

  function setupAuthControl(clientKey, statusElId, codeContId, codeElId, loginBtnId, logoutBtnId, labelName) {
    let lastAuthState = { isAuth: false, error: null, waiting: false };

    function renderStatus() {
      const statusEl = $(statusElId);
      const loginBtn = $(loginBtnId);
      const logoutBtn = $(logoutBtnId);
      const codeCont = $(codeContId);
      if (!statusEl || !loginBtn || !logoutBtn || !codeCont) return;

      if (lastAuthState.waiting) {
        statusEl.textContent = t('tv_status_waiting');
        statusEl.style.color = 'var(--gold)';
        return;
      }

      if (lastAuthState.error) {
        statusEl.textContent = t('tv_status_error', { error: lastAuthState.error });
        statusEl.style.color = 'var(--accent)';
        return;
      }

      if (lastAuthState.isAuth) {
        statusEl.textContent = t('tv_status_logged_in', { name: labelName });
        statusEl.style.color = 'var(--green)';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        codeCont.style.display = 'none';
      } else {
        statusEl.textContent = t('tv_status_not_logged_in');
        statusEl.style.color = 'var(--dim)';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
      }
    }

    refreshAuthStatus = () => {
      renderStatus();
    };

    function checkAuth() {
      chrome.runtime.sendMessage({ type: 'CHECK_CLIENT_AUTH', client: clientKey }, (res) => {
        lastAuthState = {
          isAuth: !!(res && res.isAuth),
          error: null,
          waiting: false,
        };
        renderStatus();
      });
    }

    $(loginBtnId)?.addEventListener('click', () => {
      const btn = $(loginBtnId);
      if (btn) {
        btn.disabled = true;
        btn.textContent = t('tv_loading');
      }

      chrome.runtime.sendMessage({ type: 'START_CLIENT_AUTH', client: clientKey }, (res) => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = t('btn_tv_login');
        }
        if (res && res.success && res.data) {
          const d = res.data;
          lastAuthState = { isAuth: false, error: null, waiting: true };
          renderStatus();

          $(codeElId).textContent = d.user_code;
          $(codeContId).style.display = 'block';

          const pollUI = setInterval(() => {
            chrome.runtime.sendMessage({ type: 'CHECK_CLIENT_AUTH', client: clientKey }, (check) => {
              if (check && check.isAuth) {
                clearInterval(pollUI);
                checkAuth();
                log(`${labelName} Auth Successful!`);
              }
            });
          }, 3000);
        } else {
          lastAuthState = { isAuth: false, error: res?.error || 'Unknown', waiting: false };
          renderStatus();
        }
      });
    });

    $(logoutBtnId)?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'LOGOUT_CLIENT', client: clientKey }, () => {
        checkAuth();
        log(`${labelName} Logged out.`);
      });
    });

    checkAuth();
  }

  // Set up auth for TVHTML5
  setupAuthControl('TVHTML5', '#tvAuthStatus', '#tvAuthCodeContainer', '#tvAuthCode', '#btnTvLogin', '#btnTvLogout', 'TVHTML5');

  // ─── EVENT LISTENERS ──────────────────────────────────────────────
  for (const sel of Object.values(KEYS)) {
    $(sel)?.addEventListener('change', save);
  }

  // Language switch listeners
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const newLang = btn.dataset.lang;
      if (settings.lang === newLang) return;
      settings.lang = newLang;
      save(false);
    });
  });

  document.querySelectorAll('.op-mode').forEach(m => {
    m.addEventListener('click', () => {
      const mode = m.dataset.opmode;
      if (settings.operationMode === mode) return;
      settings.operationMode = mode;
      document.querySelectorAll('.op-mode').forEach(x => {
        x.classList.toggle('active', x === m);
        const radio = x.querySelector('input');
        if (radio) radio.checked = (x === m);
      });
      save();
      log(`Operation Mode: ${settings.operationMode}`);
    });
  });

  $('#btnR')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.reload(tabs[0].id);
    });
    log('Page refreshed');
  });

  $('#btnL')?.addEventListener('click', () => {
    chrome.runtime.reload();
    log('Extension reloaded');
  });

  // ─── STATUS POLLING ───────────────────────────────────────────────
  function pollStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          try {
            return JSON.parse(localStorage.getItem('ytSpoofingStream_status') || '{}');
          } catch { return {}; }
        },
      }, (results) => {
        const d = results?.[0]?.result || {};

        // Status badge
        const badge = $('#stBadge');
        const text = $('#stText');
        if (!settings.enabled) {
          badge?.classList.add('off');
          if (text) text.textContent = t('st_disabled');
        } else if (d.activeAudioItag) {
          badge?.classList.remove('off');
          if (text) text.textContent = t('st_active');
        } else {
          badge?.classList.add('off');
          if (text) text.textContent = t('st_inactive');
        }

        // SW status ping
        chrome.runtime.sendMessage({ type: 'SW_PING' }, (resp) => {
          const swEl = $('#swSt');
          if (swEl) {
            if (resp && resp.ready) {
              swEl.textContent = t('sw_active', { version: resp.version });
              swEl.style.color = '#00c853';
            } else {
              swEl.textContent = t('sw_offline');
              swEl.style.color = '#e94560';
            }
          }
        });

        // Info
        const modeEl = $('#iMode');
        if (modeEl) {
          modeEl.textContent = `${settings.operationMode || 'HYBRID_HQ'} (774 ★)`;
        }

        const streamsEl = $('#iStreams');
        if (streamsEl) streamsEl.textContent = d.injectedStreams ?? 0;

        const methodEl = $('#iMethod');
        const audioEl = $('#iAudio');

        if (d.fallbackReason) {
          if (methodEl) {
            methodEl.textContent = t('method_fallback');
            methodEl.style.color = '#e94560';
          }
          if (audioEl) {
            audioEl.textContent = d.fallbackReason;
            audioEl.style.color = '#e94560';
            audioEl.style.fontSize = '11px';
          }
        } else {
          if (methodEl) {
            methodEl.style.color = 'var(--gold)';
            methodEl.textContent = d.activeMethod ? `${d.activeMethod} ${t('method_active_suffix')}` : t('method_original');
          }
          if (audioEl) {
            audioEl.style.color = '';
            audioEl.style.fontSize = '';
            audioEl.textContent = d.bestAudioInfo || '—';
          }
        }

        // Client Stats Grid
        const grid = $('#statsGrid');
        if (grid && d.clientStats) {
          grid.innerHTML = '';
          Object.entries(d.clientStats).forEach(([client, stat]) => {
            const isOk = stat.includes('str') || stat.includes('OK') || stat.includes('★') || stat.includes('Session Cache');
            const isErr = stat.includes('HTTP') || stat.includes('Error') || stat.includes('Fail') ||
                          stat.includes('Login') || stat.includes('robot') || stat.includes('Unavailable');
            const isHQ = stat.includes('★') || stat.includes('774') || stat.includes('141');
            const isCurrentPlaying = (d.activeMethod === client) && !isErr;
            const cls = isCurrentPlaying ? 'hq' : (isHQ ? 'ok' : (isOk ? 'ok' : (isErr ? 'err' : '')));

            const formatName = (name) => {
              switch (name) {
                case 'WEB_REMIX': return 'Web Remix (Music)';
                case 'TVHTML5': return 'TVHTML5 (YouTube TV)';
                case 'ANDROID': return 'Android (Mobile)';
                case 'ANDROID_MUSIC': return 'Android Music';
                case 'ANDROID_VR': return 'Android VR';
                case 'CACHE': return 'Session Cache';
                default: return name;
              }
            };

            const item = document.createElement('div');
            item.className = `grid-item ${cls}`;
            const activeBadge = isCurrentPlaying ? ' 🎯' : '';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'cn';
            nameSpan.textContent = `${formatName(client)}${activeBadge}`;
            const statSpan = document.createElement('span');
            statSpan.className = 'cs';
            statSpan.textContent = stat;
            item.append(nameSpan, statSpan);
            grid.appendChild(item);
          });
        }
      });
    });
  }

  pollStatus();
  setInterval(pollStatus, 1500);
})();
