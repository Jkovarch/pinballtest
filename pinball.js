// Pinball Game - Main JavaScript File

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Responsive canvas sizing
function resizeCanvas() {
    const maxWidth = Math.min(500, window.innerWidth - 20);
    const aspectRatio = 1.6;
    canvas.width = maxWidth;
    canvas.height = maxWidth * aspectRatio;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Physics settings (adjustable via settings panel)
const physics = {
    gravity: 0.35,
    bounce: 0.6,
    flipperPower: 18,
    speedMultiplier: 1.0,
    bumperForce: 12,
    friction: 0.985
};

// Default physics for reset
const defaultPhysics = { ...physics };

// Game state
const gameState = {
    score: 0,
    ballsRemaining: 3,
    highScore: parseInt(localStorage.getItem('pinballHighScore')) || 0,
    isPlaying: false,
    ballInPlay: false
};

// Ball object
const ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 10,
    active: false
};

// Plunger for launching
const plunger = {
    x: canvas.width - 25,
    power: 0,
    maxPower: 25,
    charging: false
};

// Flippers
const flippers = {
    left: {
        x: canvas.width * 0.25,
        y: canvas.height - 80,
        length: 60,
        angle: 0.4,
        targetAngle: 0.4,
        maxAngle: -0.6,
        speed: 0.35,
        active: false
    },
    right: {
        x: canvas.width * 0.75,
        y: canvas.height - 80,
        length: 60,
        angle: Math.PI - 0.4,
        targetAngle: Math.PI - 0.4,
        maxAngle: Math.PI + 0.6,
        speed: 0.35,
        active: false
    }
};

// Pop bumpers
const bumpers = [
    { x: canvas.width * 0.3, y: canvas.height * 0.25, radius: 25, hits: 0, active: false, timer: 0 },
    { x: canvas.width * 0.7, y: canvas.height * 0.25, radius: 25, hits: 0, active: false, timer: 0 },
    { x: canvas.width * 0.5, y: canvas.height * 0.35, radius: 25, hits: 0, active: false, timer: 0 }
];

// Drop targets
const dropTargets = [
    { x: canvas.width * 0.15, y: canvas.height * 0.45, width: 8, height: 30, active: true },
    { x: canvas.width * 0.15, y: canvas.height * 0.50, width: 8, height: 30, active: true },
    { x: canvas.width * 0.15, y: canvas.height * 0.55, width: 8, height: 30, active: true },
    { x: canvas.width * 0.85, y: canvas.height * 0.45, width: 8, height: 30, active: true },
    { x: canvas.width * 0.85, y: canvas.height * 0.50, width: 8, height: 30, active: true },
    { x: canvas.width * 0.85, y: canvas.height * 0.55, width: 8, height: 30, active: true }
];

// Ramp
const ramp = {
    x1: canvas.width * 0.35,
    y1: canvas.height * 0.55,
    x2: canvas.width * 0.25,
    y2: canvas.height * 0.15,
    width: 30,
    entryY: canvas.height * 0.55
};

// Spinner
const spinner = {
    x: canvas.width * 0.5,
    y: canvas.height * 0.15,
    width: 40,
    height: 6,
    angle: 0,
    spinSpeed: 0,
    friction: 0.98
};

// Walls and obstacles
const walls = [];

function initializeWalls() {
    walls.length = 0;
    const w = canvas.width;
    const h = canvas.height;

    // Main boundary walls
    walls.push({ x1: 0, y1: 0, x2: 0, y2: h }); // Left
    walls.push({ x1: w, y1: 0, x2: w, y2: h }); // Right
    walls.push({ x1: 0, y1: 0, x2: w, y2: 0 }); // Top

    // Side rails (angled)
    walls.push({ x1: 0, y1: h * 0.7, x2: w * 0.15, y2: h - 80 }); // Left rail
    walls.push({ x1: w, y1: h * 0.7, x2: w * 0.85, y2: h - 80 }); // Right rail

    // Plunger lane
    walls.push({ x1: w - 40, y1: h * 0.1, x2: w - 40, y2: h - 20 }); // Plunger lane left wall
    walls.push({ x1: w - 40, y1: h * 0.1, x2: w - 20, y2: h * 0.05 }); // Plunger lane curve

    // Out lanes
    walls.push({ x1: w * 0.08, y1: h - 80, x2: w * 0.08, y2: h - 20 }); // Left out lane
    walls.push({ x1: w * 0.92, y1: h - 80, x2: w * 0.92, y2: h - 20 }); // Right out lane
}

// Initialize game elements based on canvas size
function initializeGameElements() {
    initializeWalls();

    // Update flipper positions
    flippers.left.x = canvas.width * 0.25;
    flippers.left.y = canvas.height - 80;
    flippers.right.x = canvas.width * 0.75;
    flippers.right.y = canvas.height - 80;

    // Update bumper positions
    bumpers[0].x = canvas.width * 0.3;
    bumpers[0].y = canvas.height * 0.25;
    bumpers[1].x = canvas.width * 0.7;
    bumpers[1].y = canvas.height * 0.25;
    bumpers[2].x = canvas.width * 0.5;
    bumpers[2].y = canvas.height * 0.35;

    // Update drop target positions
    dropTargets[0].x = canvas.width * 0.15;
    dropTargets[0].y = canvas.height * 0.45;
    dropTargets[1].x = canvas.width * 0.15;
    dropTargets[1].y = canvas.height * 0.50;
    dropTargets[2].x = canvas.width * 0.15;
    dropTargets[2].y = canvas.height * 0.55;
    dropTargets[3].x = canvas.width * 0.85;
    dropTargets[3].y = canvas.height * 0.45;
    dropTargets[4].x = canvas.width * 0.85;
    dropTargets[4].y = canvas.height * 0.50;
    dropTargets[5].x = canvas.width * 0.85;
    dropTargets[5].y = canvas.height * 0.55;

    // Update ramp
    ramp.x1 = canvas.width * 0.35;
    ramp.y1 = canvas.height * 0.55;
    ramp.x2 = canvas.width * 0.25;
    ramp.y2 = canvas.height * 0.15;
    ramp.entryY = canvas.height * 0.55;

    // Update spinner
    spinner.x = canvas.width * 0.5;
    spinner.y = canvas.height * 0.15;

    // Update plunger
    plunger.x = canvas.width - 25;
}

// Ball physics
function updateBall() {
    if (!ball.active) return;

    // Apply gravity
    ball.vy += physics.gravity * physics.speedMultiplier;

    // Apply friction
    ball.vx *= physics.friction;
    ball.vy *= physics.friction;

    // Update position
    ball.x += ball.vx * physics.speedMultiplier;
    ball.y += ball.vy * physics.speedMultiplier;

    // Wall collisions
    handleWallCollisions();

    // Flipper collisions
    handleFlipperCollision(flippers.left, true);
    handleFlipperCollision(flippers.right, false);

    // Bumper collisions
    bumpers.forEach(bumper => handleBumperCollision(bumper));

    // Drop target collisions
    dropTargets.forEach(target => handleDropTargetCollision(target));

    // Spinner collision
    handleSpinnerCollision();

    // Ramp collision
    handleRampCollision();

    // Check if ball is lost
    if (ball.y > canvas.height + ball.radius) {
        lostBall();
    }
}

function handleWallCollisions() {
    const w = canvas.width;
    const h = canvas.height;

    // Simple boundary collisions
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx * physics.bounce;
    }
    if (ball.x + ball.radius > w - 40 || (ball.x + ball.radius > w && ball.y < h * 0.1)) {
        if (ball.x > w - 40 && ball.y > h * 0.1) {
            // In plunger lane - allow
        } else {
            ball.x = w - 40 - ball.radius;
            ball.vx = -ball.vx * physics.bounce;
        }
    }
    if (ball.x + ball.radius > w) {
        ball.x = w - ball.radius;
        ball.vx = -ball.vx * physics.bounce;
    }
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy * physics.bounce;
    }

    // Angled rail collisions
    // Left rail
    if (ball.y > h * 0.7 && ball.x < w * 0.2) {
        const railX = ((ball.y - h * 0.7) / (h - 80 - h * 0.7)) * (w * 0.15) + 0;
        if (ball.x - ball.radius < railX + 10) {
            ball.x = railX + 10 + ball.radius;
            ball.vx = Math.abs(ball.vx) * physics.bounce;
            ball.vy *= 0.9;
        }
    }

    // Right rail
    if (ball.y > h * 0.7 && ball.x > w * 0.8 && ball.x < w - 40) {
        const railX = w - ((ball.y - h * 0.7) / (h - 80 - h * 0.7)) * (w * 0.15);
        if (ball.x + ball.radius > railX - 10) {
            ball.x = railX - 10 - ball.radius;
            ball.vx = -Math.abs(ball.vx) * physics.bounce;
            ball.vy *= 0.9;
        }
    }

    // Out lane walls
    if (ball.y > h - 100 && ball.y < h - 20) {
        if (ball.x < w * 0.12 && ball.x > w * 0.06) {
            // Left out lane
        }
        if (ball.x > w * 0.88 && ball.x < w * 0.94) {
            // Right out lane
        }
    }
}

function handleFlipperCollision(flipper, isLeft) {
    const flipperEndX = flipper.x + Math.cos(flipper.angle) * flipper.length;
    const flipperEndY = flipper.y + Math.sin(flipper.angle) * flipper.length;

    // Check collision with flipper line
    const dist = pointToLineDistance(ball.x, ball.y, flipper.x, flipper.y, flipperEndX, flipperEndY);

    if (dist < ball.radius + 5) {
        // Calculate reflection
        const dx = flipperEndX - flipper.x;
        const dy = flipperEndY - flipper.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;

        // Reflect velocity
        const dot = ball.vx * nx + ball.vy * ny;

        // Add flipper power if flipper is active
        let power = flipper.active ? physics.flipperPower : 5;

        ball.vx = ball.vx - 2 * dot * nx;
        ball.vy = ball.vy - 2 * dot * ny - power;

        // Add horizontal component based on where ball hit flipper
        const hitPos = ((ball.x - flipper.x) * dx + (ball.y - flipper.y) * dy) / (len * len);
        ball.vx += (isLeft ? 1 : -1) * hitPos * power * 0.5;

        // Move ball out of flipper
        ball.y = Math.min(ball.y, flipper.y - ball.radius - 5);

        // Apply bounce
        ball.vx *= physics.bounce;
        ball.vy *= physics.bounce;
    }
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

    let t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)));
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}

function handleBumperCollision(bumper) {
    const dx = ball.x - bumper.x;
    const dy = ball.y - bumper.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ball.radius + bumper.radius) {
        // Normalize direction
        const nx = dx / dist;
        const ny = dy / dist;

        // Apply bumper force
        ball.vx = nx * physics.bumperForce;
        ball.vy = ny * physics.bumperForce;

        // Move ball out of bumper
        ball.x = bumper.x + nx * (ball.radius + bumper.radius + 1);
        ball.y = bumper.y + ny * (ball.radius + bumper.radius + 1);

        // Score and animation
        addScore(100);
        bumper.active = true;
        bumper.timer = 10;
        bumper.hits++;
    }

    // Update bumper animation
    if (bumper.timer > 0) {
        bumper.timer--;
        if (bumper.timer === 0) {
            bumper.active = false;
        }
    }
}

function handleDropTargetCollision(target) {
    if (!target.active) return;

    if (ball.x > target.x - target.width / 2 - ball.radius &&
        ball.x < target.x + target.width / 2 + ball.radius &&
        ball.y > target.y - target.height / 2 - ball.radius &&
        ball.y < target.y + target.height / 2 + ball.radius) {

        target.active = false;
        ball.vx = -ball.vx * physics.bounce;
        addScore(500);

        // Check if all targets are down
        const allDown = dropTargets.every(t => !t.active);
        if (allDown) {
            addScore(5000);
            // Reset targets after delay
            setTimeout(() => {
                dropTargets.forEach(t => t.active = true);
            }, 2000);
        }
    }
}

function handleSpinnerCollision() {
    const spinnerLeft = spinner.x - spinner.width / 2;
    const spinnerRight = spinner.x + spinner.width / 2;
    const spinnerTop = spinner.y - spinner.height / 2;
    const spinnerBottom = spinner.y + spinner.height / 2;

    if (ball.x + ball.radius > spinnerLeft &&
        ball.x - ball.radius < spinnerRight &&
        ball.y + ball.radius > spinnerTop &&
        ball.y - ball.radius < spinnerBottom) {

        // Add spin based on ball velocity
        spinner.spinSpeed += ball.vx * 0.5;

        // Ball passes through but slows slightly
        ball.vy *= 0.95;

        addScore(50);
    }
}

function handleRampCollision() {
    // Check if ball is entering ramp
    const rampWidth = 35;
    if (ball.x > ramp.x1 - rampWidth / 2 &&
        ball.x < ramp.x1 + rampWidth / 2 &&
        ball.y > ramp.y1 - 20 &&
        ball.y < ramp.y1 + 20 &&
        ball.vy < 0) {

        // Ball is going up and near ramp entrance - guide it up
        const rampAngle = Math.atan2(ramp.y2 - ramp.y1, ramp.x2 - ramp.x1);
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

        if (speed > 8) {
            ball.vx = Math.cos(rampAngle) * speed * 0.8;
            ball.vy = Math.sin(rampAngle) * speed * 0.8;
            addScore(200);
        }
    }
}

function updateSpinner() {
    spinner.angle += spinner.spinSpeed;
    spinner.spinSpeed *= spinner.friction;

    // Add score based on spin speed
    if (Math.abs(spinner.spinSpeed) > 0.5) {
        addScore(Math.floor(Math.abs(spinner.spinSpeed)));
    }
}

function updateFlippers() {
    // Left flipper
    if (flippers.left.active) {
        flippers.left.angle += (flippers.left.maxAngle - flippers.left.angle) * flippers.left.speed;
    } else {
        flippers.left.angle += (flippers.left.targetAngle - flippers.left.angle) * flippers.left.speed * 0.5;
    }

    // Right flipper
    if (flippers.right.active) {
        flippers.right.angle += (flippers.right.maxAngle - flippers.right.angle) * flippers.right.speed;
    } else {
        flippers.right.angle += (flippers.right.targetAngle - flippers.right.angle) * flippers.right.speed * 0.5;
    }
}

function addScore(points) {
    gameState.score += points;
    document.getElementById('score').textContent = gameState.score;

    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        document.getElementById('highScore').textContent = gameState.highScore;
        localStorage.setItem('pinballHighScore', gameState.highScore);
    }
}

function lostBall() {
    ball.active = false;
    gameState.ballsRemaining--;
    document.getElementById('ballCount').textContent = gameState.ballsRemaining;

    if (gameState.ballsRemaining <= 0) {
        gameOver();
    } else {
        gameState.ballInPlay = false;
    }
}

function gameOver() {
    gameState.isPlaying = false;
    gameState.ballInPlay = false;

    // Show game over
    setTimeout(() => {
        alert(`Game Over!\nFinal Score: ${gameState.score}\nHigh Score: ${gameState.highScore}`);
        resetGame();
    }, 500);
}

function resetGame() {
    gameState.score = 0;
    gameState.ballsRemaining = 3;
    gameState.isPlaying = true;
    gameState.ballInPlay = false;

    document.getElementById('score').textContent = '0';
    document.getElementById('ballCount').textContent = '3';

    // Reset drop targets
    dropTargets.forEach(t => t.active = true);

    // Reset bumpers
    bumpers.forEach(b => {
        b.hits = 0;
        b.active = false;
    });
}

function launchBall() {
    if (gameState.ballInPlay || gameState.ballsRemaining <= 0) return;

    gameState.isPlaying = true;
    gameState.ballInPlay = true;

    // Position ball in plunger lane
    ball.x = plunger.x;
    ball.y = canvas.height - 50;
    ball.vx = -2;
    ball.vy = -15 - Math.random() * 5;
    ball.active = true;
}

// Drawing functions
function draw() {
    // Clear canvas
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw playfield background pattern
    drawPlayfield();

    // Draw ramp
    drawRamp();

    // Draw spinner
    drawSpinner();

    // Draw bumpers
    bumpers.forEach(drawBumper);

    // Draw drop targets
    dropTargets.forEach(drawDropTarget);

    // Draw flippers
    drawFlipper(flippers.left, true);
    drawFlipper(flippers.right, false);

    // Draw walls/rails
    drawWalls();

    // Draw plunger lane
    drawPlungerLane();

    // Draw ball
    if (ball.active) {
        drawBall();
    }

    // Draw launch indicator if ball not in play
    if (!gameState.ballInPlay && gameState.ballsRemaining > 0) {
        drawLaunchIndicator();
    }
}

function drawPlayfield() {
    // Grid pattern
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.1)';
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawRamp() {
    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Ramp rails
    const offset = 15;
    ctx.beginPath();
    ctx.moveTo(ramp.x1 - offset, ramp.y1);
    ctx.lineTo(ramp.x2 - offset, ramp.y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ramp.x1 + offset, ramp.y1);
    ctx.lineTo(ramp.x2 + offset, ramp.y2);
    ctx.stroke();

    // Ramp entry
    ctx.fillStyle = 'rgba(155, 89, 182, 0.3)';
    ctx.fillRect(ramp.x1 - 20, ramp.y1 - 10, 40, 20);

    // Ramp label
    ctx.fillStyle = '#9b59b6';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RAMP', ramp.x1, ramp.y1 + 4);
}

function drawSpinner() {
    ctx.save();
    ctx.translate(spinner.x, spinner.y);
    ctx.rotate(spinner.angle);

    // Spinner bar
    const gradient = ctx.createLinearGradient(-spinner.width / 2, 0, spinner.width / 2, 0);
    gradient.addColorStop(0, '#e74c3c');
    gradient.addColorStop(0.5, '#f39c12');
    gradient.addColorStop(1, '#e74c3c');

    ctx.fillStyle = gradient;
    ctx.fillRect(-spinner.width / 2, -spinner.height / 2, spinner.width, spinner.height);

    // Center pivot
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Spinner housing
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(spinner.x, spinner.y, spinner.width / 2 + 5, 0, Math.PI * 2);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#e74c3c';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPINNER', spinner.x, spinner.y + spinner.width / 2 + 15);
}

function drawBumper(bumper) {
    const gradient = ctx.createRadialGradient(
        bumper.x - 5, bumper.y - 5, 0,
        bumper.x, bumper.y, bumper.radius
    );

    if (bumper.active) {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.5, '#ff6b6b');
        gradient.addColorStop(1, '#c0392b');
    } else {
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.5, '#e74c3c');
        gradient.addColorStop(1, '#c0392b');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ring
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.radius - 3, 0, Math.PI * 2);
    ctx.stroke();

    // Score text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('100', bumper.x, bumper.y);
}

function drawDropTarget(target) {
    if (target.active) {
        const gradient = ctx.createLinearGradient(
            target.x, target.y - target.height / 2,
            target.x, target.y + target.height / 2
        );
        gradient.addColorStop(0, '#27ae60');
        gradient.addColorStop(1, '#1e8449');

        ctx.fillStyle = gradient;
        ctx.fillRect(
            target.x - target.width / 2,
            target.y - target.height / 2,
            target.width,
            target.height
        );

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(
            target.x - target.width / 2,
            target.y - target.height / 2,
            target.width / 2,
            target.height
        );
    } else {
        // Knocked down target
        ctx.fillStyle = 'rgba(39, 174, 96, 0.3)';
        ctx.fillRect(
            target.x - target.width / 2,
            target.y - target.height / 2,
            target.width,
            target.height
        );
    }
}

function drawFlipper(flipper, isLeft) {
    const endX = flipper.x + Math.cos(flipper.angle) * flipper.length;
    const endY = flipper.y + Math.sin(flipper.angle) * flipper.length;

    // Flipper body
    ctx.strokeStyle = flipper.active ? '#4ecdc4' : '#3498db';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(flipper.x, flipper.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Flipper highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(flipper.x, flipper.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Pivot point
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(flipper.x, flipper.y, 8, 0, Math.PI * 2);
    ctx.fill();
}

function drawWalls() {
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Left rail
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.7);
    ctx.lineTo(canvas.width * 0.15, canvas.height - 80);
    ctx.stroke();

    // Right rail (up to plunger lane)
    ctx.beginPath();
    ctx.moveTo(canvas.width - 40, canvas.height * 0.7);
    ctx.lineTo(canvas.width * 0.85, canvas.height - 80);
    ctx.stroke();

    // Out lane separators
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.08, canvas.height - 80);
    ctx.lineTo(canvas.width * 0.08, canvas.height - 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.92 - 40, canvas.height - 80);
    ctx.lineTo(canvas.width * 0.92 - 40, canvas.height - 20);
    ctx.stroke();

    // Drain area
    ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
    ctx.fillRect(canvas.width * 0.15, canvas.height - 30, canvas.width * 0.7 - 40, 30);
    ctx.fillStyle = '#e74c3c';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DRAIN', canvas.width * 0.5 - 20, canvas.height - 12);
}

function drawPlungerLane() {
    // Plunger lane background
    ctx.fillStyle = 'rgba(52, 73, 94, 0.5)';
    ctx.fillRect(canvas.width - 40, 0, 40, canvas.height);

    // Lane border
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 40, canvas.height * 0.1);
    ctx.lineTo(canvas.width - 40, canvas.height);
    ctx.stroke();

    // Curve at top
    ctx.beginPath();
    ctx.arc(canvas.width - 20, canvas.height * 0.1, 20, Math.PI, 0);
    ctx.stroke();

    // Plunger
    if (!gameState.ballInPlay) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(canvas.width - 35, canvas.height - 80, 20, 60);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(canvas.width - 35, canvas.height - 30, 20, 10);
    }
}

function drawBall() {
    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(ball.x + 3, ball.y + 3, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball gradient
    const gradient = ctx.createRadialGradient(
        ball.x - 3, ball.y - 3, 0,
        ball.x, ball.y, ball.radius
    );
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(0.3, '#ddd');
    gradient.addColorStop(1, '#888');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(ball.x - 3, ball.y - 3, ball.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

function drawLaunchIndicator() {
    ctx.fillStyle = 'rgba(78, 205, 196, 0.5)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to launch!', canvas.width / 2, canvas.height / 2);

    // Blinking ball position
    const blink = Math.sin(Date.now() / 200) > 0;
    if (blink) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(plunger.x, canvas.height - 50, ball.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        flippers.left.active = true;
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        flippers.right.active = true;
    }
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        launchBall();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;

    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        flippers.left.active = false;
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        flippers.right.active = false;
    }
});

// Touch controls
const touchLeft = document.getElementById('touchLeft');
const touchRight = document.getElementById('touchRight');
const touchLaunch = document.getElementById('touchLaunch');

touchLeft.addEventListener('touchstart', (e) => {
    e.preventDefault();
    flippers.left.active = true;
});
touchLeft.addEventListener('touchend', (e) => {
    e.preventDefault();
    flippers.left.active = false;
});

touchRight.addEventListener('touchstart', (e) => {
    e.preventDefault();
    flippers.right.active = true;
});
touchRight.addEventListener('touchend', (e) => {
    e.preventDefault();
    flippers.right.active = false;
});

touchLaunch.addEventListener('touchstart', (e) => {
    e.preventDefault();
    launchBall();
});

// Mouse fallback for touch buttons
touchLeft.addEventListener('mousedown', () => flippers.left.active = true);
touchLeft.addEventListener('mouseup', () => flippers.left.active = false);
touchLeft.addEventListener('mouseleave', () => flippers.left.active = false);

touchRight.addEventListener('mousedown', () => flippers.right.active = true);
touchRight.addEventListener('mouseup', () => flippers.right.active = false);
touchRight.addEventListener('mouseleave', () => flippers.right.active = false);

touchLaunch.addEventListener('click', launchBall);

// Button controls
document.getElementById('launchBtn').addEventListener('click', launchBall);

// Settings modal
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettings = document.getElementById('closeSettings');
const resetSettings = document.getElementById('resetSettings');

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

resetSettings.addEventListener('click', () => {
    Object.assign(physics, defaultPhysics);
    updateSettingsUI();
});

// Settings sliders
const sliders = {
    gravity: document.getElementById('gravitySlider'),
    bounce: document.getElementById('bounceSlider'),
    flipperPower: document.getElementById('flipperPowerSlider'),
    speed: document.getElementById('speedSlider'),
    bumperForce: document.getElementById('bumperForceSlider'),
    friction: document.getElementById('frictionSlider')
};

const values = {
    gravity: document.getElementById('gravityValue'),
    bounce: document.getElementById('bounceValue'),
    flipperPower: document.getElementById('flipperPowerValue'),
    speed: document.getElementById('speedValue'),
    bumperForce: document.getElementById('bumperForceValue'),
    friction: document.getElementById('frictionValue')
};

function updateSettingsUI() {
    sliders.gravity.value = physics.gravity;
    sliders.bounce.value = physics.bounce;
    sliders.flipperPower.value = physics.flipperPower;
    sliders.speed.value = physics.speedMultiplier;
    sliders.bumperForce.value = physics.bumperForce;
    sliders.friction.value = physics.friction;

    values.gravity.textContent = physics.gravity.toFixed(2);
    values.bounce.textContent = physics.bounce.toFixed(2);
    values.flipperPower.textContent = physics.flipperPower;
    values.speed.textContent = physics.speedMultiplier.toFixed(1);
    values.bumperForce.textContent = physics.bumperForce;
    values.friction.textContent = physics.friction.toFixed(3);
}

sliders.gravity.addEventListener('input', (e) => {
    physics.gravity = parseFloat(e.target.value);
    values.gravity.textContent = physics.gravity.toFixed(2);
});

sliders.bounce.addEventListener('input', (e) => {
    physics.bounce = parseFloat(e.target.value);
    values.bounce.textContent = physics.bounce.toFixed(2);
});

sliders.flipperPower.addEventListener('input', (e) => {
    physics.flipperPower = parseInt(e.target.value);
    values.flipperPower.textContent = physics.flipperPower;
});

sliders.speed.addEventListener('input', (e) => {
    physics.speedMultiplier = parseFloat(e.target.value);
    values.speed.textContent = physics.speedMultiplier.toFixed(1);
});

sliders.bumperForce.addEventListener('input', (e) => {
    physics.bumperForce = parseInt(e.target.value);
    values.bumperForce.textContent = physics.bumperForce;
});

sliders.friction.addEventListener('input', (e) => {
    physics.friction = parseFloat(e.target.value);
    values.friction.textContent = physics.friction.toFixed(3);
});

// Initialize settings UI
updateSettingsUI();

// Handle canvas resize
window.addEventListener('resize', () => {
    resizeCanvas();
    initializeGameElements();
});

// Game loop
function gameLoop() {
    updateBall();
    updateFlippers();
    updateSpinner();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize and start
initializeGameElements();
document.getElementById('highScore').textContent = gameState.highScore;
gameLoop();

// Close modal when clicking outside
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});
