# RetroPong Game

This is a classic Pong game with a modern twist, built with Next.js and AI.

## Getting Started

### Prerequisites

- Node.js (version 18 or later recommended)
- npm or yarn

### Installation

1.  **Clone the repository (if applicable) or ensure you have the project files.**
2.  **Navigate to the project directory:**
    ```bash
    cd your-project-directory
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the Development Server

To start the game in development mode:

```bash
npm run dev
# or
yarn dev
```

This will typically start the game on `http://localhost:9002`. Open this URL in your web browser.

## How to Play

The game will first show an instructions screen. Click "Proceed to Menu" to continue.

### Game Menu

-   **Player vs AI**: Play against an AI-controlled opponent.
-   **Player vs Player**: Play against another human on the same keyboard.

Select a mode to start the game.

### Controls

-   **Player 1 (Left Paddle):**
    -   `W` key: Move paddle up
    -   `S` key: Move paddle down

-   **Player 2 (Right Paddle - only in "Player vs Player" mode):**
    -   `ArrowUp` key: Move paddle up
    -   `ArrowDown` key: Move paddle down

### Gameplay

-   The objective is to hit the ball with your paddle and make it pass your opponent's paddle.
-   The first player to reach **5 points** wins the game.
-   The ball's speed will start very slow and gradually increase with each paddle hit for the first 50 hits, ramping up to its normal initial speed. After that, it will continue to speed up with each hit, up to a maximum speed.

### After the Game

Once a player wins, the game over screen will appear. You can choose to return to the main menu to play again.

Enjoy the game!
