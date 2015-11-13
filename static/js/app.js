'use strict';

function Board (size, nMines) {

  // logic

  this.initialize = function() {
    this.createBoardArray();
    var mines = this.generateMines(this.nMines);
    this.addMines(mines);
    this.initializeBoard();
    this.registerClickHandlers();
  };

  this.createBoardArray = function() {
    this.board = [];
    for (var i = 0; i < this.size; i++) {
      this.board.push([]);
      for (var j = 0; j < this.size; j++) {
        this.board[i].push(new Cell(i, j, 'unknown', false));
      };
    };
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
        // now filter out inds outside the board - so bigger than self.size and smaller than 0
        return !(pair[0] >= (self.size) || pair[1] >= (self.size) || pair[0] < 0 || pair[1] < 0);
      });

    return inds.map(function(pair) {
      return self.getCell(pair[0], pair[1])
    }, this);
  }

  this.getDirectlyAdjacentCells = function(row, col) {
    var self = this;
    var inds = [[row, col-1], [row-1, col], [row+1, col], [row, col+1]]
      .filter(function(pair) {
        // now filter out inds outside the board - so bigger than self.size and smaller than 0
        return !(pair[0] >= (self.size) || pair[1] >= (self.size) || pair[0] < 0 || pair[1] < 0);
      });

    return inds.map(function(pair) {
      return self.getCell(pair[0], pair[1])
    }, this);
  }

  this.getAdjacentCount = function(row, col) {
    // the row and col are flipped for the cell when initialised I think
    // so we have to switch them here. Fix pls.
    // sum all the adjacent cells with a truthy hasMine value
    return this.getAdjacentCells(col, row).reduce(function(prev, cell) {
      return cell.hasMine ? prev + 1 : prev;
    }, 0);
  };

  this.getDirectlyAdjacentCount = function(row, col) {
    return this.getDirectlyAdjacentCells(col, row).reduce(function(prev, cell) {
      return cell.hasMine ? prev + 1 : prev;
    }, 0);

  };

  // UI related functions below

  this.initializeBoard = function () {
    $('#game-container').empty();

    for (var i = 0; i < this.board.length; i++) {
      var rowId = 'row-' + i
      $('#game-container').append('<div id=' + rowId + ' ' + 'class=row></div>')

      for (var j = 0; j < this.board.length; j++) {
        $('#' + rowId).append(this.board[i][j].elem);
      };
    };
  }

  this.render = function() {
    _.each(this.board, function(row) {
      _.each(row, function(cell) {
        cell.render();
      });
    });
    console.log('rendering board!');
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
        cell.elem.on('click', {cell: cell, board: this}, this.onCellLeftClick)
        cell.elem.on('contextmenu', {cell: cell, board: this}, this.onCellRightClick)
      }, this);
    }, this);
  };

  this.onCellLeftClick = function(e) {
    // console.log('cell left click', e)
    var cell = e.data.cell;
    var board = e.data.board;
    board.revealCell(cell);
  };

  this.revealSingleCell = function(cell) {
    cell.isRevealed = true;
    if (cell.hasMine) {
      // alert('you lose! *explosions*')
      this.revealAll();
    }
    cell.render();
  };

  this.revealCell = function(cell) {
    this.revealSingleCell(cell)

    // if the adjacentCount is zero, reveal & keep going in all surrounding cells
    if (cell.adjacentCount == 0) {
      var candidates = this.getAdjacentCells(cell.col, cell.row);
      var checked = {};

      while (candidates.length) {

        var current = candidates.pop();
        if (current.toString() in checked) continue;
        checked[current.toString()] = true;

        if (!current.hasMine) this.revealSingleCell(current);
        if (this.getAdjacentCount(current.row, current.col) == 0)
          candidates = _.union(candidates,
                               this.getAdjacentCells(current.col, current.row));
      }
    }
  };

  this.onCellRightClick = function(e) {
    e.preventDefault();
    var cell = e.data.cell;
    cell.hasFlag = !cell.hasFlag;
    // console.log('cell right click', e)
    cell.render();
  };

  this.size = size;
  this.nMines = nMines;
  this.initialize();
  return this;
}

function Cell (col, row, state, hasMine) {
  // TODO: change call signature to options object

  this.initialize = function() {
    this.col = col;
    this.row = row;
    this.state = state || 'unknown';
    this.hasMine = hasMine;

    this.cellId = 'cell-' + this.row + '-' + this.col;
    this.elem = $('<div></div>', {'class': 'cell', 'id': this.cellId});
    this.hasFlag = false;
    this.isRevealed = false;
    this.adjacentCount = 0;  // unknown to start with
    this.elem.html('&nbsp;');
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
  }

  this.toString = function() {
    return this.cellId;
  };

  this.initialize();
  return this;
}

var board = new Board(9, 10);

$('#reveal').on('click', function(e) {
  board.toggleRevealMines();
});
