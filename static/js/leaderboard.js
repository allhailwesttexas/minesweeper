function populateLeaderboard () {
  $('#leaderboard').empty();
  var lb = JSON.parse(localStorage.getItem('leaderboard')) || [];
  lb.sort(function(a, b) {
    return a.time - b.time;
  })
  for (var i = 0; i < lb.length; i++) {
    $('#leaderboard').append('<li>' + lb[i].name + ' (' + lb[i].time + ' seconds) </li>')
  };
}

populateLeaderboard();
