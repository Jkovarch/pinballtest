// Pinball Game - Main JavaScript File

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Responsive canvas sizing - fits within available space
function resizeCanvas() {
    const container = document.querySelector('.canvas-container');
    const containerRect = container.getBoundingClientRect();

    // Get available space
    const availableWidth = containerRect.width - 10;
    const availableHeight = containerRect.height - 10;

    // Target aspect ratio (width:height = 1:2 for pinball)
    const aspectRatio = 2.0;

    // Calculate dimensions to fit in container while maintaining aspect ratio
    let canvasWidth, canvasHeight;

    if (availableHeight / availableWidth > aspectRatio) {
        // Container is taller than needed - fit to width
        canvasWidth = Math.min(availableWidth, 400);
        canvasHeight = canvasWidth * aspectRatio;
    } else {
        // Container is wider than needed - fit to height
        canvasHeight = availableHeight;
        canvasWidth = canvasHeight / aspectRatio;
    }

    // Ensure minimum size
    canvasWidth = Math.max(canvasWidth, 200);
    canvasHeight = Math.max(canvasHeight, 400);

    // Set canvas size
    canvas.width = Math.floor(canvasWidth);
    canvas.height = Math.floor(canvasHeight);

    // Reinitialize game elements for new size
    if (typeof initializeGameElements === 'function') {
        initializeGameElements();
    }
}

// Initial resize after DOM is ready
function initCanvas() {
    resizeCanvas();
}

// Handle resize with debounce
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 100);
});

// Also handle orientation change on mobile
window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 200);
});

// Physics settings (adjustable via settings panel)
const physics = {
    gravity: 0.25,
    bounce: 0.65,
    flipperPower: 22,
    speedMultiplier: 1.0,
    bumperForce: 14,
    friction: 0.992,
    slingForce: 15,
    slingThreshold: 4 // Minimum velocity to trigger slingshot bounce
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
    radius: 8,
    active: false
};

// Plunger for launching
const plunger = {
    x: 0,
    width: 30,
    power: 0,
    maxPower: 35,
    charging: false
};

// Flippers - will be positioned in initializeGameElements
const flippers = {
    left: {
        x: 0,
        y: 0,
        length: 55,
        angle: 0.5,
        targetAngle: 0.5,
        maxAngle: -0.7,
        speed: 0.4,
        active: false
    },
    right: {
        x: 0,
        y: 0,
        length: 55,
        angle: Math.PI - 0.5,
        targetAngle: Math.PI - 0.5,
        maxAngle: Math.PI + 0.7,
        speed: 0.4,
        active: false
    }
};

// Slingshots - triangular shapes above flippers
const slingshots = {
    left: {
        points: [], // Will be set in initializeGameElements
        active: false,
        timer: 0
    },
    right: {
        points: [],
        active: false,
        timer: 0
    }
};

// Pop bumpers
const bumpers = [
    { x: 0, y: 0, radius: 20, hits: 0, active: false, timer: 0 },
    { x: 0, y: 0, radius: 20, hits: 0, active: false, timer: 0 },
    { x: 0, y: 0, radius: 18, hits: 0, active: false, timer: 0 }
];

// Drop targets - bank of 5 across the top area
const dropTargets = [];

// Ramp
const ramp = {
    x1: 0, y1: 0, x2: 0, y2: 0, width: 25
};

// Spinner
const spinner = {
    x: 0, y: 0, width: 35, height: 5,
    angle: 0, spinSpeed: 0, friction: 0.98
};

// Lane guides and walls
const walls = [];
const laneGuides = [];

// Initialize game elements based on canvas size
function initializeGameElements() {
    const w = canvas.width;
    const h = canvas.height;

    // Plunger lane dimensions
    const plungerLaneWidth = 35;
    const playableWidth = w - plungerLaneWidth;

    plunger.x = w - plungerLaneWidth / 2;
    plunger.width = plungerLaneWidth;

    // Flipper positions - centered in playable area, close together
    const flipperY = h - 65;
    const flipperGap = 50; // Gap between flipper pivots
    const flipperCenterX = playableWidth / 2;

    flippers.left.x = flipperCenterX - flipperGap / 2;
    flippers.left.y = flipperY;
    flippers.right.x = flipperCenterX + flipperGap / 2;
    flippers.right.y = flipperY;

    // Slingshot positions - triangular areas above and outside each flipper
    // Left slingshot
    const slingshotHeight = 70;
    const slingshotWidth = 45;
    slingshots.left.points = [
        { x: 25, y: flipperY - 10 },                           // Bottom (near wall)
        { x: 25, y: flipperY - slingshotHeight },              // Top (near wall)
        { x: 25 + slingshotWidth, y: flipperY - 10 }           // Bottom inner (near flipper)
    ];

    // Right slingshot
    slingshots.right.points = [
        { x: playableWidth - 25, y: flipperY - 10 },                        // Bottom (near wall)
        { x: playableWidth - 25, y: flipperY - slingshotHeight },           // Top (near wall)
        { x: playableWidth - 25 - slingshotWidth, y: flipperY - 10 }        // Bottom inner (near flipper)
    ];

    // Pop bumpers - cluster in upper middle area
    bumpers[0].x = playableWidth * 0.35;
    bumpers[0].y = h * 0.18;
    bumpers[0].radius = 22;

    bumpers[1].x = playableWidth * 0.65;
    bumpers[1].y = h * 0.18;
    bumpers[1].radius = 22;

    bumpers[2].x = playableWidth * 0.5;
    bumpers[2].y = h * 0.26;
    bumpers[2].radius = 20;

    // Drop targets - bank of 5 in upper area
    dropTargets.length = 0;
    const targetStartX = playableWidth * 0.25;
    const targetEndX = playableWidth * 0.75;
    const targetY = h * 0.12;
    for (let i = 0; i < 5; i++) {
        dropTargets.push({
            x: targetStartX + (targetEndX - targetStartX) * i / 4,
            y: targetY,
            width: 6,
            height: 25,
            active: true
        });
    }

    // Ramp on left side going up
    ramp.x1 = playableWidth * 0.30;
    ramp.y1 = h * 0.45;
    ramp.x2 = playableWidth * 0.15;
    ramp.y2 = h * 0.08;

    // Spinner near top center
    spinner.x = playableWidth * 0.6;
    spinner.y = h * 0.10;

    // Initialize lane guides (inlanes and outlanes)
    initializeLaneGuides(w, h, playableWidth, flipperY);
}

function initializeLaneGuides(w, h, playableWidth, flipperY) {
    laneGuides.length = 0;

    // Outlane width - narrow to reduce draining
    const outlaneWidth = 18;
    const inlaneWidth = 25;

    // Left side guide rails
    // Outer wall curves down to outlane
    laneGuides.push({
        type: 'curve',
        x1: 5, y1: h * 0.5,
        x2: 5, y2: flipperY + 20
    });

    // Left outlane/inlane separator
    laneGuides.push({
        type: 'line',
        x1: outlaneWidth, y1: flipperY - 80,
        x2: outlaneWidth, y2: flipperY + 10
    });

    // Right side guide rails
    laneGuides.push({
        type: 'curve',
        x1: playableWidth - 5, y1: h * 0.5,
        x2: playableWidth - 5, y2: flipperY + 20
    });

    // Right outlane/inlane separator
    laneGuides.push({
        type: 'line',
        x1: playableWidth - outlaneWidth, y1: flipperY - 80,
        x2: playableWidth - outlaneWidth, y2: flipperY + 10
    });
}

// Ball physics
function updateBall() {
    if (!ball.active) return;

    const w = canvas.width;
    const h = canvas.height;
    const playableWidth = w - plunger.width;

    // Apply gravity
    ball.vy += physics.gravity * physics.speedMultiplier;

    // Apply friction
    ball.vx *= physics.friction;
    ball.vy *= physics.friction;

    // Update position
    ball.x += ball.vx * physics.speedMultiplier;
    ball.y += ball.vy * physics.speedMultiplier;

    // Wall collisions
    handleWallCollisions(w, h, playableWidth);

    // Slingshot collisions
    handleSlingshotCollision(slingshots.left);
    handleSlingshotCollision(slingshots.right);

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
    if (ball.y > h + ball.radius) {
        lostBall();
    }
}

function handleWallCollisions(w, h, playableWidth) {
    const plungerLaneLeft = playableWidth;
    const flipperY = flippers.left.y;

    // Left wall
    if (ball.x - ball.radius < 5) {
        ball.x = 5 + ball.radius;
        ball.vx = Math.abs(ball.vx) * physics.bounce;
    }

    // Right wall (main playfield, not in plunger lane)
    if (ball.x < plungerLaneLeft && ball.x + ball.radius > plungerLaneLeft - 5) {
        // Check if ball should enter plunger lane from top
        if (ball.y < h * 0.08 && ball.vx > 0) {
            // Allow ball to curve into plunger lane at top
        } else {
            ball.x = plungerLaneLeft - 5 - ball.radius;
            ball.vx = -Math.abs(ball.vx) * physics.bounce;
        }
    }

    // Plunger lane walls
    if (ball.x > plungerLaneLeft) {
        // Left wall of plunger lane
        if (ball.x - ball.radius < plungerLaneLeft + 3) {
            ball.x = plungerLaneLeft + 3 + ball.radius;
            ball.vx = Math.abs(ball.vx) * physics.bounce;
        }
        // Right wall of plunger lane
        if (ball.x + ball.radius > w - 3) {
            ball.x = w - 3 - ball.radius;
            ball.vx = -Math.abs(ball.vx) * physics.bounce;
        }
    }

    // Top wall - curved at plunger lane entrance
    if (ball.y - ball.radius < 5) {
        ball.y = 5 + ball.radius;
        ball.vy = Math.abs(ball.vy) * physics.bounce;

        // If near plunger lane entrance, guide ball left onto playfield
        if (ball.x > plungerLaneLeft - 40) {
            ball.vx -= 3;
        }
    }

    // Outlane walls - narrow passages on sides near flippers
    const outlaneWidth = 18;

    // Left outlane inner wall
    if (ball.y > flipperY - 80 && ball.y < flipperY + 20 && ball.x > outlaneWidth - 5 && ball.x < outlaneWidth + 8) {
        if (ball.x - ball.radius < outlaneWidth + 3) {
            // Let ball pass through to outlane
        } else if (ball.x + ball.radius > outlaneWidth + 3) {
            ball.x = outlaneWidth + 3 + ball.radius;
            ball.vx = Math.abs(ball.vx) * physics.bounce * 0.5;
        }
    }

    // Right outlane inner wall
    if (ball.y > flipperY - 80 && ball.y < flipperY + 20 &&
        ball.x > playableWidth - outlaneWidth - 8 && ball.x < playableWidth - outlaneWidth + 5) {
        if (ball.x + ball.radius > playableWidth - outlaneWidth - 3) {
            // Let ball pass through to outlane
        } else if (ball.x - ball.radius < playableWidth - outlaneWidth - 3) {
            ball.x = playableWidth - outlaneWidth - 3 - ball.radius;
            ball.vx = -Math.abs(ball.vx) * physics.bounce * 0.5;
        }
    }

    // Guide rails from mid-field to slingshots
    // Left guide rail
    if (ball.y > h * 0.5 && ball.y < flipperY - 70 && ball.x < 50) {
        const railX = 25 + (ball.y - h * 0.5) / (flipperY - 70 - h * 0.5) * 15;
        if (ball.x - ball.radius < railX) {
            ball.x = railX + ball.radius;
            ball.vx = Math.abs(ball.vx) * physics.bounce * 0.7;
        }
    }

    // Right guide rail
    if (ball.y > h * 0.5 && ball.y < flipperY - 70 && ball.x > playableWidth - 50) {
        const railX = playableWidth - 25 - (ball.y - h * 0.5) / (flipperY - 70 - h * 0.5) * 15;
        if (ball.x + ball.radius > railX) {
            ball.x = railX - ball.radius;
            ball.vx = -Math.abs(ball.vx) * physics.bounce * 0.7;
        }
    }
}

function handleSlingshotCollision(slingshot) {
    const points = slingshot.points;
    if (points.length < 3) return;

    // Check if ball is inside or near the triangular slingshot area
    // Check collision with each edge of the triangle
    for (let i = 0; i < 3; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % 3];

        const dist = pointToLineDistance(ball.x, ball.y, p1.x, p1.y, p2.x, p2.y);

        if (dist < ball.radius + 4) {
            // Calculate normal vector for this edge
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            // Normal pointing outward from triangle center
            const centerX = (points[0].x + points[1].x + points[2].x) / 3;
            const centerY = (points[0].y + points[1].y + points[2].y) / 3;

            let nx = -dy / len;
            let ny = dx / len;

            // Make sure normal points away from center
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            if ((midX + nx - centerX) * (midX - centerX) + (midY + ny - centerY) * (midY - centerY) < 0) {
                nx = -nx;
                ny = -ny;
            }

            // Calculate ball velocity magnitude
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

            // Check if hit is hard enough to trigger slingshot bounce
            const impactVelocity = Math.abs(ball.vx * nx + ball.vy * ny);

            if (impactVelocity > physics.slingThreshold) {
                // Hard hit - slingshot activates and bounces ball
                ball.vx = nx * physics.slingForce;
                ball.vy = ny * physics.slingForce - 2; // Slight upward bias

                slingshot.active = true;
                slingshot.timer = 8;
                addScore(25);
            } else {
                // Soft hit - act like a wall, guide ball toward flipper
                const dot = ball.vx * nx + ball.vy * ny;
                ball.vx = ball.vx - 1.5 * dot * nx;
                ball.vy = ball.vy - 1.5 * dot * ny;

                // Apply some friction for soft contact
                ball.vx *= 0.85;
                ball.vy *= 0.85;
            }

            // Move ball out of slingshot
            ball.x += nx * (ball.radius + 5 - dist);
            ball.y += ny * (ball.radius + 5 - dist);

            break;
        }
    }

    // Update slingshot animation
    if (slingshot.timer > 0) {
        slingshot.timer--;
        if (slingshot.timer === 0) {
            slingshot.active = false;
        }
    }
}

function handleFlipperCollision(flipper, isLeft) {
    const flipperEndX = flipper.x + Math.cos(flipper.angle) * flipper.length;
    const flipperEndY = flipper.y + Math.sin(flipper.angle) * flipper.length;

    const dist = pointToLineDistance(ball.x, ball.y, flipper.x, flipper.y, flipperEndX, flipperEndY);

    if (dist < ball.radius + 7) {
        const dx = flipperEndX - flipper.x;
        const dy = flipperEndY - flipper.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;

        // Ensure normal points upward
        const normalUp = ny < 0 ? 1 : -1;

        const dot = ball.vx * nx + ball.vy * ny;
        let power = flipper.active ? physics.flipperPower : 3;

        ball.vx = ball.vx - 2 * dot * nx * normalUp;
        ball.vy = ball.vy - 2 * dot * ny * normalUp - power;

        // Add horizontal component based on hit position
        const hitPos = ((ball.x - flipper.x) * dx + (ball.y - flipper.y) * dy) / (len * len);
        ball.vx += (isLeft ? 1 : -1) * hitPos * power * 0.6;

        // Move ball out of flipper
        ball.x += nx * normalUp * (ball.radius + 8 - dist);
        ball.y = Math.min(ball.y, flipper.y - ball.radius - 8);

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
        const nx = dx / dist;
        const ny = dy / dist;

        ball.vx = nx * physics.bumperForce;
        ball.vy = ny * physics.bumperForce;

        ball.x = bumper.x + nx * (ball.radius + bumper.radius + 2);
        ball.y = bumper.y + ny * (ball.radius + bumper.radius + 2);

        addScore(100);
        bumper.active = true;
        bumper.timer = 10;
        bumper.hits++;
    }

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
        ball.vy = Math.abs(ball.vy) * physics.bounce; // Bounce back
        addScore(500);

        const allDown = dropTargets.every(t => !t.active);
        if (allDown) {
            addScore(5000);
            setTimeout(() => {
                dropTargets.forEach(t => t.active = true);
            }, 2000);
        }
    }
}

function handleSpinnerCollision() {
    const spinnerLeft = spinner.x - spinner.width / 2;
    const spinnerRight = spinner.x + spinner.width / 2;
    const spinnerTop = spinner.y - 15;
    const spinnerBottom = spinner.y + 15;

    if (ball.x + ball.radius > spinnerLeft &&
        ball.x - ball.radius < spinnerRight &&
        ball.y + ball.radius > spinnerTop &&
        ball.y - ball.radius < spinnerBottom) {

        spinner.spinSpeed += ball.vy * 0.3;
        ball.vy *= 0.9;
        addScore(50);
    }
}

function handleRampCollision() {
    const rampWidth = 30;
    if (ball.x > ramp.x1 - rampWidth / 2 &&
        ball.x < ramp.x1 + rampWidth / 2 &&
        ball.y > ramp.y1 - 25 &&
        ball.y < ramp.y1 + 25 &&
        ball.vy < -5) {

        const rampAngle = Math.atan2(ramp.y2 - ramp.y1, ramp.x2 - ramp.x1);
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

        if (speed > 10) {
            ball.vx = Math.cos(rampAngle) * speed * 0.85;
            ball.vy = Math.sin(rampAngle) * speed * 0.85;
            addScore(200);
        }
    }
}

function updateSpinner() {
    spinner.angle += spinner.spinSpeed;
    spinner.spinSpeed *= spinner.friction;

    if (Math.abs(spinner.spinSpeed) > 0.5) {
        addScore(Math.floor(Math.abs(spinner.spinSpeed)));
    }
}

function updateFlippers() {
    if (flippers.left.active) {
        flippers.left.angle += (flippers.left.maxAngle - flippers.left.angle) * flippers.left.speed;
    } else {
        flippers.left.angle += (flippers.left.targetAngle - flippers.left.angle) * flippers.left.speed * 0.5;
    }

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

    dropTargets.forEach(t => t.active = true);
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
    const w = canvas.width;
    const h = canvas.height;
    ball.x = plunger.x;
    ball.y = h - 60;

    // Strong launch to reach top of table
    ball.vx = -3 - Math.random() * 2;
    ball.vy = -28 - Math.random() * 5; // Much stronger launch
    ball.active = true;
}

// Drawing functions
function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const playableWidth = w - plunger.width;

    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    // Draw playfield
    drawPlayfield(playableWidth, h);

    // Draw plunger lane
    drawPlungerLane(w, h, playableWidth);

    // Draw ramp
    drawRamp();

    // Draw spinner
    drawSpinner();

    // Draw bumpers
    bumpers.forEach(drawBumper);

    // Draw drop targets
    dropTargets.forEach(drawDropTarget);

    // Draw slingshots
    drawSlingshot(slingshots.left, true);
    drawSlingshot(slingshots.right, false);

    // Draw flippers
    drawFlipper(flippers.left, true);
    drawFlipper(flippers.right, false);

    // Draw lane guides
    drawLaneGuides(playableWidth, h);

    // Draw ball
    if (ball.active) {
        drawBall();
    }

    // Draw launch indicator
    if (!gameState.ballInPlay && gameState.ballsRemaining > 0) {
        drawLaunchIndicator(w, h);
    }
}

function drawPlayfield(playableWidth, h) {
    // Playfield background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(0.5, '#0f0f28');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, playableWidth, h);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < playableWidth; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(playableWidth, y);
        ctx.stroke();
    }

    // Playfield border
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 5;
    ctx.strokeRect(2.5, 2.5, playableWidth - 5, h - 5);
}

function drawPlungerLane(w, h, playableWidth) {
    // Plunger lane background
    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.fillRect(playableWidth, 0, plunger.width, h);

    // Lane border
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playableWidth, 0);
    ctx.lineTo(playableWidth, h);
    ctx.stroke();

    // Curved top entrance
    ctx.beginPath();
    ctx.arc(playableWidth + plunger.width / 2, 25, plunger.width / 2 - 5, Math.PI, 0);
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Plunger mechanism
    if (!gameState.ballInPlay) {
        // Plunger rod
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(plunger.x - 8, h - 100, 16, 70);

        // Plunger handle
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(plunger.x, h - 35, 12, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawSlingshot(slingshot, isLeft) {
    const points = slingshot.points;
    if (points.length < 3) return;

    // Slingshot body
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.closePath();

    // Fill with gradient
    const gradient = ctx.createLinearGradient(
        points[0].x, points[1].y,
        points[2].x, points[0].y
    );

    if (slingshot.active) {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.5, '#ffeb3b');
        gradient.addColorStop(1, '#ff9800');
    } else {
        gradient.addColorStop(0, '#ff9800');
        gradient.addColorStop(0.5, '#e65100');
        gradient.addColorStop(1, '#bf360c');
    }

    ctx.fillStyle = gradient;
    ctx.fill();

    // Rubber band effect (inner triangle)
    ctx.strokeStyle = slingshot.active ? '#fff' : '#ffeb3b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const inset = 8;
    const cx = (points[0].x + points[1].x + points[2].x) / 3;
    const cy = (points[0].y + points[1].y + points[2].y) / 3;

    for (let i = 0; i < 3; i++) {
        const px = points[i].x + (cx - points[i].x) * 0.25;
        const py = points[i].y + (cy - points[i].y) * 0.25;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Border
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.closePath();
    ctx.stroke();
}

function drawRamp() {
    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    const offset = 12;
    ctx.beginPath();
    ctx.moveTo(ramp.x1 - offset, ramp.y1);
    ctx.lineTo(ramp.x2 - offset, ramp.y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ramp.x1 + offset, ramp.y1);
    ctx.lineTo(ramp.x2 + offset, ramp.y2);
    ctx.stroke();

    // Ramp entry highlight
    ctx.fillStyle = 'rgba(155, 89, 182, 0.4)';
    ctx.beginPath();
    ctx.arc(ramp.x1, ramp.y1, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#9b59b6';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RAMP', ramp.x1, ramp.y1 + 3);
}

function drawSpinner() {
    ctx.save();
    ctx.translate(spinner.x, spinner.y);
    ctx.rotate(spinner.angle);

    const gradient = ctx.createLinearGradient(-spinner.width / 2, 0, spinner.width / 2, 0);
    gradient.addColorStop(0, '#e74c3c');
    gradient.addColorStop(0.5, '#f39c12');
    gradient.addColorStop(1, '#e74c3c');

    ctx.fillStyle = gradient;
    ctx.fillRect(-spinner.width / 2, -spinner.height / 2, spinner.width, spinner.height);

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Spinner housing
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(spinner.x, spinner.y, spinner.width / 2 + 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#e74c3c';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPINNER', spinner.x, spinner.y + spinner.width / 2 + 18);
}

function drawBumper(bumper) {
    const gradient = ctx.createRadialGradient(
        bumper.x - 4, bumper.y - 4, 0,
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

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.radius - 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
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
        gradient.addColorStop(0, '#2ecc71');
        gradient.addColorStop(1, '#27ae60');

        ctx.fillStyle = gradient;
        ctx.fillRect(
            target.x - target.width / 2,
            target.y - target.height / 2,
            target.width,
            target.height
        );

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(
            target.x - target.width / 2,
            target.y - target.height / 2,
            target.width / 2,
            target.height
        );
    } else {
        ctx.fillStyle = 'rgba(39, 174, 96, 0.2)';
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

    // Flipper shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(flipper.x + 2, flipper.y + 2);
    ctx.lineTo(endX + 2, endY + 2);
    ctx.stroke();

    // Flipper body - tapered shape
    ctx.strokeStyle = flipper.active ? '#4ecdc4' : '#3498db';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(flipper.x, flipper.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Flipper highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(flipper.x, flipper.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Pivot point
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(flipper.x, flipper.y, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(flipper.x, flipper.y, 5, 0, Math.PI * 2);
    ctx.fill();
}

function drawLaneGuides(playableWidth, h) {
    const flipperY = flippers.left.y;
    const outlaneWidth = 18;

    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Left outlane separator
    ctx.beginPath();
    ctx.moveTo(outlaneWidth, flipperY - 80);
    ctx.lineTo(outlaneWidth, flipperY + 15);
    ctx.stroke();

    // Right outlane separator
    ctx.beginPath();
    ctx.moveTo(playableWidth - outlaneWidth, flipperY - 80);
    ctx.lineTo(playableWidth - outlaneWidth, flipperY + 15);
    ctx.stroke();

    // Left guide rail (from mid-field to slingshot)
    ctx.beginPath();
    ctx.moveTo(5, h * 0.45);
    ctx.quadraticCurveTo(15, h * 0.55, 25, flipperY - 75);
    ctx.stroke();

    // Right guide rail
    ctx.beginPath();
    ctx.moveTo(playableWidth - 5, h * 0.45);
    ctx.quadraticCurveTo(playableWidth - 15, h * 0.55, playableWidth - 25, flipperY - 75);
    ctx.stroke();

    // Drain area indicator
    ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
    const drainLeft = outlaneWidth + 10;
    const drainRight = playableWidth - outlaneWidth - 10;
    ctx.fillRect(drainLeft, flipperY + 25, drainRight - drainLeft, 35);

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DRAIN', playableWidth / 2, flipperY + 45);
}

function drawBall() {
    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball gradient
    const gradient = ctx.createRadialGradient(
        ball.x - 2, ball.y - 2, 0,
        ball.x, ball.y, ball.radius
    );
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(0.3, '#e0e0e0');
    gradient.addColorStop(0.7, '#b0b0b0');
    gradient.addColorStop(1, '#808080');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(ball.x - 2, ball.y - 2, ball.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
}

function drawLaunchIndicator(w, h) {
    const playableWidth = w - plunger.width;

    ctx.fillStyle = 'rgba(78, 205, 196, 0.9)';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';

    // Check if touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
        ctx.fillText('Tap GO!', playableWidth / 2, h / 2 - 10);
        ctx.fillText('to launch', playableWidth / 2, h / 2 + 10);
    } else {
        ctx.fillText('Press SPACE', playableWidth / 2, h / 2 - 10);
        ctx.fillText('to launch!', playableWidth / 2, h / 2 + 10);
    }

    // Blinking ball in plunger lane
    const blink = Math.sin(Date.now() / 200) > 0;
    if (blink) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(plunger.x, h - 60, ball.radius, 0, Math.PI * 2);
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

// Touch controls with improved mobile handling
const touchLeft = document.getElementById('touchLeft');
const touchRight = document.getElementById('touchRight');
const touchLaunch = document.getElementById('touchLaunch');

// Helper function to handle touch events properly
function setupTouchButton(button, onStart, onEnd) {
    // Touch events
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        button.classList.add('pressed');
        onStart();
    }, { passive: false });

    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        button.classList.remove('pressed');
        if (onEnd) onEnd();
    }, { passive: false });

    button.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        button.classList.remove('pressed');
        if (onEnd) onEnd();
    }, { passive: false });

    // Mouse events for desktop testing
    button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        button.classList.add('pressed');
        onStart();
    });

    button.addEventListener('mouseup', (e) => {
        e.preventDefault();
        button.classList.remove('pressed');
        if (onEnd) onEnd();
    });

    button.addEventListener('mouseleave', () => {
        button.classList.remove('pressed');
        if (onEnd) onEnd();
    });
}

// Setup flipper controls
setupTouchButton(touchLeft,
    () => { flippers.left.active = true; },
    () => { flippers.left.active = false; }
);

setupTouchButton(touchRight,
    () => { flippers.right.active = true; },
    () => { flippers.right.active = false; }
);

// Launch button - only needs start action
setupTouchButton(touchLaunch,
    () => { launchBall(); },
    null
);

// Prevent default touch behaviors on canvas
canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

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

// Mobile settings button
const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');
if (mobileSettingsBtn) {
    mobileSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });
}

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

// Game loop
function gameLoop() {
    updateBall();
    updateFlippers();
    updateSpinner();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize and start the game
function startGame() {
    // Wait for DOM to be fully ready
    resizeCanvas();
    initializeGameElements();
    document.getElementById('highScore').textContent = gameState.highScore;
    gameLoop();
}

// Start when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    // Small delay to ensure layout is complete
    setTimeout(startGame, 50);
}

// Close modal when clicking outside
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});

// Prevent zoom on double tap for iOS
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });
let lastTouchEnd = 0;
