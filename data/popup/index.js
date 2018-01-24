'use strict';

var activeID = null;
var isPlaying = false;

var sendMessage = (id, cached = false) => new Promise(resolve => chrome.tabs.sendMessage(id, {
  method: 'get-info',
  cached
}, (o = {}) => {
  o.id = id;
  resolve(o);
}));

var update = resp => {
  console.log(resp);

  if (resp.cover) {
    document.getElementById('cover').src = resp.cover.replace('background-image: url("', '').replace('");', '');
  }
  if (resp.track) {
    document.getElementById('track').textContent = resp.track.name;
    document.getElementById('track').href = resp.track.url;
  }
  if (resp.duration) {
    document.getElementById('duration').textContent = resp.duration;
  }
  if (resp.artists) {
    const artists = document.getElementById('artists');
    artists.textContent = '';
    resp.artists.forEach(artist => {
      const a = document.createElement('a');
      a.href = artist.url;
      a.textContent = artist.name;
      artists.appendChild(a);
    });
  }
  if (resp.progress) {
    document.getElementById('progress').style = resp.progress;
    document.getElementById('progress').dataset.synced = true;
  }
  if (resp.volume) {
    document.getElementById('volume').style = resp.volume;
    document.getElementById('volume').dataset.synced = true;
  }
  if (resp.time) {
    document.getElementById('time').textContent = resp.time;
  }
  if ('shuffle' in resp) {
    document.getElementById('shuffle').dataset.active = resp.shuffle;
  }
  if ('repeat' in resp) {
    document.getElementById('repeat').dataset.active = resp.repeat;
  }
  if ('once' in resp) {
    document.getElementById('repeat').dataset.once = resp.once;
  }
  if ('isPlaying' in resp) {
    isPlaying = resp.isPlaying;
    document.getElementById('play').dataset.cmd = resp.isPlaying ? 'pause' : 'play';
  }
  if ('play' in resp) {
    document.getElementById('play').dataset.enabled = resp.play;
  }
};

var one = (cached = false) => sendMessage(activeID, cached).then(resp => {
  if (cached && resp.track) {
    try {
      document.getElementById('no-player').remove();
    }
    catch (e) {}
  }
  update(resp);
  if (resp && 'isPlaying' in resp) {
    window.clearInterval(one.id);
    if (resp.isPlaying) {
      one.id = window.setInterval(one, 1000);
    }
  }
});

chrome.tabs.query({
  url: '*://open.spotify.com/*'
}, tabs => {
  if (tabs && tabs.length) {
    Promise.all(tabs.map(t => sendMessage(t.id, true))).then(arr => {
      const activeTab = arr.filter(o => o && o.isPlaying).shift();
      if (activeTab) {
        activeID = activeTab.id;
        one(true);
      }
      else if (arr.length) {
        update(arr[0]);
        activeID = arr[0].id;
        if (arr[0].track) {
          document.getElementById('no-player').remove();
        }
        console.log('no active player, just update the UI', arr);
      }
      else {
        console.log('no open tab');
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.method === 'title-changed') {
    activeID = sender.tab.id;
    one(true);
    window.setTimeout(one, 1000, true);
  }
});

/**/
document.addEventListener('mouseup', e => {
  const target = e.target;
  const cmd = target.dataset.cmd;
  if (cmd && activeID && (
    cmd === 'progress' ||
    cmd === 'volume'
  )) {
    const percent = e.offsetX / target.getBoundingClientRect().width;
    chrome.tabs.sendMessage(activeID, {
      method: cmd,
      percent
    });
    document.getElementById(cmd).style = `width: ${percent * 100}%`;
    if (isPlaying) {
      document.getElementById(cmd).dataset.synced = false;
    }
  }
  else if (cmd && activeID) {
    chrome.tabs.sendMessage(activeID, {
      method: cmd
    });

    if (cmd === 'toggle-shuffle') {
      const shuffle = document.getElementById('shuffle');
      shuffle.dataset.active = shuffle.dataset.active === 'false';
    }
    else if (cmd === 'toggle-repeat') {
      const repeat = document.getElementById('repeat');
      if (repeat.dataset.active === 'false') {
        repeat.dataset.active = true;
      }
      else {
        if (repeat.dataset.once === 'true') {
          repeat.dataset.active = false;
          repeat.dataset.once = false;
        }
        else {
          repeat.dataset.once = true;
        }
      }
    }
    else if (cmd === 'skip-forward' || cmd === 'skip-backward') {
      document.getElementById('cover').src = '';
    }
  }
});
