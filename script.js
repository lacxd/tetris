// Game Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // Size of each block in pixels
const CANVAS_WIDTH = COLS * BLOCK_SIZE;
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE;

// Get canvas and context
const gameCanvas = document.getElementById('gameCanvas');
const context = gameCanvas.getContext('2d');
const nextPieceCanvas = document.getElementById('nextPieceCanvas');
const nextPieceContext = nextPieceCanvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const startButton = document.getElementById('startButton');

// Set canvas dimensions
gameCanvas.width = CANVAS_WIDTH;
gameCanvas.height = CANVAS_HEIGHT;
nextPieceCanvas.width = BLOCK_SIZE * 4; // Enough space for 4x4 potential piece
nextPieceCanvas.height = BLOCK_SIZE * 4;

// Scale context to draw blocks easily
context.scale(BLOCK_SIZE, BLOCK_SIZE);
nextPieceContext.scale(BLOCK_SIZE, BLOCK_SIZE);


// Tetromino shapes and colors
const SHAPES = [
    [[0, 1, 0, 0],
     [0, 1, 0, 0],
     [0, 1, 0, 0],
     [0, 1, 0, 0]], // I shape

    [[0, 1, 1, 0],
     [0, 1, 1, 0],
     [0, 0, 0, 0],
     [0, 0, 0, 0]], // O shape

    [[0, 1, 0, 0],
     [1, 1, 1, 0],
     [0, 0, 0, 0],
     [0, 0, 0, 0]], // T shape

    [[1, 1, 0, 0],
     [0, 1, 1, 0],
     [0, 0, 0, 0],
     [0, 0, 0, 0]], // S shape

    [[0, 1, 1, 0],
     [1, 1, 0, 0],
     [0, 0, 0, 0],
     [0, 0, 0, 0]], // Z shape

    [[1, 1, 1, 0],
     [1, 0, 0, 0],
     [0, 0, 0, 0],
     [0, 0, 0, 0]], // L shape

    [[1, 1, 1, 0],
     [0, 0, 1, 0],
     [0, 0, 0, 0],
     [0, 0, 0, 0]]  // J shape
];

const COLORS = [
    'cyan', 'yellow', 'purple', 'green', 'red', 'orange', 'blue'
];

// Game state
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let gameOver = false;
let gameInterval;
let dropInterval = 1000; // milliseconds

// Initialize the game board
function initBoard() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

// Draw a single block
function drawBlock(x, y, color) {
    context.fillStyle = color;
    context.fillRect(x, y, 1, 1); // Fill a 1x1 block (scaled)
    context.strokeStyle = '#333'; // Border color
    context.strokeRect(x, y, 1, 1);
}

// Draw the game board
function drawBoard() {
    context.clearRect(0, 0, COLS, ROWS); // Clear the canvas
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(c, r, board[r][c]); // Draw block if cell is not empty (0)
            }
        }
    }
}

// Create a new random piece
function createPiece() {
    const randomShapeIndex = Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[randomShapeIndex];
    const color = COLORS[randomShapeIndex];
    return {
        shape: shape,
        color: color,
        x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2), // Start in the middle
        y: 0 // Start at the top
    };
}

// Draw a piece
function drawPiece(piece, contextToUse) {
    contextToUse.fillStyle = piece.color;
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
                // Draw relative to piece's top-left corner (piece.x, piece.y)
                contextToUse.fillRect(piece.x + c, piece.y + r, 1, 1); // <-- Should be 1, 1
                contextToUse.strokeStyle = '#333';
                contextToUse.strokeRect(piece.x + c, piece.y + r, 1, 1); // <-- Should be 1, 1
            }
        }
    }
}

// Draw the next piece in the sidebar
function drawNextPiece() {
    nextPieceContext.clearRect(0, 0, nextPieceCanvas.width / BLOCK_SIZE, nextPieceCanvas.height / BLOCK_SIZE);
    if (nextPiece) {
        // Temporarily change nextPiece coordinates to draw centered in the smaller canvas
        const tempPiece = JSON.parse(JSON.stringify(nextPiece)); // Deep copy
        tempPiece.x = Math.floor((nextPieceCanvas.width / BLOCK_SIZE - tempPiece.shape[0].length) / 2);
        tempPiece.y = Math.floor((nextPieceCanvas.height / BLOCK_SIZE - tempPiece.shape.length) / 2);
        drawPiece(tempPiece, nextPieceContext);
    }
}


// Check for collision
function collide(piece) {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
                const newX = piece.x + c;
                const newY = piece.y + r;

                // Check board boundaries
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true; // Collision with wall or bottom
                }

                // Check collision with existing blocks on the board
                if (newY < 0) { // Ignore collisions above the board
                    continue;
                }
                if (board[newY][newX]) {
                    return true; // Collision with another block
                }
            }
        }
    }
    return false; // No collision
}

// Merge the piece into the board
function mergePiece(piece) {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
                board[piece.y + r][piece.x + c] = piece.color;
            }
        }
    }
}

// Check for completed lines and clear them
function clearLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) { // Check if the row is full
            // Remove the full row
            board.splice(r, 1);
            // Add a new empty row at the top
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            r++; // Check the new row at the same index
        }
    }
    if (linesCleared > 0) {
        score += linesCleared * 10; // Simple scoring
        scoreDisplay.textContent = score;
    }
}

// Move the current piece down
function dropPiece() {
    const newPiece = { ...currentPiece, y: currentPiece.y + 1 };
    if (!collide(newPiece)) {
        currentPiece = newPiece;
    } else {
        mergePiece(currentPiece);
        clearLines();
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
        if (collide(currentPiece)) {
            // Game over
            gameOver = true;
            clearInterval(gameInterval);
            alert('Game Over!');
        }
    }
    drawGame();
}

// Rotate the current piece (simple 90-degree clockwise)
function rotatePiece(piece) {
    const rotatedShape = Array(piece.shape[0].length).fill(null).map(() => Array(piece.shape.length).fill(0));
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            rotatedShape[c][piece.shape.length - 1 - r] = piece.shape[r][c];
        }
    }

    // Basic wall kick (prevent rotation into walls)
    const originalX = piece.x;
    let offset = 1;
    const testPiece = { ...piece, shape: rotatedShape };
    while (collide(testPiece)) {
        testPiece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > piece.shape[0].length) { // Prevent infinite loops
            testPiece.x = originalX;
            return piece.shape; // Cannot rotate
        }
    }

    piece.x = testPiece.x;
    return rotatedShape;
}


// Handle user input
document.addEventListener('keydown', (e) => {
    if (gameOver || !currentPiece) return;

    if (e.key === 'ArrowLeft') {
        const newPiece = { ...currentPiece, x: currentPiece.x - 1 };
        if (!collide(newPiece)) {
            currentPiece = newPiece;
        }
    } else if (e.key === 'ArrowRight') {
        const newPiece = { ...currentPiece, x: currentPiece.x + 1 };
        if (!collide(newPiece)) {
            currentPiece = newPiece;
        }
    } else if (e.key === 'ArrowDown') {
        dropPiece(); // Move down immediately
    } else if (e.key === 'ArrowUp') {
        const rotatedShape = rotatePiece(currentPiece);
        const newPiece = { ...currentPiece, shape: rotatedShape };
         if (!collide(newPiece)) {
            currentPiece = newPiece;
        }
    }
    drawGame();
});

// Draw the entire game state
function drawGame() {
    drawBoard();
    if (currentPiece) {
        drawPiece(currentPiece, context);
    }
}

// Game loop
function gameLoop() {
    if (!gameOver) {
        dropPiece();
    }
}

// Start the game
function startGame() {
    initBoard();
    score = 0;
    scoreDisplay.textContent = score;
    gameOver = false;
    currentPiece = createPiece();
    nextPiece = createPiece();
    drawNextPiece();
    drawGame();
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(gameLoop, dropInterval);
    startButton.textContent = 'Restart Game';
}

// Event listener for the start button
startButton.addEventListener('click', startGame);

// Initial draw (empty board)
drawBoard();
