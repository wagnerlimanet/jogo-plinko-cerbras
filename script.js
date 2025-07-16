// Wagner Lima | www.wagnerlima.net | @wagnerlimaNET
// Professor de desenvolvimento web e design na escola iwtraining, especialista em mecanismos de 
// buscas (SEO) e graduando em Sistemas e Mídias Digitais na Universidade Federal do Ceará (UFC).

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

// Variáveis de Sons e Efeitos
let confettiParticles = [];
let bgMusic, pinSound, winSound, loseSound;
let musicStarted = false;

// Variáveis de resultado
let resultMessage = '';
let messageTimer = 0;
const MESSAGE_DURATION = 180; // 3 segundos

// Constantes
const GAME_WIDTH = 1080;
const GAME_HEIGHT = 1920;
const BALL_RADIUS = 25;
const PIN_RADIUS = 10;
const prizeTexts = [ "TENTE\nNOVAMENTE", "VOCÊ\nGANHOU", "NÃO FOI\nDESSA VEZ", "TENTE\nNOVAMENTE", "VOCÊ\nGANHOU", "NÃO FOI\nDESSA VEZ", "VOCÊ\nGANHOU", "TENTE\nNOVAMENTE" ];

// Pré-carregando as imagens e sons
function preload() {
    // Arquivos de imagens
    backgroundImg = loadImage('imagens/cerbras2-bg.jpg');
    foregroundImg = loadImage('imagens/base.png');

    // Arquivos de som
    soundFormats('mp3', 'wav');
    bgMusic = loadSound('sons/planes-crashing-213794.mp3');
    pinSound = loadSound('sons/coin-drop-355977.mp3');
    winSound = loadSound('sons/you-win-sequence-1-183948.mp3');
    loseSound = loadSound('sons/wah-wah-sad-trombone-6347.mp3');
}

function setup() {
    createCanvas(GAME_WIDTH, GAME_HEIGHT);
    engine = Engine.create();
    world = engine.world;
    // Velocidade da bola (gravidade)
    engine.world.gravity.y = 2.2;

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
    
    // Confetes ganhador
    drawConfetti();

    displayResultMessage();
}

function mousePressed() {
    // Iniciando música principal ao clicar em qualquer local da janela
    if (!musicStarted) {
        bgMusic.loop();
        musicStarted = true;
    }

    if (messageTimer <= 0 && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        createBall();
    }
}

// Classe para partículas de confetes ***
class ConfettiParticle {
    constructor() {
        this.pos = createVector(random(width), random(-50, 0));
        this.vel = createVector(random(-3, 3), random(5, 10));
        this.acc = createVector(0, 0.1);
        this.size = random(10, 20);
        this.color = color(random(255), random(255), random(255));
        this.alpha = 255;
    }

    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.alpha -= 2;
    }

    isFinished() {
        return this.alpha < 0;
    }

    display() {
        noStroke();
        fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], this.alpha);
        rect(this.pos.x, this.pos.y, this.size, this.size);
    }
}

// Desenhando todos os confetes
function drawConfetti() {
    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        confettiParticles[i].update();
        confettiParticles[i].display();
        if (confettiParticles[i].isFinished()) {
            confettiParticles.splice(i, 1);
        }
    }
}

// Colisão com efeito sonoro
function setupCollisionListener() {
    Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            const { bodyA, bodyB } = pairs[i];

            // Colisão da bola com o pino
            if ((bodyA.label === 'ball' && bodyB.label === 'pin') || (bodyB.label === 'ball' && bodyA.label === 'pin')) {
                // Som do pino com volume e velocidade de reprodução levemente aleatórios
                pinSound.setVolume(0.5);
                pinSound.rate(random(0.8, 1.2));
                pinSound.play();
            }

            // Colisão da bola com o prêmio
            if (bodyA.label === 'ball' && bodyB.label.startsWith('prize-')) handlePrizeHit(bodyA, bodyB);
            else if (bodyB.label === 'ball' && bodyA.label.startsWith('prize-')) handlePrizeHit(bodyB, bodyA);
        }
    });
}

// Prêmios, sons e confetes ***
function handlePrizeHit(ballBody, prizeBody) {
    if (messageTimer > 0) return;

    const prizeIndex = parseInt(prizeBody.label.split('-')[1]);
    resultMessage = prizeTexts[prizeIndex];
    messageTimer = MESSAGE_DURATION;

    // Toca o som e dispara os efeitos correspondentes
    if (resultMessage === "VOCÊ\nGANHOU") {
        winSound.play();
        // Cria 100 partículas de confete
        for (let i = 0; i < 100; i++) {
            confettiParticles.push(new ConfettiParticle());
        }
    } else if (resultMessage === "NÃO FOI\nDESSA VEZ") {
        loseSound.play();
    }

    setTimeout(() => {
        World.remove(world, ballBody);
        balls = balls.filter(b => b.body.id !== ballBody.id);
    }, 100);
}

// --- Desenhando todos os demais objetos
function createBall() {
    const minX = 150, maxX = width - 150;
    const spawnX = random(minX, maxX);
    const ball = Bodies.circle(spawnX, 180, BALL_RADIUS, { restitution: 0.5, friction: 0.01, label: 'ball' });
    World.add(world, ball);
    balls.push({ body: ball });
}

function drawPins() {
    noStroke();
    const darkGray = color(120), lightGray = color(220);
    for (const pin of pins) {
        for (let i = PIN_RADIUS; i > 0; i--) {
            const inter = map(i, 0, PIN_RADIUS, 0, 1), c = lerpColor(lightGray, darkGray, inter);
            fill(c);
            circle(pin.position.x, pin.position.y, i * 2);
        }
    }
}

function drawSideBorders() {
    fill(34, 139, 34, 180);
    noStroke();
    for (const border of sideBorders) {
        beginShape();
        for (const vert of border.vertices) vertex(vert.x, vert.y);
        endShape(CLOSE);
    }
}

function drawBalls() {
    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        fill(200, 200, 220);
        noStroke();
        beginShape();
        for (let j = 0; j < ball.body.vertices.length; j++) vertex(ball.body.vertices[j].x, ball.body.vertices[j].y);
        endShape(CLOSE);
        if (ball.body.position.y > height + 100) {
            World.remove(world, ball.body);
            balls.splice(i, 1);
        }
    }
}

function createPins() {
    const r = 12, c = 9, sY = 112, sX = 100, sX_ = 90, sY_ = 320;
    for (let j = 0; j < r; j++) {
        for (let i = 0; i < c; i++) {
            let x = sX_ + i * sX; if (j % 2 == 1) x += sX / 2; if (x > width - sX_) continue;
            const y = sY_ + j * sY;
            const pin = Bodies.circle(x, y, PIN_RADIUS, { isStatic: true, restitution: 0.5, friction: 0.5, label: 'pin' });
            World.add(world, pin); pins.push(pin);
        }
    }
}

function createSideBorders() {
    const o = { isStatic: true, label: 'border' }, h = 110, w = 40, y = 270, n = 13;
    let lV = []; for (let i = 0; i < n; i++) { lV.push({ x: 0, y: y + i * h }); lV.push({ x: w, y: y + i * h + h / 2 }); } lV.push({ x: 0, y: y + n * h });
    const l = Bodies.fromVertices(w / 2, 995, [lV], o); World.add(world, l); sideBorders.push(l);
    let rV = []; for (let i = 0; i < n; i++) { rV.push({ x: width, y: y + i * h }); rV.push({ x: width - w, y: y + i * h + h / 2 }); } rV.push({ x: width, y: y + n * h });
    const r = Bodies.fromVertices(width - w / 2, 995, [rV], o); World.add(world, r); sideBorders.push(r);
}

function createPrizeSlots() {
    const nS = 8, sW = width / nS, dH = 250, dY = height - dH / 2 - 40;
    for (let i = 1; i < nS; i++) { const d = Bodies.rectangle(i * sW, dY, 15, dH, { isStatic: true, label: 'divider' }); World.add(world, d); }
    const sY = height - 50;
    for (let i = 0; i < nS; i++) { const s = Bodies.rectangle(sW / 2 + i * sW, sY, sW, 100, { isStatic: true, isSensor: true, label: `prize-${i}` }); World.add(world, s); }
}

function displayResultMessage() {
    if (messageTimer > 0) {
        fill(0, 0, 0, 180); rect(0, height / 2 - 150, width, 300);
        fill(255); textAlign(CENTER, CENTER); textSize(100); textStyle(BOLD);
        text(resultMessage, width / 2, height / 2);
        messageTimer--; if (messageTimer <= 0) resultMessage = '';
    }
}