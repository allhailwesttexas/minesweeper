function populateLeaderboard () {
  $('#leaderboard').empty();
  var lb = JSON.parse(localStorage.getItem('leaderboard')) || [];
  for (var i = 0; i < lb.length; i++) {
    $('#leaderboard').append('<li>' + lb[i].name + ' (' + lb[i].time + ' seconds) </li>')
  };
}

populateLeaderboard();
