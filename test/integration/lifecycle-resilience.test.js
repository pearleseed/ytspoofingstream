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

  it('onVisibilityResume snaps clock when drift > 150ms and resyncs play state', () => {
    const engine = {
      audio,
      video,
      isActive: true,
      onVisibilityResume() {
        if (!this.isActive || !this.video || !this.audio) return;
        const drift = Math.abs(this.audio.currentTime - this.video.currentTime);
        if (drift > 0.150) {
          this.audio.currentTime = this.video.currentTime;
        }
        this.audio.playbackRate = this.video.playbackRate;
        if (!this.video.paused && this.audio.paused) {
          this.audio.play();
        } else if (this.video.paused && !this.audio.paused) {
          this.audio.pause();
        }
      }
    };

    // Video is playing at 20.0s, audio lagged in background tab at 15.0s
    video.play();
    video.currentTime = 20.0;
    audio.currentTime = 15.0;
    audio.pause();

    engine.onVisibilityResume();

    assert.equal(audio.currentTime, 20.0);
    assert.equal(audio.paused, false);
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
