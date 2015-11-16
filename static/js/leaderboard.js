function populateLeaderboard () {
  var lb = JSON.parse(localStorage.getItem('leaderboard')) || [];
  for (var i = 0; i < lb.length; i++) {
    // console.log(lb[i].name)
    $('#leaderboard').append('<li>' + lb[i].name + ' (' + lb[i].time + ' seconds) </li>')
  };
}

populateLeaderboard();
