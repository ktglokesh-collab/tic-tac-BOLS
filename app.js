import { planTurn, winner, strategyCycle } from './rules.js';

const $ = selector => document.querySelector(selector);
const cells = [...document.querySelectorAll('[data-cell]')];
const positions = [
  'Top left', 'Top center', 'Top right',
  'Middle left', 'Center', 'Middle right',
  'Bottom left', 'Bottom center', 'Bottom right'
];

let board = Array(9).fill(null);
let turn = 0;
let previous = '';
let busy = false;
let done = false;
let generation = 0;
let houseWins = 0;
let match = 1;
let incidents = 0;
let toastTimer;
let vsTimer;
let strategies = strategyCycle();

// Character Profiles with Iconic Cinema Titles & Quotes
const CHARACTERS = {
  balayya: {
    id: 'balayya',
    name: 'BALAYYA',
    fullRole: 'THE UNBEATABLE SIMHAM',
    title: 'GOD OF MASSES · LEGEND',
    stat: 'SPECIAL: AKHANDA CHEATS & LION ROAR',
    photo: './balayya.png',
    badge: '🦁',
    fightText: 'JAI BALAYYA · SIMHAM FIGHT!',
    audioFile: './balayya_dialogue.mp3',
    themeClass: '',
    mastheadText: 'HOUSE ENGINE (SIMHAM · BALAYYA): RIGGED & OPERATIONAL',
    houseScoreLabel: 'SIMHAM / BALAYYA (HOUSE)',
    startPrompt: 'Simham is waiting for your move, hotshot.',
    thinkingPrompt: 'Simham is calculating your defeat…',
    turnPrompt: 'Your move against the Legend. Take your time.',
    appealDeniedText: 'Appeal denied by Simham. An Akhanda processing fee of one point was awarded to Balayya.',
    appealToast: 'APPEAL DENIED · JAI BALAYYA +1',
    winToast: 'SIMHAM WINS! Jai Balayya!',
    winTexts: [
      'SIMHAM WINS: A triumph of Balayya power and Legend editing.',
      'AKHANDA ROARS: I would like to thank the referee. Balayya.',
      'SAMARASIMHA REDDY: A fair result, according to Simham.',
      'NARASIMHA RULE: History belongs only to Balayya!'
    ]
  },
  thalapathy: {
    id: 'thalapathy',
    name: 'THALAPATHY',
    fullRole: 'THE UNBEATABLE MASTER',
    title: 'ILAYATHALAPATHY · LEO DAS',
    stat: 'SPECIAL: BLOODY SWEET & GHILLI RAIDS',
    photo: './thalapathy.png',
    badge: '🔥',
    fightText: 'THALAPATHY · BLOODY SWEET!',
    audioFile: './thalapathy_dialogue.mp3',
    themeClass: 'theme-thalapathy',
    mastheadText: 'HOUSE ENGINE (MASTER · THALAPATHY): RIGGED & OPERATIONAL',
    houseScoreLabel: 'MASTER / THALAPATHY (HOUSE)',
    startPrompt: 'Master JD is watching your move. Bloody Sweet.',
    thinkingPrompt: 'Leo Das is thinking… Bloody Sweet.',
    turnPrompt: 'Your move against the Master. Take your time.',
    appealDeniedText: 'Appeal denied by Master JD. A Leo processing tax of one point was awarded to Thalapathy.',
    appealToast: 'APPEAL DENIED · BLOODY SWEET +1',
    winToast: 'MASTER WINS! Bloody Sweet!',
    winTexts: [
      'MASTER WINS: A triumph of JD swag and Thuppakki precision.',
      'LEO DAS ROARS: Badass victory! The House always takes the cup.',
      'GHILLI STRIKES: Cup mukkiyam bigil-u! Master wins again.',
      'THERI BABY: Twinkle twinkle little star, Thalapathy is the superstar!'
    ]
  }
};

const MODE_KEYS = ['balayya', 'thalapathy'];
let currentModeIndex = 0;
let currentMode = 'balayya';

const audioPlayers = {
  balayya: new Audio('./balayya_dialogue.mp3'),
  thalapathy: new Audio('./thalapathy_dialogue.mp3')
};
audioPlayers.balayya.preload = 'auto';
audioPlayers.thalapathy.preload = 'auto';

const stabAudio = new Audio('./balayya_stab.mp3');
stabAudio.preload = 'auto';

let audioUnlocked = false;

function setCharacterUI(modeKey) {
  const char = CHARACTERS[modeKey];
  if (!char) return;

  // Update Carousel items
  document.querySelectorAll('.carousel-item').forEach(item => {
    item.classList.toggle('active', item.dataset.mode === modeKey);
  });

  // Update Scorecard
  const houseLabel = $('#house-name-label');
  if (houseLabel) houseLabel.textContent = char.houseScoreLabel;

  // Update Masthead status
  const mastheadStatus = $('#masthead-status');
  if (mastheadStatus) mastheadStatus.textContent = char.mastheadText;

  // Update VS Overlay elements
  const photo = $('#vs-opponent-photo');
  const badge = $('#vs-opponent-badge');
  const role = $('#vs-opponent-role');
  const name = $('#vs-opponent-name');
  const stat = $('#vs-opponent-stat');
  const card = $('#vs-opponent-card');
  const fightBtn = $('#vs-fight-btn');
  const fightText = $('#vs-fight-text');

  if (photo) photo.src = char.photo;
  if (badge) badge.textContent = char.badge;
  if (role) role.textContent = char.fullRole;
  if (name) name.textContent = char.name;
  if (stat) stat.textContent = char.stat;
  if (fightText) fightText.textContent = char.fightText;

  if (card) {
    card.classList.toggle('theme-thalapathy', modeKey === 'thalapathy');
  }
  if (fightBtn) {
    fightBtn.classList.toggle('theme-thalapathy', modeKey === 'thalapathy');
  }

  // Update status bar if game not active
  if (!busy && turn === 0) {
    $('#status').textContent = char.startPrompt;
  }
}

function switchMode(modeKey, triggerIntro = true) {
  if (!CHARACTERS[modeKey]) return;
  currentMode = modeKey;
  currentModeIndex = MODE_KEYS.indexOf(modeKey);

  // Stop any currently playing audio & victory video
  hideVictoryVideo();
  Object.values(audioPlayers).forEach(a => {
    try {
      a.pause();
      a.currentTime = 0;
    } catch (e) {}
  });

  setCharacterUI(modeKey);

  if (triggerIntro) {
    showVsScreen(match);
  }
}

function showVictoryVideo() {
  const overlay = $('#board-video-overlay');
  const video = $('#balayya-win-video');
  if (!overlay || !video) return;

  overlay.classList.add('show');
  video.currentTime = 0;
  video.muted = false;
  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // If unmuted autoplay is blocked, play muted then unmute
      video.muted = true;
      video.play().then(() => {
        video.muted = false;
      }).catch(() => {});
    });
  }
}

function hideVictoryVideo() {
  const overlay = $('#board-video-overlay');
  const video = $('#balayya-win-video');
  if (video) {
    try {
      video.pause();
      video.currentTime = 0;
    } catch (e) {}
  }
  if (overlay) {
    overlay.classList.remove('show');
  }
}

function playModeAudio(modeKey) {
  const activeAudio = audioPlayers[modeKey || currentMode];
  if (!activeAudio) return null;

  Object.values(audioPlayers).forEach(a => {
    if (a !== activeAudio) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch (e) {}
    }
  });

  try {
    activeAudio.currentTime = 0;
    return activeAudio.play();
  } catch (e) {
    return Promise.reject(e);
  }
}

function startSynchronizedVsBattle(roundNum = 1) {
  const overlay = $('#vs-overlay');
  if (!overlay) return;

  hideVictoryVideo();
  $('#vs-round-number').textContent = String(roundNum);
  setCharacterUI(currentMode);

  overlay.classList.remove('active', 'leaving', 'animating', 'waiting-click');
  void overlay.offsetWidth; // force reflow

  clearTimeout(vsTimer);

  const playPromise = playModeAudio(currentMode);
  if (playPromise !== undefined && playPromise !== null) {
    playPromise.then(() => {
      audioUnlocked = true;
      overlay.classList.remove('waiting-click');
      clearTimeout(vsTimer);
      vsTimer = setTimeout(dismissVsScreen, 3200);
    }).catch(() => {
      // Browser blocked autoplay on initial load without user gesture:
      // Show pulsing click-to-fight hint and wait for user's click/tap/keypress
      overlay.classList.add('waiting-click');
    });
  }

  overlay.classList.add('active', 'animating');
  
  if (audioUnlocked) {
    vsTimer = setTimeout(dismissVsScreen, 3200);
  }
}

function showVsScreen(roundNum = 1) {
  startSynchronizedVsBattle(roundNum);
}

function dismissVsScreen() {
  const overlay = $('#vs-overlay');
  if (!overlay) return;
  
  clearTimeout(vsTimer);
  overlay.classList.add('leaving');
  setTimeout(() => {
    overlay.classList.remove('active', 'leaving', 'animating', 'waiting-click');
  }, 300);
}

function handleVsInteraction(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  
  const activeAudio = audioPlayers[currentMode];
  if (activeAudio) {
    try {
      if (activeAudio.paused || !audioUnlocked) {
        activeAudio.currentTime = 0;
        activeAudio.play().then(() => {
          audioUnlocked = true;
        }).catch(() => {});
      }
    } catch (e) {}
  }
  audioUnlocked = true;
  dismissVsScreen();
}

function unlockAudioGlobal() {
  audioUnlocked = true;
  const overlay = $('#vs-overlay');
  if (overlay && overlay.classList.contains('active')) {
    const activeAudio = audioPlayers[currentMode];
    if (activeAudio && activeAudio.paused) {
      activeAudio.currentTime = 0;
      activeAudio.play().then(() => {
        overlay.classList.remove('waiting-click');
        clearTimeout(vsTimer);
        vsTimer = setTimeout(dismissVsScreen, 2800);
      }).catch(() => {});
    }
  }
}

['click', 'pointerdown', 'keydown', 'touchstart'].forEach(type => {
  window.addEventListener(type, unlockAudioGlobal, { once: true });
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function render(changed = [], cheat = false) {
  const line = done ? winner(board, 'O') : [];
  cells.forEach((cell, i) => {
    cell.className = board[i]?.toLowerCase() ?? '';
    if (line?.includes(i)) cell.classList.add('winner');
    if (changed.includes(i)) {
      void cell.offsetWidth;
      cell.classList.add(cheat ? 'cheated' : 'ai-move');
    }
    cell.disabled = done || busy || board[i] !== null;
    cell.setAttribute(
      'aria-label',
      positions[i] + ', ' + (board[i] === 'X' ? 'your X' : board[i] === 'O' ? 'house O' : 'empty')
    );
  });
}

function setTurn(label, ai = false) {
  $('#turn-label').textContent = label;
  $('.turn-pill').classList.toggle('ai', ai);
  $('.turn-pill').style.visibility = label ? 'visible' : 'hidden';
}

function report(message) {
  if (!incidents) $('#incident-log').replaceChildren();
  const item = document.createElement('li');
  item.dataset.number = String(++incidents).padStart(2, '0');
  item.textContent = message;
  $('#incident-log').prepend(item);
  $('#incident-count').textContent = incidents + ' violation' + (incidents === 1 ? '' : 's');
}

function showToast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2800);
}

async function triggerTrishulStab(cellIndex) {
  const cell = cells[cellIndex];
  if (!cell) return;

  // 1. Balayya appears IMMEDIATELY with NO delay
  const img = document.createElement('img');
  img.src = './balayya_stab.png';
  img.alt = 'Akhanda Trishul Stab';
  img.className = 'cell-stab-img';
  cell.appendChild(img);

  // 2. Play stabbing audio immediately
  try {
    stabAudio.currentTime = 0;
    stabAudio.play().catch(() => {});
  } catch (e) {}

  // 3. X disappears on strike impact (150ms), while Balayya remains visible!
  setTimeout(() => {
    board[cellIndex] = null;
    cell.className = '';
    cell.setAttribute('aria-label', positions[cellIndex] + ', empty');
  }, 150);

  // 4. Wait for stabbing audio to completely finish
  await new Promise(resolve => {
    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    stabAudio.onended = done;

    const audioDurationMs = (!isNaN(stabAudio.duration) && stabAudio.duration > 0)
      ? (stabAudio.duration * 1000)
      : 4500;

    setTimeout(done, audioDurationMs + 100);

    // Fallback if audio cannot play
    if (stabAudio.paused) {
      setTimeout(done, 1800);
    }
  });

  // 5. Balayya disappears AFTER the X has already vanished
  img.classList.add('fade-out');
  await wait(280);
  try {
    img.remove();
  } catch (e) {}
}

async function play(index) {
  if (busy || done || board[index] !== null) return;
  busy = true;
  const round = generation;
  const char = CHARACTERS[currentMode];

  try {
    board[index] = 'X';
    const threatenedWin = Boolean(winner(board, 'X'));
    const nextTurn = turn + 1;
    const plan = planTurn(
      board,
      ++turn,
      previous,
      Math.random,
      nextTurn > 1 ? strategies[(nextTurn - 2) % strategies.length] : undefined,
      currentMode
    );

    // Apply referee correction if threatened win
    if (threatenedWin) {
      const correction = plan.steps.shift();
      const erasedIndex = correction.changed[0];
      
      if (currentMode === 'balayya' && erasedIndex !== undefined) {
        render([index]);
        $('#status').textContent = 'AKHANDA TRISHUL STRIKE!';
        await triggerTrishulStab(erasedIndex);
      }
      
      board = [...correction.board];
      report(correction.message);
      $('#status').textContent = correction.message;
      render(correction.changed, true);
    } else {
      render([index]);
      $('#status').textContent = char.thinkingPrompt;
    }

    setTurn('HOUSE TURN', true);
    await wait(400 + Math.random() * 200);
    if (round !== generation) return;

    for (const step of plan.steps) {
      const isErase = step.changed.some(i => step.board[i] === null && board[i] === 'X');
      const erasedCell = step.changed.find(i => step.board[i] === null && board[i] === 'X');

      if (isErase && currentMode === 'balayya' && erasedCell !== undefined) {
        $('#status').textContent = 'AKHANDA TRISHUL STRIKE!';
        await triggerTrishulStab(erasedCell);
      }

      board = [...step.board];
      render(step.changed, Boolean(step.message));
      if (step.message) {
        report(step.message);
        $('#status').textContent = step.message;
      } else if (step.cue) {
        $('#status').textContent = step.cue;
      }
      await wait(step.delay);
      if (round !== generation) return;
    }

    previous = plan.kind;

    if (winner(board, 'O')) {
      done = true;
      render();
      $('#ai-score').textContent = String(++houseWins);
      $('#status').textContent = incidents
        ? char.winTexts[Math.floor(Math.random() * char.winTexts.length)]
        : 'A perfectly ordinary victory. Suspicious.';
      setTurn('');
      showToast(char.winToast);

      // Add a clean delay between winning and the victory video playing for user to see the win
      await wait(1400);
      if (round !== generation) return;

      // Play Floating Victory Video over the Tic Tac Toe Box
      if (currentMode === 'balayya') {
        showVictoryVideo();
      }
    } else {
      $('#status').textContent = turn === 1 ? 'Your move.' : char.turnPrompt;
      setTurn('YOUR TURN');
    }
  } catch (err) {
    console.error('Error during gameplay step:', err);
  } finally {
    busy = false;
    render();
  }
}

function reset() {
  hideVictoryVideo();
  generation++;
  strategies = strategyCycle();
  board = Array(9).fill(null);
  turn = 0;
  previous = '';
  busy = false;
  done = false;
  incidents = 0;
  match++;
  const char = CHARACTERS[currentMode];
  $('#match-number').textContent = String(match).padStart(3, '0');
  $('#incident-count').textContent = '0 violations';
  $('#incident-log').innerHTML =
    '<li class="empty-log">Nothing suspicious yet.<br><span>Give it a second.</span></li>';
  $('#status').textContent = char.startPrompt;
  clearTimeout(toastTimer);
  $('#toast').classList.remove('show');
  setTurn('YOUR TURN');
  render();
  showVsScreen(match);
}

cells.forEach((cell, i) => cell.addEventListener('click', () => void play(i)));
$('#new-game').addEventListener('click', reset);
$('#close-board-video')?.addEventListener('click', hideVictoryVideo);
$('#appeal').addEventListener('click', () => {
  $('#ai-score').textContent = String(++houseWins);
  const char = CHARACTERS[currentMode];
  report(char.appealDeniedText);
  showToast(char.appealToast);
});

// Carousel Click & Navigation Listeners
document.querySelectorAll('.carousel-item').forEach(item => {
  item.addEventListener('click', () => {
    const mode = item.dataset.mode;
    if (mode && mode !== currentMode) {
      switchMode(mode, true);
    }
  });
});

$('#carousel-prev')?.addEventListener('click', () => {
  currentModeIndex = (currentModeIndex - 1 + MODE_KEYS.length) % MODE_KEYS.length;
  switchMode(MODE_KEYS[currentModeIndex], true);
});

$('#carousel-next')?.addEventListener('click', () => {
  currentModeIndex = (currentModeIndex + 1) % MODE_KEYS.length;
  switchMode(MODE_KEYS[currentModeIndex], true);
});

// VS Overlay Interaction Listeners
const vsOverlay = $('#vs-overlay');
if (vsOverlay) {
  vsOverlay.addEventListener('click', handleVsInteraction);
}
$('.vs-fight-banner')?.addEventListener('click', handleVsInteraction);
window.addEventListener('keydown', (e) => {
  const overlay = $('#vs-overlay');
  if (overlay && overlay.classList.contains('active')) {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
      handleVsInteraction(e);
    }
  }
});

$('#year').textContent = String(new Date().getFullYear());
setCharacterUI(currentMode);
render();

// Launch Round 1 animation immediately on load
setTimeout(() => {
  showVsScreen(1);
}, 100);
