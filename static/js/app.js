
function Minesweeper (elem, options) {
  this.initialize = function() {
    var options = _.defaults({}, options, {
      size: 9, nMines: 10, useTimer: true});

    this.useTimer = options.useTimer;
    this.elem = $(elem);
    this.setUpHtml();

    var boardOptions = _.pick(options, ['size', 'nMines']);
    boardOptions.elem = this.elems.board;
    this.board = new Board(boardOptions);
  };

  this.setUpHtml = function() {
    this.elems = {
      game: this.elem,
      board: $('<div></div>').attr('id', 'board'),
      timer: $('<div></div>').attr('id', 'timer').html(0),
      reset: $('<button></button>')
        .attr('id', 'reset')
        .addClass('btn btn-default')
        .html('☺')
    }
    this.elems.game.append(this.elems.board);
    this.elems.game.prepend(this.elems.timer);
    this.elems.game.prepend(this.elems.reset);
  };

  this.reset = function() {
    this.board.initialize();
    clearInterval(this.board.timerID);
    this.elems.timer.html(0)
  };

  this.initialize();
}

function Board (options) {

  this.initialize = function() {
    var options = _.defaults({}, options, {
      size: 9, nMines: 10, elem: $('#board')});

    this.size = options.size;
    this.nMines = options.nMines;
    this.elem = options.elem;

    this.createBoardArray();
    var mines = this.generateMines(this.nMines);
    this.addMines(mines);
    this.initializeBoard();
    this.registerClickHandlers();
    this.revealCount = 0;
    this.winThreshold = this.size * this.size - this.nMines;
    this.untouched = true;
  };

  this.createBoardArray = function() {
    this.board = [];
    for (var i = 0; i < this.size; i++) {
      this.board.push([]);
      for (var j = 0; j < this.size; j++) {
        this.board[i].push(new Cell(i, j));
      }
    }
  };

  this.generateMines = function(count) {
    // generate (x, y) indices for the mines
    // first <count> locations of a shuffled list of all possible mines
    return _.shuffle(cartesianProductOf(_.range(this.size), _.range(this.size)))
             .slice(0, count);
  };

  this.addMines = function(mines) {
    _.each(mines, function(mine) {
      this.board[mine[0]][mine[1]].hasMine = true;
    }, this);

    _.each(this.board, function(row) {
      _.each(row, function(cell) {
        cell.adjacentCount = this.getAdjacentCount(cell.row, cell.col);
      }, this);
    }, this);
  };

  this.getCell = function(row, col) {
    return this.board[row][col];
  };

  this.getAdjacentCells = function(row, col) {
    var self = this;
    var inds = [[row-1, col-1], [row, col-1],[row+1, col-1],
                [row-1, col], [row+1, col],
                [row-1, col+1], [row, col+1],[row+1, col+1]]
      .filter(function(pair) {
        // filter out indices outside the board - so bigger than self.size and smaller than 0
        return !(pair[0] >= (self.size) || pair[1] >= (self.size) || pair[0] < 0 || pair[1] < 0);
      });

    return inds.map(function(pair) {
      return self.getCell(pair[0], pair[1]);
    }, this);
  };

  this.getAdjacentCount = function(row, col) {
    // the row and col are flipped for the cell when initialised I think
    // so we have to switch them here. Fix pls.
    // sum all the adjacent cells with a truthy hasMine value
    return this.getAdjacentCells(col, row).reduce(function(prev, cell) {
      return cell.hasMine ? prev + 1 : prev;
    }, 0);
  };

  // UI related functions below

  this.initializeBoard = function () {
    this.elem.empty();

    for (var i = 0; i < this.board.length; i++) {
      var rowId = 'row-' + i;
      this.elem.append('<div id=' + rowId + ' ' + 'class=game-row></div>');

      for (var j = 0; j < this.board.length; j++) {
        $('#' + rowId).append(this.board[i][j].elem);
      }
    }
  };

  this.render = function() {
    _.each(this.board, function(row) {
      _.each(row, function(cell) {
        cell.render();
      });
    });
  };

  this.toggleRevealMines = function() {
    _.each(this.board, function(row) {
      _.each(row, function(cell) {
        cell.isRevealed = !cell.isRevealed;
      });
    });
    this.render();
  };

  this.revealAll = function() {
    _.each(this.board, function(row) {
      _.each(row, function(cell) {
        cell.isRevealed = true;
      });
    });
    this.render();
  };

  this.registerClickHandlers = function() {
    _.each(this.board, function(row) {
      _.each(row, function(cell) {
        cell.elem.on('click', {cell: cell, board: this}, this.onCellLeftClick);
        cell.elem.on('contextmenu', {cell: cell, board: this}, this.onCellRightClick);
      }, this);
    }, this);
  };

  this.unregisterClickHandlers = function() {
    _.each(this.board, function(row) {
      _.each(row, function(cell) {
        cell.elem.off('click');
        cell.elem.off('contextmenu');
      }, this);
    }, this);
  };

  this.onCellLeftClick = function(e) {
    var cell = e.data.cell;
    var board = e.data.board;
    board.revealCell(cell);
  };

  this.startTimer = function() {
    var t = parseInt($('#timer').text());
    return setInterval(function() {
      $('#timer').text(++t);
    }, 1000);
  };

  this.revealSingleCell = function(cell) {

    if (this.untouched) {
      this.timerID = this.startTimer()
      this.untouched = false;
    }

    if (!cell.isRevealed) this.revealCount++;
    cell.isRevealed = true;
    cell.hasFlag = false;
    if (cell.hasMine) {
      this.revealAll();
      this.endGame();
    }
    if (this.revealCount === this.winThreshold)
      this.winGame();
    cell.render();
  };

  this.revealCell = function(cell) {
    this.revealSingleCell(cell);

    // if the adjacentCount is zero, reveal, then keep going in all surrounding cells
    if (cell.adjacentCount === 0) {
      var candidates = this.getAdjacentCells(cell.col, cell.row);
      var checked = {};  // keep track of which cells have been checked

      // keep revealing as long as there are candidate cells
      while (candidates.length) {

        var current = candidates.pop();
        if (current.toString() in checked) continue;
        checked[current.toString()] = true;

        if (!current.hasMine) this.revealSingleCell(current);
        // If we hit another cell with zero adjacents, add all new candidates
        if (this.getAdjacentCount(current.row, current.col) === 0)
          candidates = _.union(candidates,
                               this.getAdjacentCells(current.col, current.row));
      }
    }
  };

  this.onCellRightClick = function(e) {
    e.preventDefault();
    var cell = e.data.cell;
    if (!cell.isRevealed) cell.hasFlag = !cell.hasFlag;
    cell.render();
  };

  this.endGame = function() {
    clearInterval(this.timerID);
    this.unregisterClickHandlers();

  };

  this.winGame = function() {
    this.revealAll();
    this.endGame();

    var lb = JSON.parse(localStorage.getItem('leaderboard')) || [];
    $('#win-game-modal').modal('show');
  };

  this.initialize();
  return this;
}

function Cell (col, row, options) {

  this.initialize = function() {
    var options = _.defaults({}, options, {
      hasMine: false, hasFlag: false, isRevealed: false, adjacentCount: 0});
    this.col = col;
    this.row = row;
    this.hasMine = options.hasMine;
    this.hasFlag = options.hasFlag;
    this.isRevealed = options.isRevealed;
    this.adjacentCount = options.adjacentCount;

    this.cellId = 'cell-' + this.row + '-' + this.col;
    this.elem = $('<div></div>', {'class': 'cell noselect', 'id': this.cellId});
    this.elem.html(this.hasMine ? '&nbsp;' : this.adjacentCount || '&nbsp;');
  };

  this.render = function () {

    // TODO: this should probably be a better event system instead of a long if statement
    // Hard to ensure expected behaviour with current approach

    // When cell is revealed: remove flag class, add reveal class, check if cell has mine
    // if has mine, fire game loss event
    // When cell is flagged: can only be done for non-revealed. Add flag class.
    // When cell is unflagged: remove flag class
    // When cell is unrevealed (this is for debugging purposes only): remove revealed class,
    // remove html

    // game loss: reveal all cells, show mines

    this.hasFlag ? this.elem.addClass('has-flag') : this.elem.removeClass('has-flag');
    this.hasMine && this.isRevealed ? this.elem.addClass('has-mine') : this.elem.removeClass('has-mine');

    if (this.isRevealed) {
      this.elem.addClass('revealed');
      this.elem.html(this.hasMine ? '&nbsp;' : this.adjacentCount || '&nbsp;');
    } else {
      this.elem.removeClass('revealed');
      this.elem.html('&nbsp;');
    }
  };

  this.toString = function() {
    return this.cellId;
  };

  this.initialize();
  return this;
}

var minesweeper = new Minesweeper('#minesweeper', {size: 9, nMines: 10, useTimer: true});
$('#reset').on('click', function() {
  minesweeper.reset();
});

// $('#reveal').on('click', function(e) {
//   minesweeper.board.toggleRevealMines();
// });

$('#new-leaderboard-score').on('submit', function(e) {
  var lb = JSON.parse(localStorage.getItem('leaderboard')) || [];
  lb.push({name: $('#winner-name').val(), time: $('#timer').text()});
  localStorage.setItem('leaderboard', JSON.stringify(lb));
  populateLeaderboard();
  $('#win-game-modal').modal('hide');
  e.preventDefault();
});

