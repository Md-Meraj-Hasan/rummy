'use strict';
const $ = (s,root=document)=>root.querySelector(s);
const screen=$('#screen');
const SUITS=['♠','♥','♦','♣'], RED=new Set(['♥','♦']), RANKS=Array.from({length:13},(_,i)=>i+1), LABEL={1:'A',11:'J',12:'Q',13:'K'};
let state={page:'menu',opponents:3,difficulty:'Normal',round:0,scores:[0,0,0,0],names:['You','Computer 1','Computer 2','Computer 3'],sound:true,selected:-1,hand:[],hands:[],stock:[],discard:[],history:[],wild:8,turn:0,drawn:false,roundOver:false,groups:[],undo:null,message:'Choose Stock or Discard to draw a card.'};
function rank(r){return LABEL[r]||String(r)} function label(c){return c[0]==='JOKER'?'★Joker':rank(c[0])+c[1]} function isJoker(c){return c[0]==='JOKER'||c[0]===state.wild} function pts(c){return isJoker(c)?0:([1,11,12,13].includes(c[0])?10:c[0])}
function card(r,s,d=0){return [r,s,d]} function deckNew(){let d=[];for(let n=0;n<2;n++)for(const s of SUITS)for(const r of RANKS)d.push(card(r,s,n));for(let j=0;j<4;j++)d.push(card('JOKER','★',j));return d}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function sound(kind='tap'){if(!state.sound)return;try{let C=window.AudioContext||window.webkitAudioContext;if(!C)return;let ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=kind==='win'?760:kind==='error'?180:kind==='deal'?480:600;g.gain.setValueAtTime(.045,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.09);o.start();o.stop(ctx.currentTime+.1);o.onended=()=>ctx.close()}catch(e){}}
function btn(text,fn,cls=''){return `<button class="btn ${cls}" data-act="${fn}">${text}</button>`}
function renderMenu(){state.page='menu';document.body.classList.remove('in-game');screen.classList.remove('game-screen');screen.innerHTML=`<section class="panel hero"><div style="font-size:42px">♠ ♥ ♦ ♣</div><h1>INDIAN PROFESSIONAL RUMMY</h1><div class="powered">Offline Card Game</div><p>13 cards · You vs computer opponents</p><p>Same classic Rummy style with sequences, sets, printed jokers and wild joker.</p><div class="creator">Created by @cd786hassan</div></section>${btn('▶ PLAY GAME','setup')}${btn('HOW TO PLAY','rules','soft')}${btn('SCOREBOARD','scoreboard','soft')}${btn((state.sound?'🔊 SOUND: ON':'🔇 SOUND: OFF'),'sound','wine')}`}
function renderSetup(){state.page='setup';screen.innerHTML=`<section class="panel"><div class="section-title">NEW GAME</div><p class="muted">Choose how many computer opponents you want.</p><div class="section-title">COMPUTER OPPONENTS</div><div class="choice">${[1,2,3].map(n=>`<button class="${state.opponents===n?'active':''}" data-op="${n}">${n} Computer${n>1?'s':''}</button>`).join('')}</div><p class="muted">${state.opponents+1} players total, including you.</p><div class="section-title" style="margin-top:18px">DIFFICULTY</div><div class="choice">${['Easy','Normal','Hard'].map(n=>`<button class="${state.difficulty===n?'active':''}" data-diff="${n}">${n}</button>`).join('')}</div><p class="muted">Easy: relaxed · Normal: balanced · Hard: more careful card choices.</p>${btn('▶ START GAME','start')}${btn('⬅ BACK','menu','blue')}</section>`}
function renderRules(){state.page='rules';screen.innerHTML=`<section class="panel"><div class="section-title">HOW TO PLAY</div><p><b>1. Draw:</b> On your turn take one card from Stock or the top of Discard.</p><p><b>2. Discard:</b> Select a card and tap Discard. You should finish your turn with 13 cards.</p><p><b>3. Valid declaration:</b> Arrange all 13 cards into groups with at least two sequences and at least one pure sequence.</p><p><span class="tag pure">PURE SEQUENCE</span> Three or more consecutive natural cards of the same suit. No printed Joker substitution.</p><p><span class="tag impure">IMPURE SEQUENCE</span> Same-suit run completed using a Joker.</p><p><span class="tag set">SET</span> Three or four cards of the same rank, using different natural suits; Jokers can fill missing cards.</p><p><b>Wild Joker:</b> All cards of the selected wild rank act as Jokers. Printed Jokers also act as Jokers. Wild-rank cards may keep their natural rank in a pure sequence.</p><p><b>Scoring:</b> Winner gets 0 penalty points. Other hands are scored for unmatched cards; maximum penalty is 80.</p><p class="muted">This is an offline casual version. Some house rules and scoring details may differ from other Rummy apps.</p>${btn('⬅ BACK','menu','blue')}</section>`}
function renderScore(){state.page='scoreboard';screen.innerHTML=`<section class="panel"><div class="section-title">SCOREBOARD</div>${state.names.map((n,i)=>`<div class="result-row"><span>${esc(n)}</span><span class="score">${state.scores[i]||0} penalty points</span></div>`).join('')}${btn('⬅ BACK TO MENU','menu','blue')}</section>`}
function startRound(){state.round++;state.names=['You',...Array.from({length:state.opponents},(_,i)=>`Computer ${i+1}`)];state.scores=Array.from({length:state.names.length},(_,i)=>state.scores[i]||0);let d=shuffle(deckNew());state.wild=1+Math.floor(Math.random()*13);state.hands=state.names.map(()=>[]);for(let i=0;i<13;i++)for(const h of state.hands)h.push(d.pop());state.stock=d;state.discard=[state.stock.pop()];state.history=[`Opening card: ${label(state.discard[0])}`];state.turn=0;state.drawn=false;state.roundOver=false;state.selected=-1;state.groups=[];state.message='Draw one card from Stock or Discard.';state.page='game';renderGame();}
function cardHtml(c,i,cls=''){let isred=RED.has(c[1])?'red':'';let isprint=c[0]==='JOKER';return `<div class="card ${isred} ${cls}" data-card="${i}" title="${label(c)}"><span class="corner">${isprint?'★':rank(c[0])}</span><span class="rank">${isprint?'★':rank(c[0])}</span><span class="suit">${c[1]}</span></div>`}
function renderGame(){state.page='game';document.body.classList.add('in-game');const you=state.hands[0]||[];let groupMap={};for(const g of state.groups)for(const i of g.indices)groupMap[i]=g.kind;let hand=you.map((c,i)=>cardHtml(c,i,`${state.selected===i?'selected':''} ${groupMap[i]?'group-'+groupMap[i]:''}`)).join('');let allNames=state.names.map((n,i)=>`<div class="playerbox ${i===0?'youbox':''}"><b>${i===0?'YOU':'♟ '+esc(n)}</b><span>${state.hands[i]?.length||0} cards</span><small>${state.scores[i]||0} pts</small></div>`).join('');let top=state.discard.length?cardHtml(state.discard[state.discard.length-1],-1):'<div class="card back">—</div>';screen.classList.add('game-screen');screen.innerHTML=`<section class="status-panel"><div class="gamebar"><span class="pill">WILD JOKER: ${rank(state.wild)}</span><span class="pill">ROUND ${state.round}</span><span class="pill">TURN ${state.turn+1}</span></div><div class="playerrow">${allNames}</div><div class="turnmessage">${esc(state.message)}</div></section><section class="hand-panel panel"><div class="hand-title"><span>YOUR HAND · ${you.length} CARDS</span><button class="btn small wine" data-act="sort">SORT</button></div><div class="hand">${hand}</div></section><section class="table-panel panel"><div class="tabletray"><div class="traycell open"><b>OPEN</b>${top}</div><div class="traycell empty"></div><div class="traycell empty"></div><div class="traycell empty"></div><div class="traycell waste"><b>WASTE</b><button data-act="pick" class="wastebtn" aria-label="Pick discard">▤</button><small>${state.discard.length} cards</small></div></div><div class="actions">${btn('TAKE DISCARD','pick','soft')}${btn(`DRAW STOCK · ${state.stock.length} CARDS`,'stock','')}${btn('SORT CARDS','sort','')}${btn('HINT','hint','wine')}${btn('UNDO','undo','')}${btn('DECLARE','declare','')}</div><div class="extra-actions">${btn('DISCARD SELECTED','discard','wine')}${btn('NEW GAME','newgame','blue')}</div></section>`;}

function groupKind(cards){if(cards.length<3||cards.length>4)return null;let printed=cards.filter(c=>c[0]==='JOKER'),wilds=cards.filter(isJoker),fixed=cards.filter(c=>!isJoker(c));const consecutive=(v,n)=>v.length===n&&new Set(v).size===n&&v.slice().sort((a,b)=>a-b).every((x,i,a)=>i===0||x===a[i-1]+1);
if(!printed.length&&cards.every(c=>c[1]===cards[0][1])){let r=cards.map(c=>c[0]);if(r.every(Number.isInteger)){let low=r.map(x=>x===1?1:x),high=r.map(x=>x===1?14:x);if(consecutive(low,cards.length)||consecutive(high,cards.length))return 'pure'}}
if(fixed.length&&new Set(fixed.map(c=>c[1])).size===1&&fixed.every(c=>Number.isInteger(c[0]))){let vals=fixed.map(c=>c[0]);if(new Set(vals).size===vals.length){let variants=[vals.map(r=>r===1?14:r)];if(vals.includes(1))variants.push(vals.map(r=>r===1?1:r));for(let v of variants)for(let st=1;st<=14-cards.length;st++){let run=Array.from({length:cards.length},(_,i)=>st+i);if(v.every(x=>run.includes(x))&&run.filter(x=>!v.includes(x)).length===wilds.length)return 'impure'}}}
if(fixed.length&&new Set(fixed.map(c=>c[0])).size===1&&new Set(fixed.map(c=>c[1])).size===fixed.length)return 'set';if(wilds.length===cards.length)return 'set';return null}
function getGroups(hand){
// Match the original Python game's group selection: maximize covered cards,
// then prefer pure sequence, impure sequence, and finally sets.
const candidates=[];
for(let size of [3,4])combos(hand.length,size,inds=>{
 const kind=groupKind(inds.map(i=>hand[i]));
 if(kind)candidates.push({indices:inds.slice(),kind,mask:inds.reduce((m,i)=>m|(1<<i),0),priority:{pure:30,impure:20,set:10}[kind]||0});
});
const n=hand.length,full=(1<<n)-1,memo=new Map();
const byCard=Array.from({length:n},()=>[]);
for(const g of candidates)for(const i of g.indices)byCard[i].push(g);
function solve(mask){
 if(mask===full)return {covered:0,quality:0,groups:[]};
 if(memo.has(mask))return memo.get(mask);
 let i=0;while(mask&(1<<i))i++;
 let rest=solve(mask|(1<<i));
 let best={covered:rest.covered,quality:rest.quality,groups:rest.groups};
 for(const g of byCard[i]){
  if(g.mask&mask)continue;
  const tail=solve(mask|g.mask),candidate={covered:tail.covered+g.indices.length,quality:tail.quality+g.priority*g.indices.length,groups:[...tail.groups,{indices:g.indices,kind:g.kind}]};
  if(candidate.covered>best.covered||(candidate.covered===best.covered&&candidate.quality>best.quality))best=candidate;
 }
 memo.set(mask,best);return best;
}
return solve(0).groups.sort((a,b)=>(({pure:0,impure:1,set:2}[a.kind])-({pure:0,impure:1,set:2}[b.kind]))||Math.min(...a.indices)-Math.min(...b.indices)||a.indices.length-b.indices.length);
}
function validHand(hand){if(hand.length!==13)return false;let gs=getGroups(hand),by=Array.from({length:13},()=>[]);gs.forEach(g=>g.indices.forEach(i=>by[i].push(g)));let memo=new Set();function solve(mask,seq,pure){if(mask===8191)return seq>=2&&pure;let key=mask+'|'+seq+'|'+pure;if(memo.has(key))return false;memo.add(key);let i=0;while(mask&(1<<i))i++;for(let g of by[i]){let m=g.indices.reduce((x,j)=>x|(1<<j),0);if(mask&m)continue;if(solve(mask|m,seq+(['pure','impure'].includes(g.kind)?1:0),pure||g.kind==='pure'))return true}return false}return solve(0,0,false)}
function sortHand(){
 const hand=state.hands[0];if(!hand||!hand.length)return;
 const original=hand.map(c=>JSON.stringify(c)).sort();
 const groups=getGroups(hand),used=new Set(),ordered=[],sortedGroups=[];
 const rankValue=c=>c[0]===1?14:(c[0]==='JOKER'?0:c[0]);
 function sequenceOrder(cards){
  const fixed=cards.filter(c=>!isJoker(c)),wilds=cards.filter(isJoker);
  if(!fixed.length)return cards.slice().sort((a,b)=>rankValue(a)-rankValue(b)||SUITS.indexOf(a[1])-SUITS.indexOf(b[1])||(a[2]||0)-(b[2]||0));
  const raw=fixed.map(c=>c[0]),variants=[raw.map(r=>r===1?14:r)];
  if(raw.includes(1))variants.push(raw.map(r=>r===1?1:r));
  let chosen=null;
  for(const vals of variants){
   for(let st=1;st<=15-cards.length;st++){
    const run=Array.from({length:cards.length},(_,i)=>st+i);
    if(!vals.every(v=>run.includes(v)))continue;
    const missing=run.filter(v=>!vals.includes(v));if(missing.length!==wilds.length)continue;
    const byRank=new Map();fixed.forEach(c=>byRank.set(c[0]===1?14:c[0],c));let pool=wilds.slice();
    chosen=run.map(v=>byRank.has(v)?byRank.get(v):pool.shift());break;
   }
   if(chosen)break;
  }
  return chosen||cards.slice().sort((a,b)=>rankValue(a)-rankValue(b)||SUITS.indexOf(a[1])-SUITS.indexOf(b[1]));
 }
 function groupKey(g){const cards=g.indices.map(i=>hand[i]),priority={pure:0,impure:1,set:2}[g.kind];
  if(g.kind==='pure'||g.kind==='impure'){const orderedRun=sequenceOrder(cards);return [priority,SUITS.indexOf(orderedRun[0][1]),rankValue(orderedRun[0]),cards.length]}
  const natural=cards.filter(c=>!isJoker(c));const r=natural.length?natural[0][0]:99;
  return [priority,typeof r==='number'?rankValue([r,'♠',0]):99,Math.min(...cards.map(c=>SUITS.indexOf(c[1])<0?99:SUITS.indexOf(c[1]))),cards.length];
 }
 groups.sort((a,b)=>{const x=groupKey(a),y=groupKey(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]-y[i];return 0});
 for(const g of groups){let cards=g.indices.map(i=>hand[i]);
  if(g.kind==='pure'||g.kind==='impure')cards=sequenceOrder(cards);
  else cards.sort((a,b)=>Number(a[0]==='JOKER')-Number(b[0]==='JOKER')||Number(a[0]===state.wild)-Number(b[0]===state.wild)||SUITS.indexOf(a[1])-SUITS.indexOf(b[1])||rankValue(a)-rankValue(b)||(a[2]||0)-(b[2]||0));
  ordered.push(...cards);g.indices.forEach(i=>used.add(i));sortedGroups.push({kind:g.kind,cards:cards.map(c=>JSON.stringify(c))});
 }
 const leftovers=hand.filter((c,i)=>!used.has(i)).sort((a,b)=>Number(isJoker(a))-Number(isJoker(b))||SUITS.indexOf(a[1])-SUITS.indexOf(b[1])||rankValue(a)-rankValue(b)||(a[2]||0)-(b[2]||0));
 ordered.push(...leftovers);
 const after=ordered.map(c=>JSON.stringify(c)).sort();
 if(ordered.length!==hand.length||JSON.stringify(after)!==JSON.stringify(original)||new Set(ordered.map(c=>JSON.stringify(c))).size!==ordered.length){
  state.message='Sort cancelled: original cards kept.';state.groups=[];
 }else{state.hands[0]=ordered;state.groups=[];let pos=0;
  for(const g of sortedGroups){const indices=[];for(const cardSig of g.cards){const idx=ordered.findIndex((c,i)=>i>=pos&&JSON.stringify(c)===cardSig);if(idx>=0){indices.push(idx);pos=idx+1;}}
   if(indices.length===g.cards.length)state.groups.push({kind:g.kind,indices});
  }
  state.message='Cards sorted: pure sequences first, then impure sequences and sets.';
 }
 state.selected=-1;sound();renderGame();
}
function draw(which){if(state.turn!==0||state.roundOver)return;if(state.drawn){state.message='You already drew a card. Discard one card first.';renderGame();return}state.undo={hand:state.hands[0].map(c=>c.slice()),stock:state.stock.slice(),discard:state.discard.slice(),history:state.history.slice(),drawn:state.drawn,selected:state.selected};let c;if(which==='stock'){if(!state.stock.length){state.message='Stock is empty. Take the top discard card.';renderGame();return}c=state.stock.pop()}else{if(!state.discard.length)return;c=state.discard.pop()}state.hands[0].push(c);state.drawn=true;state.selected=-1;state.message=`You drew ${label(c)}. Select a card and discard it.`;sound('deal');renderGame()}
function discardSelected(){if(state.turn!==0||state.roundOver)return;if(!state.drawn){state.message='Draw a card before discarding.';renderGame();return}if(state.selected<0||state.selected>=state.hands[0].length){state.message='Select one card to discard.';renderGame();return}let c=state.hands[0].splice(state.selected,1)[0];state.discard.push(c);state.history.push(`You discarded ${label(c)}`);state.selected=-1;state.drawn=false;state.groups=[];if(state.hands[0].length===13&&validHand(state.hands[0])){state.message='Your hand appears valid. You can declare now.'}else state.message='Your turn is complete.';renderGame();if(state.stock.length===0&&state.discard.length<1){finishRound(-1,'Stock ended')}else setTimeout(cpuTurn,500)}
function cpuTurn(){if(state.roundOver)return;let p=1;while(p<state.hands.length){let h=state.hands[p];let drawn;if(state.discard.length&&Math.random()<(state.difficulty==='Hard'?.55:.35))drawn=state.discard.pop();else drawn=state.stock.pop();if(!drawn){finishRound(-1,'Stock ended');return}h.push(drawn);let drop=chooseDrop(h);let c=h.splice(drop,1)[0];state.discard.push(c);state.history.push(`${state.names[p]} discarded ${label(c)}`);if(validHand(h)){finishRound(p,'Valid declaration');return}p++}state.message='Your turn. Draw one card from Stock or Discard.';state.turn=0;renderGame()}
function chooseDrop(hand){let best=0,bestScore=-1e9;for(let i=0;i<hand.length;i++){let c=hand[i],score=-pts(c);if(isJoker(c))score-=60;for(let j=0;j<hand.length;j++)if(i!==j){let d=hand[j];if(c[1]===d[1]&&Math.abs((c[0]===1?14:c[0])-(d[0]===1?14:d[0]))<=2)score+=4;if(c[0]===d[0])score+=3;if(isJoker(d))score+=4}if(state.difficulty==='Easy')score+=Math.random()*4;else if(state.difficulty==='Hard')score+=Math.random();if(score>bestScore){bestScore=score;best=i}}return best}
function scoreHand(hand){if(hand.length!==13)return Math.min(80,hand.reduce((s,c)=>s+pts(c),0));const gs=getGroups(hand),by=Array.from({length:13},()=>[]),values=hand.map(pts),memo=new Map();for(const g of gs){const mask=g.indices.reduce((m,i)=>m|(1<<i),0);for(const i of g.indices)by[i].push({mask,kind:g.kind})}const full=8191;function solve(mask,hasPure){const key=mask+'|'+hasPure;if(memo.has(key))return memo.get(key);if(mask===full)return {pen:0,pure:hasPure};let i=0;while(mask&(1<<i))i++;let r=solve(mask|(1<<i),hasPure);let best={pen:r.pen+values[i],pure:r.pure};for(const g of by[i]){if(mask&g.mask)continue;const q=solve(mask|g.mask,hasPure||g.kind==='pure');if(q.pure&&q.pen<best.pen)best={pen:q.pen,pure:q.pure}}memo.set(key,best);return best}const result=solve(0,false);return Math.min(80,result.pure?result.pen:values.reduce((a,b)=>a+b,0))}
function finishRound(winner,reason){if(state.roundOver)return;state.roundOver=true;let rows=state.names.map((n,i)=>({name:n,score:i===winner?0:scoreHand(state.hands[i]||[]),winner:i===winner}));rows.forEach((r,i)=>state.scores[i]=(state.scores[i]||0)+r.score);state.page='result';screen.innerHTML=`<section class="panel hero"><div style="font-size:42px">${winner===0?'🏆':'♠'}</div><h1>${winner===0?'YOU WIN!':winner>0?esc(state.names[winner]+' WINS'): 'ROUND OVER'}</h1><p>${esc(reason)}</p></section><section class="panel"><div class="section-title">ROUND RESULTS</div>${rows.map(r=>`<div class="result-row"><span>${esc(r.name)} ${r.winner?'🏆':''}</span><span class="score">${r.score} points</span></div>`).join('')}</section>${btn('▶ PLAY NEXT ROUND','next')}${btn('VIEW SCOREBOARD','scoreboard','soft')}${btn('MAIN MENU','menu','blue')}`;sound(winner===0?'win':'tap')}
function declare(){if(state.turn!==0||state.roundOver)return;if(state.hands[0].length!==13){state.message='You need exactly 13 cards to declare. Discard one card first.';renderGame();return}if(validHand(state.hands[0]))finishRound(0,'Valid declaration');else{state.message='Invalid declaration. Need 2 sequences including at least 1 pure sequence.';sound('error');renderGame()}}
function hint(){let g=getGroups(state.hands[0]);state.groups=g;state.message=g.length?`Found ${g.length} possible groups. Check that every card is covered by two sequences (one pure) and sets.`:'No complete groups detected yet. Try sorting and look for same-suit runs or same-rank sets.';renderGame()}
function newGameAsk(){dialog('Start a new game?','Your current round will be abandoned. Are you sure?',()=>renderSetup())}
function dialog(title,msg,yes){let d=document.createElement('div');d.className='dialogback';d.innerHTML=`<div class="dialog"><h2>${esc(title)}</h2><p>${esc(msg)}</p><div class="choice"><button id="no">CANCEL</button><button id="yes" class="active">YES, CONTINUE</button></div></div>`;document.body.appendChild(d);$('#no',d).onclick=()=>d.remove();$('#yes',d).onclick=()=>{d.remove();yes()}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function handleAction(a){switch(a){case'menu':renderMenu();break;case'setup':renderSetup();break;case'rules':renderRules();break;case'scoreboard':renderScore();break;case'sound':state.sound=!state.sound;renderMenu();break;case'start':startRound();break;case'stock':draw('stock');break;case'pick':draw('discard');break;case'discard':discardSelected();break;case'sort':sortHand();break;case'declare':declare();break;case'hint':hint();break;case'newgame':newGameAsk();break;case'next':dialog('Play next round?','Start a fresh round with a new deal?',startRound);break;case'undo':if(state.undo&&state.drawn){state.hands[0]=state.undo.hand.map(c=>c.slice());state.stock=state.undo.stock.slice();state.discard=state.undo.discard.slice();state.history=state.undo.history.slice();state.drawn=state.undo.drawn;state.selected=state.undo.selected;state.undo=null;state.message='Last draw undone.';renderGame()}else{state.message='Undo is available only before you discard.';renderGame()}break}}
screen.addEventListener('click',e=>{let op=e.target.closest('[data-op]');if(op){state.opponents=Number(op.dataset.op);renderSetup();return}let df=e.target.closest('[data-diff]');if(df){state.difficulty=df.dataset.diff;renderSetup();return}let c=e.target.closest('[data-card]');if(c&&state.page==='game'){let i=Number(c.dataset.card);if(i>=0&&state.turn===0&&!state.roundOver){state.selected=state.selected===i?-1:i;state.message=state.selected<0?'Select a card, or draw from Stock/Discard.':`Selected ${label(state.hands[0][i])}. Tap Discard Selected to discard.`;sound();renderGame()}return}let b=e.target.closest('[data-act]');if(b){handleAction(b.dataset.act);sound()}});
renderMenu();
