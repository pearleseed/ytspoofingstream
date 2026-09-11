import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMockDom } from '../mocks/dom.mock.js';

describe('Lifecycle & Navigation Resilience', () => {
  let dom;
  let video;
  let audio;

  beforeEach(() => {
    dom = createMockDom();
    video = dom.document.createElement('video');
    video.id = 'main-video';
    dom.body.appendChild(video);

    audio = dom.document.createElement('audio');
    audio.id = 'ytss-studio-774';
    dom.body.appendChild(audio);
  });

  it('resetForNewTrack cleans up audio source, pauses playback, and resets timers', () => {
    const engine = {
      audio,
      isActive: true,
      activeVideoId: 'video_1',
      _isAudioBuffering: true,
      _reconnectAttempts: 2,
      _waiterTimer: setTimeout(() => {}, 5000),
      resetForNewTrack(newVid) {
        if (this.audio) {
          this.audio.pause();
          this.audio.removeAttribute('src');
          this.audio.src = '';
        }
        clearTimeout(this._waiterTimer);
        this._waiterTimer = null;
        this.isActive = false;
        this.activeVideoId = null;
        this._isAudioBuffering = false;
        this._reconnectAttempts = 0;
      }
    };

    audio.src = 'https://googlevideo.com/videoplayback?itag=774';
    audio.play();
    assert.equal(audio.paused, false);

    engine.resetForNewTrack('video_2');
    assert.equal(audio.paused, true);
    assert.equal(audio.src, '');
    assert.equal(engine.isActive, false);
    assert.equal(engine._waiterTimer, null);
    assert.equal(engine._reconnectAttempts, 0);
  });

  it('onVisibilityResume treats active audio as Master Clock and resyncs paused/lagging video', () => {
    const engine = {
      audio,
      video,
      isActive: true,
      onVisibilityResume() {
        if (!this.isActive || !this.video || !this.audio) return;
        this.audio.playbackRate = this.video.playbackRate;
        if (!this.audio.paused && !this.audio.ended) {
          const drift = this.audio.currentTime - this.video.currentTime;
          if (Math.abs(drift) > 0.150) {
            this.video.currentTime = this.audio.currentTime;
          }
          if (this.video.paused) {
            this.video.play();
          }
        } else if (this.audio.paused && !this.video.paused) {
          this.audio.play();
        }
      }
    };

    // Audio is playing in background at 25.0s, video was throttled/paused by Chrome at 15.0s
    audio.src = 'https://googlevideo.com/videoplayback?itag=774';
    audio.play();
    audio.currentTime = 25.0;

    video.pause();
    video.currentTime = 15.0;

    engine.onVisibilityResume();

    // Audio must NOT be paused, and video must sync forward to audio time and resume playing
    assert.equal(audio.paused, false);
    assert.equal(audio.currentTime, 25.0);
    assert.equal(video.currentTime, 25.0);
    assert.equal(video.paused, false);
  });

  it('miniplayer navigation preserves active 774 playback when incomingVid is null or unchanged', () => {
    let resetCalled = false;
    let stopCalled = false;

    const engine = {
      isActive: true,
      activeVideoId: 'video_xyz',
      resetForNewTrack() { resetCalled = true; },
      stopAndUnmute(reason) { stopCalled = true; }
    };

    function handleNavigateStart(incomingVid) {
      // Correct logic: Only stop if incomingVid exists AND is different from active track
      if (incomingVid && incomingVid !== engine.activeVideoId) {
        engine.stopAndUnmute('Navigating to new video');
      }
      // When minimizing (incomingVid is null), audio must continue playing!
    }

    // Simulate minimizing to home page (incomingVid is null)
    handleNavigateStart(null);
    assert.equal(resetCalled, false);
    assert.equal(stopCalled, false);

    // Simulate clicking a DIFFERENT video
    handleNavigateStart('video_abc');
    assert.equal(stopCalled, true);
  });

  it('isCurrentWatchVideo identifies active miniplayer when page is on home route', () => {
    const mini = dom.document.createElement('ytd-miniplayer');
    mini.setAttribute('active', '');
    dom.body.appendChild(mini);

    let activeVideoId = 'video_test_123';
    let navTargetVideoId = null;

    function isPlayerActiveOnPage() {
      const isWatch = dom.window.location.pathname?.startsWith('/watch');
      if (isWatch) return true;
      const m = dom.document.querySelector('ytd-miniplayer');
      const isMiniActive = m && (m.hasAttribute('active') || m.style.display !== 'none');
      return !!isMiniActive;
    }

    function isCurrentWatchVideo(vid) {
      if (!vid) return false;
      const playerVid = dom.document.getElementById('movie_player')?.getVideoData?.()?.video_id;
      if (playerVid && playerVid === vid) return true;
      if (navTargetVideoId && navTargetVideoId === vid) return true;
      const urlVid = null; // Home route has no ?v=
      if (urlVid && urlVid === vid) return true;
      if (activeVideoId === vid && isPlayerActiveOnPage()) return true;
      return false;
    }

    assert.equal(isCurrentWatchVideo('video_test_123'), true);
    assert.equal(isCurrentWatchVideo('different_video'), false);
  });

  it('Shorts loop detector resets audio to 0 when video wraps around', () => {
    let lastVideoTime = 28.5; // Near end of 30s Short
    let audioLoopTriggered = false;

    function checkShortsLoop(currentVideoTime, isShorts) {
      if (isShorts && currentVideoTime < 0.25 && lastVideoTime > 5.0) {
        audio.currentTime = 0;
        audioLoopTriggered = true;
      }
      lastVideoTime = currentVideoTime;
    }

    // Video loops back to 0.05s
    checkShortsLoop(0.05, true);

    assert.equal(audioLoopTriggered, true);
    assert.equal(audio.currentTime, 0);
  });
});
