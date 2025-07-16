// Módulos da Matter.js
const { Engine, World, Bodies, Body, Events, Vector } = Matter;

// Variáveis do jogo
let engine;
let world;
let balls = [];
let pins = [];
let sideBorders = [];

// Variáveis de imagem
let backgroundImg;
let foregroundImg;

// Variáveis de som e efeitos
let confettiParticles = [];
let bgMusic, pinSound, winSound, loseSound;
let musicStarted = false;
let isBallInPlay = false;

// Variáveis de resultado
let resultMessage = '';
let messageTimer = 0;
const MESSAGE_DURATION = 180;

// Constantes
const GAME_WIDTH = 1080;
const GAME_HEIGHT = 1920;
const BALL_RADIUS = 25;
const PIN_RADIUS = 10;
const prizeTexts = [ "TENTE\nNOVAMENTE", "VOCÊ\nGANHOU", "NÃO FOI\nDESSA VEZ", "TENTE\nNOVAMENTE", "VOCÊ\nGANHOU", "NÃO FOI\nDESSA VEZ", "VOCÊ\nGANHOU", "TENTE\nNOVAMENTE" ];

function preload() {
    soundFormats('mp3', 'wav');
    soundFormats('mp3', 'wav');
    backgroundImg = loadImage('imagens/cerbras-bg.jpg');
    foregroundImg = loadImage('imagens/tubos.png');
    bgMusic = loadSound('sons/music.mp3');
    pinSound = loadSound('sons/pin.mp3');
    winSound = loadSound('sons/win.mp3');
    loseSound = loadSound('sons/lose.mp3');
}

function setup() {
    createCanvas(GAME_WIDTH, GAME_HEIGHT);
    engine = Engine.create();
    world = engine.world;
    engine.world.gravity.y = 2.4;
    createPins();
    createSideBorders();
    createPrizeSlots();
    setupCollisionListener();
}

function draw() {
    image(backgroundImg, 0, 0, width, height);
    Engine.update(engine);
    drawPins();
    drawSideBorders();
    drawBalls();
    image(foregroundImg, 0, 0, width, height);
    drawConfetti();
    displayResultMessage();
}

// MUDANÇA: A função de clique agora também retoma a música
function mousePressed() {
    // Inicia a música pela primeira vez
    if (!musicStarted) {
        bgMusic.setVolume(0.15);
        bgMusic.loop();
        musicStarted = true;
    }

    // Permite criar uma nova bola apenas se não houver outra em jogo
    if (!isBallInPlay && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        // Se a música foi iniciada mas não está tocando (porque foi pausada), reinicia o loop
        if (musicStarted && !bgMusic.isPlaying()) {
            bgMusic.loop();
        }
        createBall();
    }
}


// MUDANÇA: A função de prêmio agora pausa a música
function handlePrizeHit(ballBody, prizeBody) {
    if (messageTimer > 0) return;

    const prizeIndex = parseInt(prizeBody.label.split('-')[1]);
    resultMessage = prizeTexts[prizeIndex];
    messageTimer = MESSAGE_DURATION;

    // Pausa a música de fundo assim que o resultado aparece
    bgMusic.pause();

    // Toca os sons de vitória/derrota
    if (resultMessage === "VOCÊ\nGANHOU") {
        winSound.play();
        for (let i = 0; i < 100; i++) confettiParticles.push(new ConfettiParticle());
    } else if (resultMessage === "NÃO FOI\nDESSA VEZ") {
        loseSound.play();
    }

    // Remove a bola do jogo
    setTimeout(() => {
        World.remove(world, ballBody);
        balls = balls.filter(b => b.body.id !== ballBody.id);
    }, 100);
}


// --- Restante do código (sem alterações) ---

function createPins() {
    const rows = 12, cols = 9, spacingY = 112, spacingX = 100, startX = 90, startY = 320;
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            let x = startX + i * spacingX;
            if (j % 2 == 1) x += spacingX / 2;
            if (x > width - startX) continue;
            const y = startY + j * spacingY;
            const pinBody = Bodies.circle(x, y, PIN_RADIUS, { isStatic: true, restitution: 0.5, friction: 0.5, label: 'pin' });
            World.add(world, pinBody);
            pins.push({ body: pinBody, glow: 0 });
        }
    }
}

function drawPins() {
    noStroke();
    const darkGray = color(120), lightGray = color(220);
    for (const pin of pins) {
        const pos = pin.body.position;
        if (pin.glow > 0) {
            drawingContext.shadowColor = color(173, 255, 47, pin.glow);
            drawingContext.shadowBlur = 20;
            pin.glow = max(0, pin.glow - 5);
        }
        for (let i = PIN_RADIUS; i > 0; i--) {
            const inter = map(i, 0, PIN_RADIUS, 0, 1), c = lerpColor(lightGray, darkGray, inter);
            fill(c);
            circle(pos.x, pos.y, i * 2);
        }
        drawingContext.shadowBlur = 0;
    }
}

function setupCollisionListener() {
    Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            const { bodyA, bodyB } = pairs[i];
            let pinBody = null;
            if (bodyA.label === 'ball' && bodyB.label === 'pin') pinBody = bodyB;
            else if (bodyB.label === 'ball' && bodyA.label === 'pin') pinBody = bodyA;
            if (pinBody) {
                pinSound.setVolume(0.5);
                pinSound.rate(random(0.8, 1.2));
                pinSound.play();
                for (const pin of pins) {
                    if (pin.body.id === pinBody.id) {
                        pin.glow = 255;
                        break;
                    }
                }
            }
            if (bodyA.label === 'ball' && bodyB.label.startsWith('prize-')) handlePrizeHit(bodyA, bodyB);
            else if (bodyB.label === 'ball' && bodyA.label.startsWith('prize-')) handlePrizeHit(bodyB, bodyA);
        }
    });
}

function createBall() {
    isBallInPlay = true;
    const minX = 150, maxX = width - 150;
    const spawnX = random(minX, maxX);
    const ball = Bodies.circle(spawnX, 180, BALL_RADIUS, { restitution: 0.5, friction: 0.01, label: 'ball' });
    World.add(world, ball);
    balls.push({ body: ball });
}

function drawBalls() {
    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        fill(200, 200, 220); noStroke();
        beginShape();
        for (let j = 0; j < ball.body.vertices.length; j++) vertex(ball.body.vertices[j].x, ball.body.vertices[j].y);
        endShape(CLOSE);
        if (ball.body.position.y > height + 100) {
            World.remove(world, ball.body);
            balls.splice(i, 1);
            isBallInPlay = false;
        }
    }
}

function createSideBorders() {
    const borderOptions = { isStatic: true, label: 'border', restitution: 1.5 };
    const triH = 110, triW = 40, startY = 270, numTri = 13;
    let leftV = []; for (let i = 0; i < numTri; i++) { const y = startY + i * triH; leftV.push({ x: 0, y: y }); leftV.push({ x: triW, y: y + triH / 2 }); } leftV.push({ x: 0, y: startY + numTri * triH });
    const leftB = Bodies.fromVertices(triW / 2 - 8, 995, [leftV], borderOptions); World.add(world, leftB); sideBorders.push(leftB);
    let rightV = []; for (let i = 0; i < numTri; i++) { const y = startY + i * triH; rightV.push({ x: width, y: y }); rightV.push({ x: width - triW, y: y + triH / 2 }); } rightV.push({ x: width, y: startY + numTri * triH });
    const rightB = Bodies.fromVertices(width - triW / 2 + 8, 995, [rightV], borderOptions); World.add(world, rightB); sideBorders.push(rightB);
}

function drawSideBorders() {
    fill(34, 139, 34, 180); noStroke();
    for (const border of sideBorders) {
        beginShape();
        for (const vert of border.vertices) vertex(vert.x, vert.y);
        endShape(CLOSE);
    }
}

function displayResultMessage() {
    if (messageTimer > 0) {
        fill(0, 0, 0, 180); rect(0, height / 2 - 150, width, 300);
        fill(255); textAlign(CENTER, CENTER); textSize(100); textStyle(BOLD);
        text(resultMessage, width / 2, height / 2);
        messageTimer--;
        if (messageTimer <= 0) {
            resultMessage = '';
            isBallInPlay = false;
        }
    }
}

class ConfettiParticle {
    constructor() { this.pos = createVector(random(width), random(-50, 0)); this.vel = createVector(random(-3, 3), random(5, 10)); this.acc = createVector(0, 0.1); this.size = random(10, 20); this.color = color(random(255), random(255), random(255)); this.alpha = 255; }
    update() { this.vel.add(this.acc); this.pos.add(this.vel); this.alpha -= 2; }
    isFinished() { return this.alpha < 0; }
    display() { noStroke(); fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], this.alpha); rect(this.pos.x, this.pos.y, this.size, this.size); }
}

function drawConfetti() { for (let i = confettiParticles.length - 1; i >= 0; i--) { confettiParticles[i].update(); confettiParticles[i].display(); if (confettiParticles[i].isFinished()) confettiParticles.splice(i, 1); } }

function createPrizeSlots() {
    const nS = 8, sW = width / nS, dH = 250, dY = height - dH / 2 - 40;
    for (let i = 1; i < nS; i++) { const d = Bodies.rectangle(i * sW, dY, 15, dH, { isStatic: true, label: 'divider' }); World.add(world, d); }
    const sY = height - 50;
    for (let i = 0; i < nS; i++) { const s = Bodies.rectangle(sW / 2 + i * sW, sY, sW, 100, { isStatic: true, isSensor: true, label: `prize-${i}` }); World.add(world, s); }
}