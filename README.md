# 2D Misère Nim by CharCoding ©, 2018
A 2D variation to the original game of [Nim](https://en.wikipedia.org/wiki/Nim) where you try to not take the last piece on the board.
## Rules

    1. Player 1 and 2 each remove a rectangle of pieces each turn.
      - Doesn't matter if some pieces within the rectangle are already removed.
    2. Each player must remove at least 1 piece from the board.
    3. The person who has to remove the last piece loses.
    
## How to play

    - Hold down the mouse on the board and drag it to select pieces you want to remove. (highlighted in yellow)
      - If you want to cancel it, move the mouse button outside the board and release the mouse.
    - Release the mouse to remove those pieces and hand the turn to the opponent.
    - This game is really hard to play perfectly, so take your time and think about your opponent's possible moves.
    - Press Z to undo, Y to redo, R to reset (please don't cheat though)
    - If you enable the AI, please remove the squares it tells you on its turns. The AI isn't *that* smart, yet.
    
## Hints (if you play perfectly)

    a. If you leave your opponent with a 2x2 square, you're winning.
    b. If your opponent leaves you with a 3x3 square, you're winning.
      - Take the center or one of the corners.
    c. If your opponent leaves you with a 3x4 rectangle, you're winning.
      - Take the middle 2 from the long edge on either side.

## AI (Work in progress)

The AI tries to search for a winning move by structural analysis and dictionary search. It's only good at end games or if you make a blunder. The algorithm are not well-optimized and no complete winning strategies have been discovered yet.

In the future I might try to make the AI be able to calculate several moves ahead instead of just one.
