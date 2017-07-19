// jQuery Variable Definition
let $nameInput = $('#nameInput');
let $scoreInput = $('#scoreInput');
let $submitPlayer = $('.submit-player');
let $submitFab = $('#submitFab');

window.onload = () => {
  console.log('READY!');
  $('.init-spinner').removeClass('is-active');
};

// Check if a new cache is available on page load.
// use appcache manifest instead of service worker to support wide variety of browser. check on http://caniuse.com
window.addEventListener('load', (e) => {
  window.applicationCache.addEventListener('updateready', (e) => {
    if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
      // Browser downloaded a new app cache.
      if (confirm('A new version of this site is available. Load it?')) {
        window.location.reload();
      }
    } else {
      // Manifest didn't changed. Nothing new to server.
    }
  }, false);

}, false);

// ====================================================================================

let playerDB, scoreDB, turn;

// DATABASE
function initDB(){
  playerDB = new PouchDB('player',{adapter:'websql', revs_limit: 10});
  scoreDB = new PouchDB('score',{adapter:'websql', revs_limit: 10});
  turn = 1;
  playerDB.get('p1')
  .catch((err) => {
    let data = [
      {_id: 'p1', name: 'Player 1', score: 0},
      {_id: 'p2', name: 'Player 2', score: 0},
      {_id: 'p3', name: 'Player 3', score: 0},
      {_id: 'p4', name: 'Player 4', score: 0},
    ];
    return dbUpdatePlayers(data);
  })
  .then((res) => {
      dbFetchPlayers()
      .then((doc) => {
        uiUpdateName(doc);
        uiUpdateScores(doc);
      });
      dbFetchLogs()
      .then(uiFillLogs);
      dbFetchTurn();
  });
}

initDB();
// DB Function
// player names & scores fetch
function dbFetchPlayers(){
  return playerDB.allDocs({include_docs: true});
}
function dbUpdatePlayers(data){
  return playerDB.bulkDocs(data);
}
// player name fetch
function dbFetchName(id){
  return playerDB.get(id);
}
// player name change
function dbUpdateName(id,nname){
  return playerDB.get(id)
    .then((doc) =>{
      doc.name=nname;
      return playerDB.put(doc);
    });
}
function dbUpdateScores(cscores){
  let playerdata = [];
  return dbFetchPlayers()
  .then((doc) => {
    for(let i=0; i<4; i++){
      playerdata[i] = doc.rows[i].doc;
      playerdata[i].score += cscores[i];
    }
    dbUpdatePlayers(playerdata);
  });
}
function dbFetchTurn(){
  scoreDB.info()
  .then((x) => {
    turn = x.doc_count + 1;
  })
}
function dbUpdateLog(ctotals){
  return scoreDB.put({
    _id : (turn)+'',
    p1 : ctotals[0],
    p2 : ctotals[1],
    p3 : ctotals[2],
    p4 : ctotals[3]
  });
}
function dbFetchLogs(){
  return scoreDB.allDocs({include_docs: true});
}

// ====================================================================================


// Dialog Initiation
let playerDialog = document.querySelector('.player-dialog');
let submitDialog = document.querySelector('.submit-dialog');
let resetDialog = document.querySelector('.reset-dialog');
let submitFab = document.querySelector('#submitFab');
// Dialog elements polyfill
if (! submitDialog.showModal) {
  dialogPolyfill.registerDialog(playerDialog);
  dialogPolyfill.registerDialog(submitDialog);
  dialogPolyfill.registerDialog(resetDialog);
}
function dialogDismissal(e){
  if(e.target.type!=='button'){
    let rect = e.target.getBoundingClientRect();
    let minX = rect.left + e.target.clientLeft;
    let minY = rect.top + e.target.clientTop;
    if ((e.clientX < minX || e.clientX >= minX + e.target.clientWidth) ||
        (e.clientY < minY || e.clientY >= minY + e.target.clientHeight)) {
      e.target.close();
    }
  }
}
playerDialog.addEventListener('click', dialogDismissal);
submitDialog.addEventListener('click', dialogDismissal);
resetDialog.addEventListener('click', dialogDismissal);

// Score DIALOG
submitFab.addEventListener('click', () => {
  submitDialog.showModal();
});
submitDialog.querySelector('.cancel-score')
.addEventListener('click', () => {
  submitDialog.close();
});
submitDialog.querySelector('.submit-score')
.addEventListener('click', () => {
  let cscores = [];
  let ctotals = [];
  for (let i = 0; i < 4; i++){
    let $pcscore = $('#p'+(i+1)+'cscore');
    cscores[i] = ($pcscore.html() === '')? 0 :
      parseInt($pcscore.html(),10);
    ctotals[i] = cscores[i] + parseInt($('#p'+(i+1)+'score').html(),10);
  }
  dbUpdateScores(cscores)
  .then(dbFetchPlayers)
  .then(uiUpdateScores);
  dbUpdateLog(ctotals)
  .then((resp) => {
    uiUpdateLog(ctotals);
  });
  submitDialog.close();
});

// Reset DIALOG
$('.reset-menu').on('click', () => {
  resetDialog.showModal();
});
$('.reset-score').on('click',() => {
  playerDB.destroy()
  .then((x) => {
    return scoreDB.destroy();
  })
  .then(() => {
    initDB();
    uiClearLogs();
    resetDialog.close();
  })
});
$('.cancel-reset').on('click',() => {
  resetDialog.close();
});


// Player DIALOG
(() => {
  let nameID;
  let nameTmp = '';
  $('.list-player').on('click', (event) => {
    nameID = event.currentTarget.children[0].id;
    nameTmp = $('#'+nameID).html();
    playerDialog.showModal();
    uiUpdatePlayerDialog(nameID);
  });
  $('.cancel-player').on('click', () => {
    playerDialog.close();
  });
  $submitPlayer.on('click', () => {
    validateScore(() => {
      let nname = $nameInput.val().trim().replace(/\s+/g, ' ');
      if(nameTmp !== nname && nname !== ''){
        dbUpdateName(nameID, nname)
        .then(dbFetchPlayers)
        .then(uiUpdateName);
      }
      uiUpdateCScore(nameID);
      playerDialog.close();
    }, toastScoreInvalid);
  });
  $nameInput.on('keyup',(e) => {
    if(e.which===13){
      $submitPlayer.click();
    }
  });
  $scoreInput.on('keyup',(e) => {
    if(e.which===13){
      $submitPlayer.click();
    }
  });
})();







// ====================================================================================





// UI Updates
// name update
function uiUpdateName(d){
  for(let i=1; i<=4; i++){
    let name = d.rows[i - 1].doc.name;
    let tname = (name.length > 8) ?
      name.substr(0, 8) + '..' : name;
    name = (name.length > 12)? name.substr(0,12)+'..':name;
    $('#p'+i).html(name);
    $('#p'+i+'th').html(tname);
  }
}
function uiUpdateScores(d){
  for(let i=1; i<=4; i++){
    let score = d.rows[i - 1].doc.score;
    $('#p'+i+'score').html(score);
    $('#p'+i+'cscore').html('');
  }
  $('.game-turn-number').html(turn);
}

function uiUpdateCScore(id){
  let $cscore = $('#'+id+'cscore');
  $cscore.removeClass();
  if($scoreInput.val()>0){
    $cscore.html(' +'+$scoreInput.val());
    $cscore.addClass('positive-score');
  }else if($scoreInput.val()<0){
    $cscore.html(' '+$scoreInput.val());
    $cscore.addClass('negative-score');
  }else{
    $cscore.html('');
  }
}
function uiUpdatePlayerDialog(id){
  let $cscore = $('#' + id + 'cscore');
  let sc_input = ($cscore.html() !== '') ?
    parseInt($cscore.html(), 10) : 0;
  dbFetchName(id).then((r) => {
    $nameInput.val(r.name);
  });
  $nameInput.parent().addClass('is-dirty');
  $scoreInput.parent().removeClass('is-invalid');
  $scoreInput.parent().addClass('is-dirty');
  $scoreInput.val(sc_input);
  $scoreInput.focus();
}
function uiUpdateLog(ctotals){
  turn++;
  let col = '<tr><td>' + (turn - 1) + '</td>';
  for(let i=0; i<4; i++){
    col += '<td>'+ctotals[i]+'</td>';
    if(i===3) col += '</tr>';
  }
  $(col).insertAfter('.current-turn');
  $('.turn-number').html(turn);
}
function uiFillLogs(d){
  let dataLog, arr;
  for(let i=0; i<d.rows.length; i++){
    dataLog = d.rows[i].doc;
    uiUpdateLog(Object.keys(dataLog).map((k)=>dataLog[k]));
  }

}
function uiClearLogs(){
  $('#scoreBody').html(
    '<tr class="current-turn"> \
        <td class="turn-number">1</td> \
        <td> ... </td> \
        <td> ... </td> \
        <td> ... </td> \
        <td> ... </td> \
      </tr>');
}

// ====================================================================================

// LISTENER
// Tab listener
$('#scoreTab').on('click',() => {
  setTimeout(() => {
    $submitFab.addClass('transition');
  },500);
  $submitFab.removeClass('hidden');
});
$('#historyTab').on('click',() => {
  setTimeout(() => {
    $submitFab.removeClass('transition');
  },500);
  $submitFab.addClass('hidden');
});



// validate score input
function validateScore(cb,cbe){
  let score = $scoreInput.val();
  if(score % 5 === 0){
    cb();
  }else{
    $scoreInput.focus();
    $scoreInput.parent().addClass('is-invalid');
    $scoreInput.parent().addClass('is-dirty');
    cbe();
  }
}

function toastScoreInvalid(){
  let data = {message: 'Score must be divisible by 5'};
  let scoreInvalidToast = document.querySelector('#scoreInvalidToast');
  if(scoreInvalidToast.className.indexOf('mdl-snackbar--active') === -1)
    scoreInvalidToast.MaterialSnackbar.showSnackbar(data);
}
