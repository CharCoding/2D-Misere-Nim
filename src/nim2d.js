'use strict';
/* Move rating:
-1: The board is empty. (EmptyW)
0: This move leaves the opponent with an 1x1 square. (1x1W)
1: This move leaves the opponent with a 2x2 square. (2x2W)
1 to losing.length - 1: This move leaves the opponent with a position in the losing dictionary. (DictW)
Lower is better, since it's closer to the 2x2 square.
losing.length: This is a random 1x1 move. (FastR, BestR)
losing.length + 1 to losing.length * 2 - 1: This move gives the opponent the opportunity to leave you with a position in the losing dictionary. (BestL, Dict#L)
Lower is better, since the index away from 2x2 square is subtracted from the rating.
losing.length * 2 - 1: This move is one move away from a 2x2 square.
losing.length * 2: This move is one move away from an 1x1 square.
losing.length * 2 + 1: This move takes everything. Last, only possible, losing move. (1x1L)
Any other value: Error
*/
let timer, animation = false, turn = 2;
const s = 6, l = 50, board = new Array(s), losing = [73,978,14683,15259,16347,21403,22491,22747,24027,25435,27355,28635,30555,31707,32091,32475,32667,59164,91804,104867,115619,121315,124764,125411,151388,160476,163804,169443,170467,173404,181219,181731,182108,189276,190364,193116,196579,202979,206044,209891,213731,214748,216668,218083,221916,222684,235427,235875,236451,238435,239324,239971,243683,246627,248547,249059,253916,257507,261084,261724,261987,811812,919332,926052,942500,942948,944036,1335972,1443492,1450212,1467108,1467812,1598052,1599268,1705572,1713380,1722276,1728996,1729892,1730212,1730532,1860452,1861540,1967972,1975140,1975716,1976036,1991268,1991588,1992164,1992484,2384292,2385828,2491812,2500068,2639652,2646372,2753892,2770788,2778532,2901924,2909092,2909988,3016612,3024228,3039716,3041124,3163812,3170532,3278052,3294628,3294948,3302884,3432932,3434148,3540452,3547620,3548388,3557284,3565284,3688164,3695332,3696036,3696484,3802852,3810788,3818980,3819108,3826916,3827620,3957732,4065252,4089252,4089828], // 134 sorted losing positions
  hist = [], rollback = [],
  clone = board => board.map(x => x.slice()),
  r = x => x & x - 1, // check if x has only 1 bit set (bithack used in sideways addition)
  //rating = x => Math.round(Math.atan(losing.length - x) * 31.830988618379067 + 50), // "confidence interval" (fake data)
  /*// Debugging
  tri = n => n * (n - 1) / 2,
  equal = (a, b) => a >= b && a <= b,
  triDiff = (x, y) => (x - y) * (x + y - 1) / 2,
  fx = () => { board.forEach(x => x.reverse()); update(); }, // flip X
  fy = () => { board.reverse(); update(); }, // flip Y
  tb = () => { // transpose board
    for(let i = s; i--;) // minimum # of swaps
      for(let j = i; j--;) {
        const temp = board[i][j];
        board[i][j] = board[j][i];
        board[j][i] = temp;
      }
    update();
  },
  gen = () => {
    let str = boardToInt(shrink(board));
    fx();
    str += ',' + boardToInt(shrink(board));
    fy();
    str += ',' + boardToInt(shrink(board));
    fx();
    str += ',' + boardToInt(shrink(board));
    tb();
    str += ',' + boardToInt(shrink(board));
    fx();
    str += ',' + boardToInt(shrink(board));
    fy();
    str += ',' + boardToInt(shrink(board));
    fx();
    console.log(str + ',' + boardToInt(shrink(board)));
  },
  transpose = board => {
    const w = board.length, h = board[0].length, tboard = new Array(h);
    for (let i = h; i--;) {
      tboard[i] = new Uint8Array(w);
      for (let j = w; j--;)
        tboard[i][j] = board[j][i];
    }
    return tboard;
  },
  //*/
  strToBoard = s => s.split('/').map(x => Uint8Array.from(x)),
  binSearch = x => { // Searches if x exists in losing[] in O(log n)
    let min = 0, max = losing.length - 1, index, current;
    while(min <= max) {
      index = min + max >>> 1;
      current = losing[index];
      if(current < x)
        min = index + 1;
      else if(current > x)
        max = index - 1;
      else
        return index;
    }
    return -min - 1; // returns -insertion point - 1 if not found
  },
  mouse = { sx: 0, sy: 0, ex: 0, ey: 0, down: false },
  t = c.getContext('2d');
for (let i = s; i--;) board[i] = new Uint8Array(s).fill(1);
t.strokeStyle = '#ccc';
t.font = '24px Arial';
t.textAlign = 'center';
t.textBaseline = 'middle';
t.lineWidth = 2;
function boardToInt(board) {
  if(!board.length) return 0;
  if(typeof board == 'string') board = strToBoard(board);
  let sum = 0;
  for (const row of board)
    for (const cell of row)
      sum = sum * 2 + cell;
  return sum * 64 + board.length * 8 + board[0].length; // potentially optimizeable?
}
function intToBoard(int) {
  const w = int >>> 3 & 7, h = int & 7, board = new Array(w);
  int = Math.floor(int / 64);
  for(let i = board.length; i--;) {
    board[i] = new Uint8Array(h);
    for(let j = board[i].length; j--;) {
      board[i][j] = int & 1;
      int = Math.floor(int / 2);
    }
  }
  return board;
}
/*// doesn't work yet
function binaryTransform(int) {
  const mask = int & 63, w = mask >> 3, h = mask & 7, maskW = (1 << w) - 1, transforms = [];
  let maskH = 0, fx = 0, fy = 0, fxy = 0;
  int = Math.floor(int / 64);
  for(let i = h; i--;) {
    maskH |= 1 << i * w;
    fy |= ((int >>> i * w) & maskW) << (h - i) * w;
  }
  for(let i = w; i--;) {
    fx |= (int & maskH << i) >>> i;
    fxy |= (fy & maskH << i) >>> i;
  }
  transforms.push(fx * 64 + mask, fy * 64 + mask, fxy * 64 + mask);
  return transforms;
}
*/
/*// Unused
class Move {
  constructor(board, x0, y0, x1 = x0, y1 = y0) {
    this.old = board;
    this.new = clone(board);
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    take(this.new, x0, y0, x1, y1);
    const oldHVPairs = analyze(board), newHVPairs = analyze(this.new);
    this.dXPairs = newHVPairs[0] - oldHVPairs[0];
    this.dYPairs = newHVPairs[1] - oldHVPairs[1];
    if(losing.includes(boardToInt(this.new))) this.rating = 9;
    else this.rating = 4;
  }
  make() {
    return take(board, this.x0, this.y0, this.x1, this.y1);
  }
}
class State {
  constructor(board) {
    this.board = board;
    this.shrunk = shrink(board);
    [this.XPairs, this.YPairs] = analyze(board);
  }
  get moves() {
    const possibleMoves = [], filledX = [], filledY = [], shrunk = shrink(board, filledX, filledY);
    for (const rx1 of filledX)
      for (const ry1 of filledY)
        for (const rx0 of filledX)
          for (const ry0 of filledY)
            if (rx1 >= rx0 && ry1 >= ry0 && isPrimitive(board, rx0, ry0, rx1, ry1))
              possibleMoves.push([rx0, ry0, rx1, ry1]);
    return possibleMoves;
  }
}
function analyze(board, l, index) {
  const tboard = transpose(board);
  let hPairs = 0, vPairs = 0, radicals = 0;
  for (let i = s; i--;) {
    const s = sum(board[i]);
    if(s == 1) radicals++;
    hPairs += tri(s);
  }
  for (let j = s; j--;) {
    const s = sum(tboard[j]);
    if(s == 1) radicals++;
    vPairs += tri(s);
  }
  info.textContent = `Position ${index}: ${l} moves, ${hPairs} Hpairs, ${vPairs} Vpairs, ${radicals} radicals.`
}
//*/
function log(board) {
  let str = '';
  for (let i = 0; i < board[0].length; i++) {
    for (let j = 0; j < board.length; j++)
      str += board[j][i] + ' '; // swap i and j so that x is horizontal and y is vertical
    str += '\n';
  }
  console.log(str);
}
function shrink(board, filledX = [], filledY = []) { // gets rid of empty rows and columns
  if(board[0].length == 0) return 0;
  filledX.length = filledY.length = 0;
  const narr = board.filter((x, i) => x.some(y => y) && filledX.push(i)).map(x => Array.from(x));
  if (!narr.length) return narr;
  for (let j = narr[0].length; j--;) {
    let filled = false;
    for (const row of narr)
      if (row[j]) {
        filled = true;
        filledY.unshift(j);
        break;
      }
    if (!filled)
      for (const row of narr) // where are the brackets, you ask?
        row.splice(j, 1); // I ate them for breakfast.
  }
  return narr;
}
function take(board, x0, y0, x1, y1) {
  const removed = [];
  for (let i = x0; i <= x1; i++)
    for (let j = y0; j <= y1; j++)
      if (board[i][j]) {
        board[i][j] = 0;
        removed.push(i, j);
      }
  if(removed.length) { // save to history and reset rollback
    hist.push(removed);
    rollback.length = 0;
  }
  return removed.length; // == 0 is an invalid move
}
function takeFast(board, x0, y0, x1, y1) { // use this for AI's virtual take()
  for(let i = x0; i <= x1; i++)
    for(let j = y0; j <= y1; j++)
      board[i][j] = 0;
}
function loadStorage() { // load losing moves the AI found on its own from localStorage
  if(localStorage.L) {
    const pos = localStorage.L.split(',');
    for(let i = pos.length; --i;) { // skip the first one; it's always an empty string.
      const int = pos[i], index = binSearch(int);
      if(index < 0)
        losing.splice(-index - 1, 0, int);
    }
  } else localStorage.L = '';
}
function loadPosition(x) { // load an integer position to the board
  if(typeof x != 'number') x = +load.value; // specify x to use in console, otherwise defaults to lvl
  if(x < 9) return;
  reset();
  const newBoard = intToBoard(x);
  for(let i = s; i--;)
    if(newBoard[i])
      for(let j = s; j--;)
        board[i][j] = newBoard[i][j] || 0;
    else
      board[i].fill(0);
  load.value = '';
  update();
}
function stop() {
  if(animation) {
    clearInterval(animation);
    mouse.down = animation = false;
    draw();
    info.textContent += '; AI stopped.';
  }
}
function undo() {
  if(!hist.length) return;
  turn--;
  const removed = hist.pop();
  for(let i = 0; i < removed.length; i += 2)
    board[removed[i]][removed[i + 1]] = 1;
  rollback.push(removed);
  update();
}
function redo() {
  if(!rollback.length) return;
  turn++;
  const previous = rollback.pop();
  for(let i = 0; i < previous.length; i += 2)
    board[previous[i]][previous[i + 1]] = 0;
  hist.push(previous);
  update();
}
function reset() {
  board.forEach(e => e.fill(1));
  hist.length = rollback.length = 0;
  turn = 2;
  current.value = 4398046511094;
  info.textContent = '';
  if(auto.checked && p1ai.checked) {
    const rand = randomMove();
    animate(rand.concat(rand)); // No reason to attempt calculating the first move
    if(analyze.checked)
      info.textContent = `(${rand.join(', ')}), (${rand.join(', ')}), 0 (FastR)`;
  }
  draw();
}
function update() {
  current.value = boardToInt(shrink(board));
  draw();
}
function isPrimitive(board, x0, y0, x1, y1) { // finds if a move on board has no equivalent move
  if (x0 == x1 && y0 == y1) return !!board[x0][y0]; // with smaller area
  let x0Empty = true, x1Empty = true, y0Empty = true, y1Empty = true;
  for (let j = y1; j >= y0; j--) {
    if (board[x0][j]) x0Empty = false;
    if (board[x1][j]) x1Empty = false;
  }
  for (let i = x1; i >= x0; i--) {
    if (board[i][y0]) y0Empty = false;
    if (board[i][y1]) y1Empty = false;
  }
  return !(x0Empty || x1Empty || y0Empty || y1Empty); // basically gets rid of duplicate moves
}
function time(board, depth = lvl.value) { // testing how long the AI takes
  console.time('AI' + depth);
  AI(board, +depth);
  console.timeEnd('AI' + depth);
}
async function timeTest(rounds = 20) {
  let avg = 0, best = 1700, worst = 1700, then;
  for(let i = rounds; i--;) {
    then = performance.now();
    await AI(board, 2);
    const time = performance.now() - then;
    if(time < best) best = time;
    else if(time > worst) worst = time;
    avg += time / rounds;
  }
  console.log(avg, best, worst);
}
function randomMove() {
  const moves = [];
  for(let i = s; i--;)
    for(let j = s; j--;)
      if(board[i][j]) moves.push([i, j]);
  return moves[Math.random() * moves.length | 0];
}
// Warning: The following huge, recursive, spaghetti AI code is still a work in progress.
// Only keep reading if you are or are accompanied by a senior JavaScript developer.
function AI(board, depth) { // literally a bunch of if statements
  const filledX = [], filledY = [];
  if(depth < +lvl.value) { // only the first run needs the full board
    var shrunk = board; // otherwise just assume board is already shrunk by last AI() call
    filledX.push(...board.keys());
    filledY.push(...board[0].keys());
  } else
    var shrunk = shrink(board, filledX, filledY);
  if(!filledX.length)
    return [-1,-1,-1,-1,-1,'EmptyW']; // no pieces on the board, did we already win?
  const int = boardToInt(shrunk), losingIndex = binSearch(int), sums = new Uint8Array(8),
    maxX = shrunk.length - 1, maxY = shrunk[0].length - 1;
  // sums[] will hold the bit representations of the 4 sides and then 1 layer underneath each of the 4 sides
  let x0 = filledX[0], y0 = filledY[0], x1 = filledX[maxX], y1 = filledY[maxY];
  if(maxX == 0) {
    if(maxY == 0)
      return [x0, y0, x0, y0, losing.length * 2 + 1, '1x1L']; // one piece on the board
    return [x0, filledY[1], x1, y1, 0, 'nx1W']; // one vertical row on the board
  }
  if(maxY == 0)
    return [filledX[1], y0, x1, y1, 0, '1xnW']; // one horizontal row on the board
  if(losingIndex >= 0) { // at this point there must be at least 2x2=4 squares left
    for(let i = maxX; --i;)   // This will try to return a square not on the border
      for(let j = maxY; --j;) // This is also suboptimal, doesn't check for outer border count
        if(shrunk[i][j])      // No good either, will still not find better response
          return [filledX[i], filledY[j], filledX[i], filledY[j], losing.length * 2 - losingIndex, `Dict${losingIndex}CL`];
    [x0, y0] = randomMove(); // This might give suboptimal replies
    return [x0, y0, x0, y0, losing.length * 2 - losingIndex, `Dict${losingIndex}RL`];
  }
  // without the following checks, AI() takes even longer...
  for(let i = maxX + 1; i--;) { // filling sums[]
    sums[0] = (sums[0] << 1) | shrunk[i][0]; // top row
    sums[4] = (sums[4] << 1) | shrunk[i][1]; // 2nd top row
    sums[5] = (sums[5] << 1) | shrunk[i][maxY - 1]; // 2nd bottom row
    sums[1] = (sums[1] << 1) | shrunk[i][maxY]; // bottom row
  }
  for(let j = maxY + 1; j--;) {
    sums[2] = (sums[2] << 1) | shrunk[0][j]; // left column
    sums[6] = (sums[6] << 1) | shrunk[1][j]; // 2nd left column
    sums[7] = (sums[7] << 1) | shrunk[maxX - 1][j]; // 2nd right column
    sums[3] = (sums[3] << 1) | shrunk[maxX][j]; // right column
  }
  for(let i = 8; i--;) { // add extra bits of information about # of pieces left on each row
    const rx = r(sums[i]); // highest bit set: 1 piece left. second highest: 2 pieces left.
    sums[i] |= ((rx == 0) + (r(rx) == 0)) << s; // this breaks for s > 6
  }
  for(let i = 4; i--;) { // Crazy optimizations going on here
    if(sums[i] & 128 || sums[i] & 64 && sums[i] == sums[i | 4]) { // check if a side is
      const shift = 2 - (sums[i] >>> 7); // reducible to 2x2 or 1x1
      switch(i) { // move the corresponding side inward depending on # of bits left
        case 0:
          y0 = filledY[shift];
          break;
        case 1:
          y1 = filledY[maxY - shift];
          break;
        case 2:
          x0 = filledX[shift];
          break;
        default: // case 3:
          x1 = filledX[maxX - shift];
      }                                    // 0: 1x1 (winning), 1: 2x2 (winning)
      return [x0, y0, x1, y1, shift - 1, `${shift}x${shift}:${shift - 1 << 2 | i}W`];
    }
  }
  if(sums[0] & 64 && sums[0] == sums[1]) // check if top row == bottom row
    return [x0, filledY[1], x1, filledY[maxY - 1], 1, '2x2TBW'];
  if(sums[2] & 64 && sums[2] == sums[3]) // check if left column == right column
    return [filledX[1], y0, filledX[maxX - 1], y1, 1, '2x2LRW'];
  if(depth < 1) { // base case for recursion ends here: random move
    [x0, y0] = randomMove();
    return [x0, y0, x0, y0, losing.length, 'FastR'];
  }
  let bestRating = losing.length << 1, moves = []; // Now we go through every possible move
  for (const rx1 of filledX) // Not sure how to optimize skipping moves that are already checked
    for (const ry1 of filledY) // also, quadruple nested for loops :D
      for (const rx0 of filledX) // Sorry
        for (const ry0 of filledY)
          if (rx1 >= rx0 && ry1 >= ry0 && isPrimitive(board, rx0, ry0, rx1, ry1)) { // remove duplicates
            const newBoard = clone(board);
            takeFast(newBoard, rx0, ry0, rx1, ry1); // simulate making the move
            const s = shrink(newBoard), i = boardToInt(s), b = binSearch(i); // check if new position is losing
            if(b >= 0) // since losing moves are relatively rare, return when encountering any
              return [rx0, ry0, rx1, ry1, b, 'DictW']; // although there *may* be an even better move.
            if((i & 56) > 16 && (i & 7) > 2) { // basic restrictions on a move: can't leave only 2 rows
              const rating = losing.length * 2 - AI(s, depth - 1)[4]; // recursive evaluation
              if(rating < bestRating) { // if the new rating is better, remove all previous ones
                bestRating = rating;
                moves = [[rx0, ry0, rx1, ry1]];
              } else if(rating == bestRating) // otherwise add this move
                moves.push([rx0, ry0, rx1, ry1]);
            }
          }
  //[x0, y0, x1, y1] = moves[Math.random() * moves.length | 0]; // random best move
  if(depth == 2 && learning.checked && bestRating > losing.length) {
    localStorage.L += ',' + int;
    losing.splice(-losingIndex - 1, 0, int);
    /*// later
    if(int <= 2147483647) {
      const transforms = binaryTransform(int);
      for(let i = transforms.length; i--;) {
        const b = binSearch(transforms[i]);
        if(b < 0)
          losing.splice(-b - 1, 0, transforms[i]);
      }
    }
    //*/
    return moves[Math.random() * moves.length | 0].concat([bestRating, 'BestL']);
    //return [x0, y0, x1, y1, bestRating, 'BestL'];
  }
  return moves[Math.random() * moves.length | 0].concat([bestRating, 'BestR']); // coordinates, rating, and how the move was found
}
function AIWrapper() {
  const move = AI(board, +lvl.value);
  if(move[0] < 0) return;
  if(analyze.checked)
    info.textContent = `(${move[0]}, ${move[1]}), (${move[2]}, ${move[3]}), ${losing.length - move[4]} (${move[5]})`;
  else
    info.textContent = '';
  if(auto.checked)
    animate(move);
}
// Event listeners, they kind of work most of the time.
c.addEventListener('mousedown', e => {
  if(!animation) {
    mouse.sx = mouse.ex = e.offsetX;
    mouse.sy = mouse.ey = e.offsetY;
    mouse.down = true;
  }
});
c.addEventListener('mousemove', e => {
  if(mouse.down && !animation) {
    mouse.ex = e.offsetX; mouse.ey = e.offsetY;
  }
});
function mouseUp() { // Detects if a move has been made
  mouse.down = false;
  const x0 = Math.min(mouse.sx, mouse.ex) / l >>> 1, // pixel to coords
        y0 = Math.min(mouse.sy, mouse.ey) / l >>> 1,
    x1 = Math.max(mouse.sx, mouse.ex) / l - 1 >>> 1,
    y1 = Math.max(mouse.sy, mouse.ey) / l - 1 >>> 1;
  if(take(board, x0, y0, x1, y1)) { // if valid move
    turn++;
    if(board.every(e => e.every(f => !f))) {
      if(confirm(`Player ${1 + (turn & 1)} won in ${turn >>> 1} moves!\nStart a new game?`))
        reset();
    } else if(turn & p2ai.checked || ~turn & p1ai.checked)
      AIWrapper();
    current.value = boardToInt(shrink(board));
  }
  draw();
};
c.addEventListener('mouseup', e => {
  if(mouse.down && !animation) mouseUp();
});
c.addEventListener('mouseout', e => {
  if(!animation) {
    mouse.down = false;
    draw();
  }
});
p1ai.addEventListener('input', e => {
  if(~turn & p1ai.checked)
    AIWrapper();
});
p2ai.addEventListener('input', e => {
  if(turn & p2ai.checked)
    AIWrapper();
})
once.addEventListener('click', AIWrapper); // generate a single AI move
learning.addEventListener('click', e => {
  if(learning.checked) {
    if(confirm('This feature requires maximum AI strength and localStorage, consumes more memory and may decrease performance. Enable anyways?')) {
      lvl.value = 2;
      loadStorage();
    } else learning.checked = false;
  } else if(confirm(`Clear localStorage (${localStorage.L.length} bytes)?`))
    localStorage.L = '';
});
stopBtn.addEventListener('click', stop);
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
resetBtn.addEventListener('click', e => {
  const x = +current.value;
  if(!x || x != 4398046511094 && confirm('Are you sure to restart the game?'))
    reset();
});
load.addEventListener('click', loadPosition);
load.addEventListener('blur', loadPosition); // these two usually covers it
document.addEventListener('keydown', e => { // key listener
  if(e.ctrlKey) return;
  switch(e.keyCode) {
    case 79: // 'O'
      AIWrapper();
      break;
    case 82: // 'R'
      const x = +current.value;
      if(!x || x != 4398046511094 && confirm('Are you sure to restart the game?'))
        reset();
      break;
    case 83: // 'S'
      stop();
      break;
    case 89: // 'Y'
      redo();
      break;
    case 90: // 'Z'
      undo();
      break;
  }
});
function draw() { // paint cycle
  t.clearRect(0, 0, 650, 650);
  const x0 = Math.min(mouse.sx, mouse.ex),
        y0 = Math.min(mouse.sy, mouse.ey),
    x1 = Math.max(mouse.sx, mouse.ex),
    y1 = Math.max(mouse.sy, mouse.ey);
  for(let i = s; i--;) {
    for(let j = s; j--;) {
      const x = (i << 1 | 1) * l, y = (j << 1 | 1) * l;
      if(board[i][j]) { // AABB collision check
        if(mouse.down && x0 < x + l && x < x1 && y0 < y + l && y < y1) t.fillStyle = '#999';
        else t.fillStyle = '#eee';
        t.fillRect(x, y, l, l);
      }
      t.fillStyle = '#666';
      t.fillText(i + ', ' + j, x + 25, y + 25);
    }
  }
  t.fillText(`${animation ? 'AI' : 'Player'} ${(turn & 1) + 1}, move ${turn >> 1}`, 325, 625);
  if(mouse.down)
    t.strokeRect(mouse.sx, mouse.sy, mouse.ex - mouse.sx, mouse.ey - mouse.sy);
}
draw();
function frame() { // to improve performance, don't draw when nothing is happening
  if(mouse.down || animation) draw();
  timer = requestAnimationFrame(frame);
}
function animate(move) { // AI animation
  mouse.down = true; // simulates user input and blocks actual user input by setting animation
  mouse.sx = mouse.ex = (move[0] * 2 + .6) * l; // to a truthy value
  mouse.sy = mouse.ey = (move[1] * 2 + .6) * l;
  let i = l + Math.ceil(Math.hypot(move[2] - move[0], move[3] - move[1]) * 32);
  const dx = ((move[2] * 2 + 2.4) * l - mouse.sx) / i, dy = ((move[3] * 2 + 2.4) * l - mouse.sy) / i;
  animation = setInterval(() => {
    mouse.ex += dx;
    mouse.ey += dy;
    if(!i--) {
      clearInterval(animation);
      animation = false;
      mouseUp();
    }
  });
}
if(learning.checked) loadStorage();
timer = requestAnimationFrame(frame);