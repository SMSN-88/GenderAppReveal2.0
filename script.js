const SIZE = 10;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const WORDS = ["BABY","BOY","LOVE","SMILE","FAMILY","JOY","HOPE","CUTE"];

const DIRECTIONS = [
  [1,0],[-1,0],[0,1],[0,-1],
  [1,1],[-1,-1],[1,-1],[-1,1]
];

const gridEl = document.getElementById("grid");
const wordListEl = document.getElementById("wordList");
const revealEl = document.getElementById("reveal");
const shuffleBtn = document.getElementById("shuffleBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

let board = [];
let placements = [];
let foundWords = new Set();

let isSelecting = false;
let startCell = null;
let currentPath = [];

// --- Board generation ---
function randInt(n){ return Math.floor(Math.random()*n); }

function makeEmptyBoard(){
  board = Array.from({length:SIZE},()=>Array(SIZE).fill(""));
}

function canPlace(word,r,c,dx,dy){
  const L = word.length;
  const endR = r+dy*(L-1);
  const endC = c+dx*(L-1);
  if(endR<0||endR>=SIZE||endC<0||endC>=SIZE) return false;
  for(let i=0;i<L;i++){
    const rr=r+dy*i, cc=c+dx*i;
    const ch=board[rr][cc];
    if(ch!==""&&ch!==word[i]) return false;
  }
  return true;
}

function placeWord(word){
  for(let t=0;t<200;t++){
    const [dx,dy]=DIRECTIONS[randInt(DIRECTIONS.length)];
    const r=randInt(SIZE), c=randInt(SIZE);
    if(!canPlace(word,r,c,dx,dy)) continue;
    const cells=[];
    for(let i=0;i<word.length;i++){
      const rr=r+dy*i, cc=c+dx*i;
      board[rr][cc]=word[i];
      cells.push({r:rr,c:cc,index:rr*SIZE+cc});
    }
    placements.push({word,cells});
    return true;
  }
  return false;
}

function fillRandomLetters(){
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      if(board[r][c]==="") board[r][c]=LETTERS[randInt(LETTERS.length)];
    }
  }
}

function renderGrid(){
  gridEl.innerHTML="";
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const div=document.createElement("div");
      div.className="cell";
      div.textContent=board[r][c];
      div.dataset.r=r;
      div.dataset.c=c;
      div.dataset.index=r*SIZE+c;
      gridEl.appendChild(div);
    }
  }
}

function renderWordList(){
  wordListEl.innerHTML="";
  WORDS.forEach(w=>{
    const item=document.createElement("div");
    item.className="word-item";
    item.textContent=w;
    item.dataset.word=w;
    wordListEl.appendChild(item);
  });
}

// --- Game logic ---
function markWordFound(word){
  foundWords.add(word);
  const placement=placements.find(p=>p.word===word);
  if(placement){
    placement.cells.forEach(cell=>{
      const node=gridEl.children[cell.index];
      node.classList.remove("highlight");
      node.classList.add("found");
    });
  }
  const listItem=wordListEl.querySelector(`[data-word="${word}"]`);
  if(listItem) listItem.classList.add("found");

  if(foundWords.size===WORDS.length){
    triggerReveal();
  }
}

function triggerReveal(){
  revealEl.style.display="block";
  playAgainBtn.style.display="inline-block";
  const duration=2000;
  const end=Date.now()+duration;
  const defaults={startVelocity:32,spread:360,ticks:80,zIndex:9999,colors:['#f321e5ff','#d34ff0ff','#f990e4ff','#ed1eedff']};
  (function frame(){
    confetti({...defaults,particleCount:30,origin:{x:0.2,y:0.6}});
    confetti({...defaults,particleCount:30,origin:{x:0.8,y:0.6}});
    if(Date.now()<end) requestAnimationFrame(frame);
  })();
}

function resetSelectionVisuals(){
  gridEl.querySelectorAll(".cell.highlight").forEach(n=>n.classList.remove("highlight"));
}

// --- Selection mechanics ---
function buildPath(start,end){
  const sr=parseInt(start.dataset.r), sc=parseInt(start.dataset.c);
  const er=parseInt(end.dataset.r), ec=parseInt(end.dataset.c);
  const dx=Math.sign(ec-sc), dy=Math.sign(er-sr);
  if(!(dx===0||dy===0||Math.abs(dx)===Math.abs(dy))) return [];
  const path=[];
  let r=sr,c=sc;
  while(true){
    const idx=r*SIZE+c;
    const node=gridEl.children[idx];
    if(!node) break;
    path.push(node);
    if(r===er&&c===ec) break;
    r+=dy; c+=dx;
    if(r<0||r>=SIZE||c<0||c>=SIZE) break;
  }
  return path;
}

function highlightPath(path){
  resetSelectionVisuals();
  currentPath=path;
  path.forEach(n=>n.classList.add("highlight"));
}

function pathToString(path){
  return path.map(n=>n.textContent).join("");
}

function isWordInPlacements(word,path){
  const indices=path.map(n=>parseInt(n.dataset.index));
  for(const p of placements){
    if(p.word!==word) continue;
    const forward=p.cells.map(c=>c.index);
    const reverse=[...forward].reverse();
    const eqForward=forward.length===indices.length&&forward.every((v,i)=>v===indices[i]);
    const eqReverse=reverse.length===indices.length&&reverse.every((v,i)=>v===indices[i]);
    if(eqForward||eqReverse) return true;
  }
  return false;
}

function tryCommitSelection(){
  if(currentPath.length===0) return;
  const str=pathToString(currentPath);
  const rev=str.split("").reverse().join("");
  for(const w of WORDS){
    if((str===w||rev===w)&&isWordInPlacements(w,currentPath)){
      markWordFound(w);
      break;
    }
  }
  resetSelectionVisuals();
}

// --- Pointer events for mobile + desktop ---
function getCellFromPoint(x,y){
  const el=document.elementFromPoint(x,y);
  return el&&el.classList.contains("cell")?el:null;
}

function onPointerDown(e){
  e.preventDefault();
  const targetCell=e.target.closest(".cell");
  if(!targetCell) return;
  isSelecting=true;
  startCell=targetCell;
  currentPath=[targetCell];
  targetCell.classList.add("highlight");
  gridEl.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e){
  if(!isSelecting||!startCell) return;
  const cell=getCellFromPoint(e.clientX,e.clientY);
  if(!cell) return;
  const path=buildPath(startCell,cell);
  if(path.length) highlightPath(path);
}

function onPointerUp(e){
  if(!isSelecting) return;
  gridEl.releasePointerCapture?.(e.pointerId);
  tryCommitSelection();
  isSelecting=false;
  startCell=null;
  currentPath=[];
}

// --- Setup ---
function setupPuzzle(){
  placements=[];
  foundWords=new Set();
  revealEl.style.display="none";
  playAgainBtn.style.display="none";
  makeEmptyBoard();
  const shuffled=[...WORDS].sort(()=>Math.random()-0.5);
  shuffled.forEach(word=>placeWord(word));
  fillRandomLetters();
  renderGrid();
  renderWordList();
}

gridEl.addEventListener("pointerdown",onPointerDown,{passive:false});
gridEl.addEventListener("pointermove",onPointerMove,{passive:false});
window.addEventListener("pointerup",onPointerUp,{passive:false});
window.addEventListener("pointercancel",onPointerUp,{passive:false});

shuffleBtn.addEventListener("click",setupPuzzle);
playAgainBtn.addEventListener("click",setupPuzzle);

// Initialize
setupPuzzle();