import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Extracted I18N maps from popup.js and inject.js to verify dictionary completeness
const POPUP_I18N = {
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

const HUD_I18N = {
  vi: {
    badge_title_settings: 'YTSpoofingStream Settings — Nhấn để mở Cài đặt',
    badge_title_off: 'YTSpoofingStream (Đã tắt) — Nhấn để mở Cài đặt',
    badge_title_141: 'Studio Master AAC 141 (256kbps Chuẩn gốc) — Nhấn để mở Cài đặt',
    badge_title_774: 'HQ Opus 774 (256k+ Toàn dải tần số) — Nhấn để mở Cài đặt',
    badge_title_native: 'Native Audio (ITAG 251) — Nhấn để mở Cài đặt',
    close_title: 'Đóng',
    master_en: 'Kích hoạt Studio 774',
    audio_mode_header: 'Chế độ âm thanh',
    mode_hybrid: '★ Hybrid Mix (Tối ưu)',
    mode_ytm: 'YouTube Music (774)',
    mode_tv: 'Smart TV Relay (774)',
    sfn_title: 'Stats for Nerds (774)',
    status_off: 'Đã tắt (Native)',
    status_fallback: 'ITAG {itag} Dự phòng',
    btn_reload: '⟳ Tải lại',
  },
  en: {
    badge_title_settings: 'YTSpoofingStream Settings — Click to open Settings',
    badge_title_off: 'YTSpoofingStream (Disabled) — Click to open Settings',
    badge_title_141: 'Studio Master AAC 141 (256kbps Full Fidelity) — Click to open Settings',
    badge_title_774: 'HQ Opus 774 (256k+ Full Frequency Spectrum) — Click to open Settings',
    badge_title_native: 'Native Audio (ITAG 251) — Click to open Settings',
    close_title: 'Close',
    master_en: 'Enable Studio 774',
    audio_mode_header: 'Audio Mode',
    mode_hybrid: '★ Hybrid Mix (Optimal)',
    mode_ytm: 'YouTube Music (774)',
    mode_tv: 'Smart TV Relay (774)',
    sfn_title: 'Stats for Nerds (774)',
    status_off: 'Disabled (Native)',
    status_fallback: 'ITAG {itag} Fallback',
    btn_reload: '⟳ Reload',
  }
};

describe('I18N Bilingual Integrity & Completeness', () => {
  it('ensures all popup keys exist symmetrically in vi and en', () => {
    const viKeys = Object.keys(POPUP_I18N.vi).sort();
    const enKeys = Object.keys(POPUP_I18N.en).sort();
    assert.deepEqual(viKeys, enKeys, 'Popup VI and EN key sets must match exactly');

    for (const k of viKeys) {
      assert.ok(POPUP_I18N.vi[k] && POPUP_I18N.vi[k].length > 0, `Popup VI key ${k} must not be empty`);
      assert.ok(POPUP_I18N.en[k] && POPUP_I18N.en[k].length > 0, `Popup EN key ${k} must not be empty`);
    }
  });

  it('ensures all HUD keys exist symmetrically in vi and en', () => {
    const viKeys = Object.keys(HUD_I18N.vi).sort();
    const enKeys = Object.keys(HUD_I18N.en).sort();
    assert.deepEqual(viKeys, enKeys, 'HUD VI and EN key sets must match exactly');

    for (const k of viKeys) {
      assert.ok(HUD_I18N.vi[k] && HUD_I18N.vi[k].length > 0, `HUD VI key ${k} must not be empty`);
      assert.ok(HUD_I18N.en[k] && HUD_I18N.en[k].length > 0, `HUD EN key ${k} must not be empty`);
    }
  });

  it('interpolates variables accurately in translation strings', () => {
    function t(dict, lang, key, vars = {}) {
      let str = dict[lang]?.[key] || dict.en?.[key] || key;
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
      return str;
    }

    assert.equal(t(POPUP_I18N, 'vi', 'sw_active', { version: '0.1.6' }), 'SW: v0.1.6 Hoạt động');
    assert.equal(t(POPUP_I18N, 'en', 'sw_active', { version: '0.1.6' }), 'SW: v0.1.6 Active');

    assert.equal(t(HUD_I18N, 'vi', 'status_fallback', { itag: 251 }), 'ITAG 251 Dự phòng');
    assert.equal(t(HUD_I18N, 'en', 'status_fallback', { itag: 251 }), 'ITAG 251 Fallback');
  });
});
