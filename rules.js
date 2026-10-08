export const lines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];

export const winner = (board, mark) => lines.find(line => line.every(i => board[i] === mark));

const squares = (board, mark) => board.flatMap((value, i) => value === mark ? [i] : []);

export function strategyCycle(random = Math.random) {
  return random() < 0.5 ? ['erase', 'double'] : ['double', 'erase'];
}

export const CHARACTER_FLAVORS = {
  balayya: {
    offside: [
      'Simham step vesthe rules maaripothayi! That X was offside.',
      'Legend clause: Three-in-a-row cancelled by Balayya royal decree.',
      'Akhanda roar shattered that winning line!'
    ],
    erase: [
      'Akhanda Protocol: That square belongs to the temple of Balayya.',
      'Samarasimha Reddy order: One of your Xs has been exiled.',
      'Narasimha power: Your X has been turned into dust.',
      'Your X has expired under the Balayya Terms of Service.'
    ],
    double: [
      "Don't trouble the trouble: Balayya takes a second turn!",
      'Simham strikes twice: That was practice, this is for the fans.',
      'Legendary double combo: Jai Balayya!'
    ],
    draw: 'A draw against Simham? We have reopened your application.',
    seat: 'Simham needs this seat. Clear the area!',
    cleanup: 'And that one too. Akhanda leaves no trace behind.'
  },
  thalapathy: {
    offside: [
      'Master Class in session: JD erased your winning line with swag.',
      'Bloody Sweet! Leo Das just intercepted that X.',
      'Theri Baby! Three-in-a-row is against the syllabus.'
    ],
    erase: [
      'Thuppakki precision strike: Your X has expired.',
      'Bloody Sweet! Leo Das banned your square.',
      'Bigil whistle blown: Penalty on that square!',
      'Varisu inheritance tax: That square was confiscated.'
    ],
    double: [
      'Ghilli Kabaddi raid: Thalapathy strikes again!',
      'Master JD move: That was the teaser, this is the main picture.',
      'Badass Leo combo: Buy one O, get one free!'
    ],
    draw: 'A draw with Master? Cup mukkiyam bigil-u! Application rejected.',
    seat: 'Leo Das demands this seat. Bloody Sweet!',
    cleanup: 'And that one too. The Master never leaves loose ends.'
  }
};

export function planTurn(input, turn, previous = '', random = Math.random, strategy, mode = 'balayya') {
  const board = [...input], steps = [];
  const pick = values => values[Math.min(values.length - 1, Math.floor(random() * values.length))];
  const flavor = CHARACTER_FLAVORS[mode] || CHARACTER_FLAVORS.balayya;
  
  const step = (changes, message = '', delay = 550) => {
    for (const [i, mark] of changes) board[i] = mark;
    steps.push({ board: [...board], changed: changes.map(([i]) => i), message, delay });
  };
  
  const erase = (i, message) => step([[i, null]], message);
  
  const place = () => {
    let empty = squares(board, null);
    if (!empty.length) {
      erase(pick(squares(board, 'X')), flavor.seat);
      empty = squares(board, null);
    }
    const wins = empty.filter(i => {
      const b = [...board];
      b[i] = 'O';
      return winner(b, 'O');
    });
    step([[pick(wins.length ? wins : empty), 'O']]);
  };

  // The opening is always exactly one ordinary move, without a violation.
  if (turn === 1) {
    place();
    return { steps, board, kind: 'legal' };
  }

  const kind = strategy ?? pick(['double', 'erase'].filter(k => k !== previous));
  const playerLine = winner(board, 'X');
  
  if (playerLine) {
    const allWins = lines.filter(line => line.every(i => board[i] === 'X'));
    const shared = playerLine.filter(i => allWins.every(line => line.includes(i)));
    const target = pick(shared.length ? shared : playerLine);
    erase(target, pick(flavor.offside));
  } else if (kind === 'erase') {
    const target = pick(squares(board, 'X'));
    if (target !== undefined) {
      erase(target, pick(flavor.erase));
    }
  }
  
  while (winner(board, 'X')) {
    erase(pick(winner(board, 'X')), flavor.cleanup);
  }
  
  place();
  
  if (kind === 'double' && !winner(board, 'O')) {
    steps.push({ board: [...board], changed: [], message: '', cue: 'Your turn.', delay: 850 });
    const start = steps.length;
    place();
    steps[start].message = pick(flavor.double);
  }
  
  // Never hand back a full board as a draw.
  if (!winner(board, 'O') && !board.includes(null)) {
    erase(pick(squares(board, 'X')), flavor.draw);
  }
  
  return { steps, board, kind };
}
