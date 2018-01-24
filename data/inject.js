'use strict';

var root = document.querySelector('.now-playing-bar');

var object = {};
var cache = {};

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'get-info') {
    Object.assign(cache, object);
    response(request.cached ? cache : object);
    object = {};
  }
});

function install() {
  const [progress, volume] = root.querySelectorAll('.progress-bar__fg');
  if (progress) {
    new MutationObserver(() => {
      object.progress = progress.getAttribute('style');
      object.time = root.querySelector('.playback-bar__progress-time').textContent;
      // cover loads with delay
      if (!cache.cover) {
        const cover = root.querySelector('.cover-art-image');
        if (cover) {
          object.cover = cover.getAttribute('style');
        }
      }
      object.progress = progress.getAttribute('style');
      object.time = root.querySelector('.playback-bar__progress-time').textContent;
    }).observe(progress, {
      childList: false,
      subtree: false,
      attributes: true,
      characterData: false
    });
  }
  if (volume) {
    new MutationObserver(() => {
      object.volume = volume.getAttribute('style');
    }).observe(volume, {
      childList: false,
      subtree: false,
      attributes: true,
      characterData: false
    });
    object.volume = volume.getAttribute('style');
  }
  const shuffle = root.querySelector('.spoticon-shuffle-16');
  if (shuffle) {
    new MutationObserver(() => {
      object.shuffle = shuffle.classList.contains('control-button--active');
    }).observe(shuffle, {
      childList: false,
      subtree: false,
      attributes: true,
      characterData: false
    });
  }
  const repeat = root.querySelector('.spoticon-repeat-16');
  if (repeat) {
    new MutationObserver(() => {
      object.repeat = repeat.classList.contains('control-button--active');
      object.once = repeat.classList.contains('spoticon-repeatonce-16');
    }).observe(repeat, {
      childList: false,
      subtree: false,
      attributes: true,
      characterData: false
    });
  }
  const play = root.querySelector('.spoticon-play-16');
  if (play) {
    new MutationObserver(() => {
      object.play = play.classList.contains('control-button--disabled') === false;
    }).observe(play, {
      childList: false,
      subtree: false,
      attributes: true,
      characterData: false
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver(() => {
    root = root || document.querySelector('.now-playing-bar');
    if (root) {
      observer.disconnect();
      install();
    }
  });
  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
});

window.addEventListener('message', e => {
  if (e.data && e.data.method === 'title-changed') {
    object.isPlaying = Boolean(root.querySelector('.spoticon-pause-16'));

    const cover = root.querySelector('.cover-art-image');
    if (cover) {
      object.cover = cover.getAttribute('style');
    }
    else {
      delete object.cover;
    }

    const track = root.querySelector('.track-info__name a');
    if (track) {
      object.track = {
        name : track ? track.textContent : '',
        url: track ? track.href : ''
      };
    }
    const artists = [...root.querySelectorAll('.track-info__artists a')];
    if (artists) {
      object.artists = artists.map(a => ({
        name: a.textContent,
        url: a.href
      }));
    }
    const duration = root.querySelector('.playback-bar__progress-time:last-child');
    if (duration) {
      object.duration = duration.textContent;
    }

    chrome.runtime.sendMessage(e.data);
  }
});
// watching title changes
var script = document.createElement('script');
script.textContent = `{
  let title = document.title;
  Object.defineProperty(document, 'title', {
    enumerable: true,
    configurable: true,
    get: function () {
      return title;
    },
    set: function (val) {
      if (title !== val) {
        window.postMessage({method: 'title-changed', title: val}, '*');
      }
      title = val;

    }
  });
}`;
document.documentElement.appendChild(script);
document.documentElement.removeChild(script);

// commands
chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'play') {
    root.querySelector('.spoticon-play-16').click();
  }
  else if (request.method === 'pause') {
    root.querySelector('.spoticon-pause-16').click();
  }
  else if (request.method === 'skip-forward') {
    root.querySelector('.spoticon-skip-forward-16').click();
  }
  else if (request.method === 'skip-forward') {
    root.querySelector('.spoticon-skip-forward-16').click();
  }
  else if (request.method === 'skip-backward') {
    root.querySelector('.spoticon-skip-back-16').click();
  }
  else if (request.method === 'toggle-shuffle') {
    root.querySelector('.spoticon-shuffle-16').click();
  }
  else if (request.method === 'toggle-repeat') {
    (
      root.querySelector('.spoticon-repeat-16') ||
      root.querySelector('.spoticon-repeatonce-16')
    ).click();
  }
  else if (request.method === 'progress' || request.method === 'volume') {
    const e = root.querySelectorAll('.progress-bar');
    if (e) {
      const progressbar = e[request.method === 'progress' ? 0 : 1];
      if (progressbar) {
        const {left, width} = progressbar.getBoundingClientRect();
        const clientX = left + width * request.percent;
        progressbar.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, clientX}));
        progressbar.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, clientX}));
      }
    }
  }
});
