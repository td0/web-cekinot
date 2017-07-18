window.onload = function(){
  console.log('READY!');
  $('.init-spinner').removeClass('is-active');
}

// Check if a new cache is available on page load.
window.addEventListener('load', function(e) {

  window.applicationCache.addEventListener('updateready', function(e) {
    if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
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

var playerDB, scoreDB, turn;

// DATABASE
function initDB(){
  playerDB = new PouchDB('player',{adapter:'websql', revs_limit: 10});
  scoreDB = new PouchDB('score',{adapter:'websql', revs_limit: 10});
  turn = 1;
  playerDB.get('p1')
  .catch(function(err){
    var data = [
        {_id:'p1',name:'Player 1',score:0},
        {_id:'p2',name:'Player 2',score:0},
        {_id:'p3',name:'Player 3',score:0},
        {_id:'p4',name:'Player 4',score:0},
    ];
    return dbUpdatePlayers(data);
  })
  .then(function(res){
      dbFetchPlayers()
      .then(function(doc){
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
    .then(function(doc){
      doc.name=nname;
      return playerDB.put(doc);
    });
}
function dbUpdateScores(cscores){
  var playerdata=[];
  return dbFetchPlayers()
  .then(function(doc){
    for(var i=0; i<4; i++){
      playerdata[i] = doc.rows[i].doc;
      playerdata[i].score += cscores[i];
    }
    dbUpdatePlayers(playerdata);
  });
}
function dbFetchTurn(){
  scoreDB.info()
  .then(function(x){
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
var playerDialog = document.querySelector('.player-dialog');
var submitDialog = document.querySelector('.submit-dialog');
var resetDialog = document.querySelector('.reset-dialog');
var submitFab = document.querySelector('#submitFab');
// Dialog elements polyfill
if (! submitDialog.showModal) {
  dialogPolyfill.registerDialog(playerDialog);
  dialogPolyfill.registerDialog(submitDialog);
  dialogPolyfill.registerDialog(resetDialog);
}
function dialogDismissal(e){
  if(e.target.type!=='button'){
    var rect = e.target.getBoundingClientRect();
    var minX = rect.left + e.target.clientLeft;
    var minY = rect.top + e.target.clientTop;
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
submitFab.addEventListener('click', function() {
  submitDialog.showModal();
});
submitDialog.querySelector('.cancel-score')
.addEventListener('click', function() {
  submitDialog.close();
});
submitDialog.querySelector('.submit-score')
.addEventListener('click', function(){
  var cscores = [];
  var ctotals = [];
  for (var i = 0; i < 4; i++){
    cscores[i] = ($('#p'+(i+1)+'cscore').html() == '')? 0 :
      parseInt($('#p'+(i+1)+'cscore').html(),10);
    ctotals[i] = cscores[i] + parseInt($('#p'+(i+1)+'score').html(),10);
  }
  dbUpdateScores(cscores)
  .then(dbFetchPlayers)
  .then(uiUpdateScores);
  dbUpdateLog(ctotals)
  .then(function(resp){
    uiUpdateLog(ctotals);
  });
  submitDialog.close();
});

// Reset DIALOG
$('.reset-menu').on('click',function(){
  resetDialog.showModal();
});
$('.reset-score').on('click',function(){
  playerDB.destroy()
  .then(function(x){
    return scoreDB.destroy();
  })
  .then(function(){
    initDB();
    uiClearLogs();
    resetDialog.close();
  })
});
$('.cancel-reset').on('click',function(){
  resetDialog.close();
});


// Player DIALOG
(function(){
  var nameID;
  var nameTmp='';
  $('.list-player').on('click', function(){
    nameID = this.children[0].id;
    nameTmp = $('#'+nameID).html();
    playerDialog.showModal();
    uiUpdatePlayerDialog(nameID);
  });
  $('.cancel-player').on('click', function() {
    playerDialog.close();
  });
  $('.submit-player').on('click', function(){
    validateScore(function(){
      var nname = $('#nameInput').val().trim().replace(/\s+/g, ' ');
      if(nameTmp !== nname && nname !== ''){
        dbUpdateName(nameID, nname)
        .then(dbFetchPlayers)
        .then(uiUpdateName);
      }
      uiUpdateCScore(nameID)
      playerDialog.close();
    }, toastScoreInvalid);
  });
  $('input[id=\'nameInput\']').on('keyup',function(e){
    if(e.which==13){
      $('.submit-player').click();
    }
  });
  $('input[id=\'scoreInput\']').on('keyup',function(e){
    if(e.which==13){
      $('.submit-player').click();
    }
  });
})()







// ====================================================================================





// UI Updates
// name update
function uiUpdateName(d){
  for(var i=1; i<=4;i++){
    var name = d.rows[i-1].doc.name;
    var tname = (name.length > 8)?
      name.substr(0,8)+'..' : name;
    name = (name.length > 12)? name.substr(0,12)+'..':name;
    $('#p'+i).html(name);
    $('#p'+i+'th').html(tname);
  }
}
function uiUpdateScores(d){
  for(var i=1; i<=4;i++){
    var score = d.rows[i-1].doc.score;
    $('#p'+i+'score').html(score);
    $('#p'+i+'cscore').html('');
  }
  $('.game-turn-number').html(turn);
}

function uiUpdateCScore(id){
  $('#'+id+'cscore').removeClass();
  if($('#scoreInput').val()>0){
    $('#'+id+'cscore').html(' +'+$('#scoreInput').val());
    $('#'+id+'cscore').addClass('positive-score');
  }else if($('#scoreInput').val()<0){
    $('#'+id+'cscore').html(' '+$('#scoreInput').val());
    $('#'+id+'cscore').addClass('negative-score');
  }else{
    $('#'+id+'cscore').html('');
  }
}
function uiUpdatePlayerDialog(id){
  var sc_input = ($('#'+id+'cscore').html()!='')?
    parseInt($('#'+id+'cscore').html(),10) : 0;
  dbFetchName(id).then(function(r){
    $('#nameInput').val(r.name);
  });
  $('#nameInput').parent().addClass('is-dirty');
  $('#scoreInput').parent().removeClass('is-invalid');
  $('#scoreInput').parent().addClass('is-dirty');
  $('#scoreInput').val(sc_input);
  $('#scoreInput').focus();
}
function uiUpdateLog(ctotals){
  turn++;
  var col = '<tr><td>'+(turn-1)+'</td>';
  for(var i=0;i<4;i++){
    col += '<td>'+ctotals[i]+'</td>';
    if(i==3) col += '</tr>';
  }
  $(col).insertAfter('.current-turn');
  $('.turn-number').html(turn);
}
function uiFillLogs(d){
  var dataLog,arr;
  for(var i=0;i<d.rows.length;i++){
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
$('#scoreTab').on('click',function(){
  setTimeout(function(){
    $('#submitFab').addClass('transition');
  },500);
  $('#submitFab').removeClass('hidden');
})
$('#logTab').on('click',function(){
  setTimeout(function(){
    $('#submitFab').removeClass('transition');
  },500);
  $('#submitFab').addClass('hidden');
})



// validate score input
function validateScore(cb,cbe){
  var score = $('#scoreInput').val();
  if(score % 5 == 0){
    cb();
  }else{
    $('#scoreInput').focus();
    $('#scoreInput').parent().addClass('is-invalid');
    $('#scoreInput').parent().addClass('is-dirty')
    cbe();
  }
}

function toastScoreInvalid(){
  var data = {message: 'Score must be divisible by 5'}
  var scoreInvalidToast = document.querySelector('#scoreInvalidToast');
  // $('#scoreInvalidToast').MaterialSnackbar.showSnackbar(data);
  if(scoreInvalidToast.className.indexOf('mdl-snackbar--active') != -1)
    scoreInvalidToast.MaterialSnackbar.showSnackbar(data);
}
