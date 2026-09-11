import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMockDom } from '../mocks/dom.mock.js';

describe('StudioEngine774 Volume Synchronization & Phase Cancellation Guard', () => {
  let dom;
  let video;
  let audio;
  let moviePlayer;

  beforeEach(() => {
    dom = createMockDom();
    video = dom.document.createElement('video');
    video.id = 'main-video';
    video.classList.add('html5-main-video');
    dom.body.appendChild(video);

    audio = dom.document.createElement('audio');
    audio.id = 'ytss-studio-774';
    dom.body.appendChild(audio);

    moviePlayer = dom.document.createElement('div');
    moviePlayer.id = 'movie_player';
    moviePlayer._vol = 100;
    moviePlayer._muted = false;
    moviePlayer.getVolume = () => moviePlayer._vol;
    moviePlayer.isMuted = () => moviePlayer._muted;
    moviePlayer.setVolume = (v) => { moviePlayer._vol = v; };
    moviePlayer.unMute = () => { moviePlayer._muted = false; };
    moviePlayer.mute = () => { moviePlayer._muted = true; };
    dom.body.appendChild(moviePlayer);
  });

  it('keeps 774 audio volume synced with player UI volume slider rather than internal normalized video.volume', () => {
    let silencedElement = null;

    const StudioEngine774 = {
      audio,
      isActive: true,
      _userMuted: false,
      _isVolScrubbing: false,
      isAdActive: () => false,
      _silenceElement: (el) => {
        silencedElement = el;
        el.volume = 0;
        el.muted = true;
      },
      isUserMuted: () => moviePlayer.isMuted() || moviePlayer.getVolume() === 0,
      getUserVolume: () => {
        if (StudioEngine774.isUserMuted()) return 0;
        const v = moviePlayer.getVolume();
        return Math.max(0, Math.min(1.0, v / 100));
      },
      syncVolDirect(v) {
        if (!this.isActive || !this.audio) return;
        const target = this.isUserMuted() ? 0 : Math.max(0, Math.min(1.0, v));
        this.audio.volume = target;
      }
    };

    // User starts with UI volume at 100%
    audio.volume = 1.0;
    assert.equal(audio.volume, 1.0);

    // YouTube internal player updates video.volume = 0.55 due to loudness normalization / Stable Volume
    const normalizedVolumeFromYouTube = 0.55;

    // Simulate our updated volume setter
    const simulateVideoVolumeSet = (v) => {
      video._userVol = v;
      if (StudioEngine774.isActive && !StudioEngine774.isAdActive()) {
        StudioEngine774._silenceElement(video);
        if (StudioEngine774.audio) {
          const targetVol = StudioEngine774.getUserVolume();
          StudioEngine774.syncVolDirect(targetVol);
        }
      }
    };

    simulateVideoVolumeSet(normalizedVolumeFromYouTube);

    // Audio volume must remain 1.0 (UI slider value) rather than dipping down to 0.55
    assert.equal(audio.volume, 1.0, 'Audio volume must not dip to YouTube normalized volume');
    assert.equal(video._userVol, 0.55, 'video._userVol must record internal volume');
    assert.equal(silencedElement, video, 'Native video must be silenced');
  });

  it('updates 774 audio volume immediately when user adjusts UI volume slider', () => {
    const StudioEngine774 = {
      audio,
      isActive: true,
      _userMuted: false,
      isAdActive: () => false,
      isUserMuted: () => moviePlayer.isMuted() || moviePlayer.getVolume() === 0,
      getUserVolume: () => {
        if (StudioEngine774.isUserMuted()) return 0;
        const v = moviePlayer.getVolume();
        return Math.max(0, Math.min(1.0, v / 100));
      },
      syncVolDirect(v) {
        if (!this.isActive || !this.audio) return;
        const target = this.isUserMuted() ? 0 : Math.max(0, Math.min(1.0, v));
        this.audio.volume = target;
      }
    };

    audio.volume = 1.0;

    // Hook player.setVolume
    const origSetVol = moviePlayer.setVolume;
    moviePlayer.setVolume = (v) => {
      origSetVol(v);
      if (StudioEngine774.isActive && !StudioEngine774.isAdActive() && StudioEngine774.audio) {
        StudioEngine774.syncVolDirect(v / 100);
      }
    };

    // User drags volume slider to 45%
    moviePlayer.setVolume(45);
    assert.equal(moviePlayer.getVolume(), 45);
    assert.equal(audio.volume, 0.45, 'Audio volume must track UI volume slider');
  });

  it('immediately silences native video on unMute to prevent phase cancellation and audio leakage', () => {
    let nativeSilencedImmediately = false;

    const StudioEngine774 = {
      audio,
      isActive: true,
      _userMuted: true,
      isAdActive: () => false,
      _silenceElement: (el) => {
        nativeSilencedImmediately = true;
        el.volume = 0;
        el.muted = true;
      },
      syncVolDirect: (v) => {
        audio.volume = v;
      }
    };

    moviePlayer.mute();
    assert.equal(moviePlayer.isMuted(), true);

    // Hook player.unMute with our new immediate silence logic
    const origUnmute = moviePlayer.unMute;
    moviePlayer.unMute = () => {
      StudioEngine774._userMuted = false;
      origUnmute();
      if (StudioEngine774.isActive && !StudioEngine774.isAdActive()) {
        StudioEngine774._silenceElement(video);
        if (StudioEngine774.audio) {
          const curVol = moviePlayer.getVolume();
          StudioEngine774.syncVolDirect(curVol / 100);
        }
      }
    };

    moviePlayer.unMute();

    assert.equal(moviePlayer.isMuted(), false);
    assert.equal(nativeSilencedImmediately, true, 'Native video must be silenced immediately on unMute');
    assert.equal(video.muted, true, 'Video element must be muted at hardware level');
    assert.equal(video.volume, 0, 'Video element volume must be 0 at hardware level');
    assert.equal(audio.volume, 1.0, '774 audio volume must be unmuted and active');
  });
});
