var Rules = function(board)
{
  // Set during setup, to avoid scoring.
  var scoring = false;

  this.prepareNewGame = function()
  {

    scoring = false;
    while (true)
    {
      this.populateBoard()
      var crushable = this.getCandyCrushes();
      if (crushable.length == 0) break;
      this.removeCrushes(crushable);
    }
    scoring = true;
  }


  /*
  *
  *  Returns true if flipping fromCandy with the candy in the direction
  *  specified (['up', 'down', 'left', 'right']) is valid
  *  (according to the rules), else returns false.
  *
  */
  this.isMoveTypeValid = function(fromCandy, direction)
  {
    return this.numberCandiesCrushedByMove(fromCandy, direction) > 0;
  }
  

  this.getCandyCrushes = function(swap) {
    // Implemented with a (not fully optimized) Tarjan's union-find algorithm.
    // Implementation of the classic union-find algorithm (unoptimized).
    // Allows any string keys to be unioned into a set of disjoint sets.
    // https://en.wikipedia.org/wiki/Disjoint-set_data_structure
    var unioned = {};
    var sizes = {};
    var row, col;
    // Finds the set representative for the set that this key is a member of.
    function find(key)
    {
      var parent = unioned[key];
      if (parent == null) return key;
      parent = find(parent);
      unioned[key] = parent;  // Path compression
      return parent;
    }
    // The size of the set represented by 'found'; assume 1 if not stored.
    function size(found)
    {
      return sizes[found] || 1;
    }
    // Ennsures that the two keys are in the same set, joining if needed.
    function union(key1, key2)
    {
      var p1 = find(key1), p2 = find(key2);
      if (p1 == p2) return p1;
      // Do not bother implementing union by rank.  This is pretty fast too.
      // n.b., http://stackoverflow.com/a/2326676/265298
      unioned[p2] = p1;
      sizes[p1] = size(p1) + size(p2);
      delete sizes[p2];
    }
    // Get strips of length 3.
    var vert = this.findColorStrips(true, swap);
    var horiz = this.findColorStrips(false, swap);
    var sets = vert.concat(horiz);

    // Execute union of all the strips, possibly joining
    // horizontal and vertical strips that intersect.
    for (var j = 0; j < sets.length; j++)
    {
      var set = sets[j];
      for (var k = 1; k < set.length; k++)
      {
        union(set[0].id, set[k].id)
      }
    }

    // Pass 2: list out resulting sets of minSize or larger.
    var results = {}
    for (row = 0; row < board.boardSize; row++)
    {
      for (col = 0; col < board.boardSize; col++)
      {
        var candy = board.getCandyAt(row, col);
        if (candy)
        {
          var p = find(candy.id);
          if (size(p) >= 3)
          {
            if (!(p in results)) results[p] = [];
            results[p].push(candy);
          }
        }
      }
    }
    // Pass 3: Return results as a list of list of candies.
    var list = [];
    for (var key in results)
    {
      list.push(results[key]);
    }
    return list;
  }



  this.removeCrushes = function(setOfSetsOfCrushes)
  {
    for (var j = 0; j < setOfSetsOfCrushes.length; j++)
    {
      var set = setOfSetsOfCrushes[j];
      for (var k = 0; k < set.length; k++)
      {
        if (scoring) board.incrementScore(set[k], set[k].row, set[k].col);
        board.remove(set[k]);
      }
    }
  }


  this.moveCandiesDown = function()
  {
    // Collapse each column
    for (var col = 0; col < board.boardSize; col++)
    {
      var emptyRow = null;
      // In each column, scan for the bottom most empty row
      for (var emptyRow = board.boardSize - 1; emptyRow >= 0; emptyRow--)
      {
        if (board.getCandyAt(emptyRow, col) == null)
        {
          break;
        }
      }
      // Then shift any nonempty rows up
      for (var row = emptyRow - 1; row >= 0; row--)
      {
        var candy = board.getCandyAt(row, col);
        if (candy != null)
        {
          board.moveTo(candy, emptyRow, col);
          emptyRow--;
        }
      }

      for (var spawnRow = -1; emptyRow >= 0; emptyRow--, spawnRow--)
      {
        // We report spawnRow as the (negative) position where
        // the candy "would have" started to fall into place.
        board.addRandomCandy(emptyRow, col, spawnRow, col);
      }
      
    }
  }



  this.getRandomValidMove = function()
  {
    var directions = ['up', 'down', 'left', 'right'];
    var validMovesThreeCrush = [];
    var validMovesMoreThanThreeCrush = [];


    for (var row = 0; row < board.boardSize; row++)
    {
      for (var col = 0; col < board.boardSize; col++)
      {
        var fromCandy = board.getCandyAt(row,col);
        if (!fromCandy) continue;
        for (i = 0; i < 4; i++)
        {
          var direction = directions[i];
          var numCandiesCrushed =
              this.numberCandiesCrushedByMove(fromCandy, direction);
          if (numCandiesCrushed == 3)
          {
            validMovesThreeCrush.push({candy: fromCandy, direction: direction});
          }
          else if (numCandiesCrushed > 3)
          {
            validMovesMoreThanThreeCrush.push(
                {candy: fromCandy, direction: direction});
          }
        }
      }
    }
    // if there are three-crushes possible, prioritize these
    var searchArray = validMovesThreeCrush.length ? validMovesThreeCrush :
      validMovesMoreThanThreeCrush;
    // If there are no valid moves, return null.
    if (searchArray.length == 0) return null;
    // select a random crush from among the crushes found
    return searchArray[Math.floor(Math.random() * searchArray.length)];
  }



  this.createSpecifiedBoard = function(boardSpec) {

    color_dict = {'r':'red', 'o':'orange', 'y':'yellow', 'g':'green','b':'blue','p':'purple'}

    var numChars=0;

    boardSpec.map(function (i) { return numChars+=i.length });
    if (boardSpec.length != board.boardSize || numChars != Math.pow(board.boardSize,2)){
      console.warn("boardSpec must be of dimensions boardSize x boardSize to populate board");
      return;
    }

    for (var col = 0; col < board.boardSize; col++)
    {
      for (var row = 0; row < board.boardSize; row++)
      {
        if (board.getCandyAt(row, col) == null)
        {
           var color = color_dict[boardSpec[row].charAt(col)];
           board.addCandy(color, row, col);
        }
      }
    }

  }

  this.populateBoard = function()
  {
    for (var col = 0; col < board.boardSize; col++)
    {
      for (var row = 0; row < board.boardSize; row++)
      {
        // Check the empty candy position (hole), fill with new candy
        if (board.getCandyAt(row, col) == null)
        {
          board.addRandomCandy(row, col);
        }
      }
    }
  }



  this.numberCandiesCrushedByMove = function(fromCandy, direction)
  {
    return this.getCandiesToCrushGivenMove(fromCandy, direction).length;
  }

  /*
  *
  *  Helper method for rules.numberCandiesCrushedByMove
  *  Returns a list of candies that would be "crushed" (i.e. removed) if
  *  fromCandy were to be moved in the direction specified by direction (['up',
  *  'down', 'left', 'right'])
  *  If move would result in no crushed candies, an empty list is returned.
  *
  */
  this.getCandiesToCrushGivenMove = function(fromCandy, direction)
  {
    var toCandy = board.getCandyInDirection(fromCandy, direction);
    if (!toCandy || toCandy.color == fromCandy.color)
    {
      return [];
    }
    var swap = [fromCandy, toCandy];
    var crushable = this.getCandyCrushes(swap);
    // Only return crushable groups that involve the swapped candies.
    // If the board has incompletely-resolved crushes, there can be
    // many crushable candies that are not touching the swapped ones.
    var connected = crushable.filter(function(set)
    {
      for (var k = 0; k < swap.length; k++)
      {
        if (set.indexOf(swap[k]) >= 0) return true;
      }
      return false;
    });
    
    return [].concat.apply([], connected); //flatten nested lists
  }



  this.findColorStrips = function(vertical, swap) {
    var getAt = function(x, y)
    {
      // Retrieve the candy at a row and column (depending on vertical)
      var result = vertical ? board.getCandyAt(y, x) : board.getCandyAt(x, y);
      if (swap)
      {
        // If the result candy is in the 'swap' array, then swap the
        // result with its adjacent pair.
        var index = swap.indexOf(result);
        if (index >= 0) return swap[index ^ 1];
      }
      return result;
    };
    var result = [];
    for (var j = 0; j < board.boardSize; j++)
    {
      for (var h, k = 0; k < board.boardSize; k = h)
      {
        // Scan for rows of same-colored candy starting at k
        var firstCandy = getAt(j, k);
        h = k + 1;
        if (!firstCandy) continue;
        var candies = [firstCandy];
        for (; h < board.boardSize; h++)
        {
          var lastCandy = getAt(j, h);
          if (!lastCandy || lastCandy.color != firstCandy.color) break;
          candies.push(lastCandy);
        }
        // If there are at least 3 candies in a row, remember the set.
        if (candies.length >= 3) result.push(candies);
      }
    }
    return result;
  }


}
