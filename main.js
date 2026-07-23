const canvas = document.getElementById("MyCanvas");
const ctx = canvas.getContext("2d");
const DOOR_SIZE = 180;
const wallThickness = 25;
const walls = [];
const ROOM_SIZE = 450;
const GAP = 120;
const ROOMS_X = 8;
const ROOMS_Y = 9;
const rooms = [];
const GAME_TIME = 300;
const rulebookpage = document.getElementById("rulebookpage");
const closeRulebook = document.getElementById("closeRulebook");
const keys = {};

let gameStartTime = null;
let gameOver = false;
let gamePaused = false;
let gameStarted = false;
let pauseStart = null;
let totalPausedTime = 0;
let bonusTime = 0;
let mouseWorldX = 0;
let mouseWorldY = 0;

const game = {
    player:{
        x: -250,
        y: -250,
        width: 40,
        height: 40,
        speed: 5,
        health: 100,
        score: 0,
        currency : 0
    },
    bullets: [],
    enemies: []
};

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

function collidesWithWall(x, y, width, height) {
    for (const wall of walls) {
        if (x < wall.x + wall.width && x + width > wall.x && y < wall.y + wall.height && y + height > wall.y) {
            return true;
        }
    }
    return false;
}

function bulletHitsEnemy(b, enemy) {
    return (
        b.x + b.radius > enemy.x &&
        b.x - b.radius < enemy.x + enemy.width &&
        b.y + b.radius > enemy.y &&
        b.y - b.radius < enemy.y + enemy.height
    );
}

function getRoom(px, py) {
    for (let r of rooms) {
        if (
            px >= r.x &&
            px <= r.x + r.width &&
            py >= r.y &&
            py <= r.y + r.height
        ) return r;
    }
    return null;
}

function screenToWorld(x, y) {
    const rect = canvas.getBoundingClientRect();
    const v = getView();
    return {
        x: (x - rect.left - v.offsetX) / v.scale,
        y: (y - rect.top - v.offsetY) / v.scale
    };
}

//camera is a set of values that determines which part of the world is shown on the canvas.

function getTimeLeft() {
    if (!gameStarted || gameStartTime === null) { //When game starts gameStartTime = Date.now()
        return GAME_TIME + bonusTime;//Here bonus time is zero if no bonus time is taken by player.
    }
    let pausedTime = totalPausedTime;//creates a new local variable everytime getTimeLeft() runs and sets pausedTime = totalPauedTime
    if (gamePaused && pauseStart !== null) { //When pause button is clicked, pauseStart = Date.now() which is the number of milliseconds that have been passed since January 1 1970 and gamePaused becomes true.
        pausedTime += Date.now() - pauseStart;//keeps on increasing as the amount of time passes in pause is increased.
    }
    const elapsed =(Date.now() - gameStartTime - pausedTime) / 1000; 
    return Math.max(0,Math.ceil(GAME_TIME + bonusTime - elapsed)
    );
}

function distanceToPlayer(enemy) {
    const dx = game.player.x - enemy.x;
    const dy = game.player.y - enemy.y;
    return Math.hypot(dx, dy);
}

function buildRooms() {
    rooms.length = 0;
    walls.length = 0;
    const edges = ["top", "bottom", "left", "right"];
    for (let y = 0; y < ROOMS_Y; y++) {
        for (let x = 0; x < ROOMS_X; x++) {
            const doorEdge = edges[Math.floor(Math.random() * edges.length)]; //This will return a number between 0 and 1.
            const room = {
                x: x * (ROOM_SIZE + GAP),
                y: y * (ROOM_SIZE + GAP),
                width: ROOM_SIZE,
                height: ROOM_SIZE,
                doorEdge,
                cleared: false
            };
            rooms.push(room);
            createRoomWalls(room);
        }
    }
}

function createRoomWalls(room) {
    const t = wallThickness;
    const doorX = room.x + room.width / 2 - DOOR_SIZE / 2;
    const doorY = room.y + room.height / 2 - DOOR_SIZE / 2;
    if (room.doorEdge === "top") {
        walls.push({
            x: room.x,
            y: room.y,
            width: doorX - room.x,
            height: t
        });
        walls.push({
            x: doorX + DOOR_SIZE,
            y: room.y,
            width:
                room.width -
                (doorX - room.x) -
                DOOR_SIZE,
            height: t
        });
    } else {
        walls.push({
            x: room.x,
            y: room.y,
            width: room.width,
            height: t
        });
    }
    if (room.doorEdge === "bottom") {
        const by = room.y + room.height - t;
        walls.push({
            x: room.x,
            y: by,
            width: doorX - room.x,
            height: t
        });
        walls.push({
            x: doorX + DOOR_SIZE,
            y: by,
            width:
                room.width -
                (doorX - room.x) -
                DOOR_SIZE,
            height: t
        });
    } 
    else {
        walls.push({
            x: room.x,
            y: room.y + room.height - t,
            width: room.width,
            height: t
        });
    }
    if (room.doorEdge === "left") {
        walls.push({
            x: room.x,
            y: room.y,
            width: t,
            height: doorY - room.y
        });
        walls.push({
            x: room.x,
            y: doorY + DOOR_SIZE,
            width: t,
            height:
                room.height -
                (doorY - room.y) -
                DOOR_SIZE
        });
    } 
    else {
        walls.push({
            x: room.x,
            y: room.y,
            width: t,
            height: room.height
        });
    }
    if (room.doorEdge === "right") {
        const rx = room.x + room.width - t;
        walls.push({
            x: rx,
            y: room.y,
            width: t,
            height: doorY - room.y
        });
        walls.push({
            x: rx,
            y: doorY + DOOR_SIZE,
            width: t,
            height:
                room.height -
                (doorY - room.y) -
                DOOR_SIZE
        });
    } else {
        walls.push({
            x: room.x + room.width - t,
            y: room.y,
            width: t,
            height: room.height
        });
    }
}

function spawnEnemies() {
    game.enemies = [];
    for (const room of rooms) {
        if (Math.random() < 1) {
            const x = room.x + 100 + Math.random() * (room.width - 200);
            const y = room.y + 100 + Math.random() * (room.height - 200);
            const types = ["guard","sentry","hunter"];
            const type =types[Math.floor(Math.random() * types.length)];
            game.enemies.push({
                x, //object property shorthand can be used when the property name and variable name are the same.
                y,
                type,
                state: "patrol",
                chaseTimer: 0,
                width: 40,
                height: 40,
                speed:
                    type === "sentry"
                        ? 0
                        : type === "hunter"
                        ? 2.5
                        : 1.5,
                // Ternary operator : if elseif and else.Speed is in pixels per frame
                maxHealth:
                    type === "hunter"
                        ? 150
                        : 100,
                health:
                    type === "hunter"
                        ? 150
                        : 100,
                shootCooldown: 60, //In frames because I'm decreasing it once every frame. distanceToPlayer returns a value in pixels.
                rotationSpeed: 0.01, //How fast the enemy turns in radians per frame.
                detectionRange:
                    type === "hunter"
                        ? 350
                        : 250,
                // This is in pixels
                facingAngle: 0, //The direction the enemy is currently facing. It's measured in radians.Canvas y increases downwards so math.PI /2 faces downwards.
                fov: Math.PI / 3, //Field of View : How wide can the enemy see?
                room,
                patrolPoints: [
                    { x: x - 60, y },
                    { x: x + 60, y }
                ],
                patrolIndex: 0 //Tells the enemy which patrol index its currently moving towards.
            });
        }
    }
}
function updateRoomStatus() {
    const room = getCurrentRoom();
    if (!room) return;
    const enemiesInRoom = game.enemies.filter(enemy => enemy.room === room);
    if (enemiesInRoom.length === 0) {
        room.cleared = true;
    }
}
function moveEnemy(enemy, dx, dy) {
    const nextX = enemy.x + dx;
    const nextY = enemy.y + dy;
    if (!collidesWithWall(nextX, enemy.y, enemy.width, enemy.height)) {
        enemy.x = nextX;
    }
    if (!collidesWithWall(enemy.x, nextY, enemy.width, enemy.height)) {
        enemy.y = nextY;
    }
} // If we check both together the collision might block the entire movement.

function updatePlayer() {
    const p = game.player;
    let moveX = 0;
    let moveY = 0;
    if (keys["w"]) moveY -= p.speed;
    if (keys["s"]) moveY += p.speed;
    if (keys["a"]) moveX -= p.speed;
    if (keys["d"]) moveX += p.speed;
    const nextX = p.x + moveX;
    if ( !collidesWithWall(nextX,p.y,p.width,p.height)) {
        p.x = nextX;
    }
    const nextY = p.y + moveY;
    if (!collidesWithWall(p.x,nextY,p.width,p.height)) {
        p.y = nextY;
    }
}

function updatePatrol(enemy) {
    const target = enemy.patrolPoints[enemy.patrolIndex];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const distance = Math.hypot(dx, dy); // The enemy is these many pixels away from the player.
    if (distance > 5) {
        enemy.facingAngle =Math.atan2(dy, dx); 
        //gives the direction to the target and makes the enemy turn that way(not rn).Now we move the enemy...
        moveEnemy(enemy,Math.cos(enemy.facingAngle) * enemy.speed,Math.sin(enemy.facingAngle) * enemy.speed); 
        // This is a movement of 1 pixel distance. So that's 1 pixel per frame but our speed is x pixels per frame so we multiply each component by x pixels so that root((dx/distance)squared + root((dx/distance)squared) gives x pixels.
        // Now the total distance it moves per frame is 1 pixel but with speed it becomes x pixels per frame using pythagoras theorem.
        // if we use moveEnemy(enemy,dx,dy) the enemy would reach  the player in one frame but we want the enemy to pursue the player at a constant speed.
        // This is the same as moveEnemy(enemy, dx/distance * speed, dy/distance * speed)
    }
    else {
        enemy.patrolIndex++;
        if (enemy.patrolIndex >= enemy.patrolPoints.length) {
            enemy.patrolIndex = 0;
        }
    } 
}

function chasePlayer(enemy) {
    const dx = game.player.x - enemy.x; //This is the order because we want a vector from the enemy to the player.
    const dy = game.player.y - enemy.y;
    const angle = Math.atan2(dy, dx); // (dx,dy) represents sort of a vector from enemy to player. The mathematical def is the angle between the positive x-axis and the vector (x,y).It gives the angle of the vector.
    enemy.facingAngle = angle;
    moveEnemy(enemy,Math.cos(angle) * enemy.speed,Math.sin(angle) * enemy.speed); 
}

function updateGuard(enemy) {
    if (enemy.state === "patrol") {
        updatePatrol(enemy);
        if (canSeePlayer(enemy) || playerInEnemyRoom(enemy)) {
            enemy.state = "chase";
        }
    }
    else if (enemy.state === "chase") {
        chasePlayer(enemy);
        if (!canSeePlayer(enemy)) {
            enemy.state = "patrol";
        }
        enemy.shootCooldown--; //This function gets called about 60 frames per second
        if (enemy.shootCooldown <= 0) {
            enemyShoot(enemy);
            enemy.shootCooldown = 60;
        }
    }
}

function updateHunter(enemy) {
    if (enemy.state === "patrol") {
        updatePatrol(enemy);
        if (canSeePlayer(enemy) ||playerInEnemyRoom(enemy)) {
            enemy.state = "chase";
            enemy.chaseTimer = 420; //frames 
        }
    }
    else if (enemy.state === "chase") {
        chasePlayer(enemy);
        enemy.chaseTimer--;
        if (canSeePlayer(enemy)) {
            enemy.chaseTimer = 420; //It chases player for 420 frames i.e 7 seconds and as long as player is within its sight the timer keeps resetting.
        }
        enemy.shootCooldown--;
        if (enemy.shootCooldown <= 0) {
            enemyShoot(enemy);
            enemy.shootCooldown = 60;
        }
        if (enemy.chaseTimer <= 0) {
            enemy.state = "patrol";
        }
    }
}

function updateSentry(enemy) {
    enemy.facingAngle += enemy.rotationSpeed; // 0.01 radian is added to the facing angle per frame.
    enemy.shootCooldown--;
    if (canSeePlayer(enemy) ||playerInEnemyRoom(enemy)) {
        if (enemy.shootCooldown <= 0) {
            enemyShoot(enemy);
            enemy.shootCooldown = 60;
        }
    }
}

function updateEnemies() {
    for (const enemy of game.enemies) {
        if (enemy.type === "guard") {
            updateGuard(enemy);
        }
        else if (enemy.type === "sentry") {
            updateSentry(enemy);
        }
        else if (enemy.type === "hunter") {
            updateHunter(enemy);
        }
    }
}

function enemyShoot(enemy) {
    const px = game.player.x + game.player.width / 2;
    const py = game.player.y + game.player.height / 2;
    const ex = enemy.x + enemy.width / 2;
    const ey = enemy.y + enemy.height / 2;
    const angle = Math.atan2(py - ey, px - ex);
    game.bullets.push({
        x: ex,
        y: ey,
        radius: 5,
        speed: 6,
        dx: Math.cos(angle), // this is already stored as dx/distance
        dy: Math.sin(angle),
        enemyBullet: true
    });
}

function updateBullets() {
    for (let b of game.bullets) {
        b.x += b.dx * b.speed;
        b.y += b.dy * b.speed;
        if (b.enemyBullet) {
            const p = game.player;
            if (
                b.x + b.radius > p.x &&
                b.x - b.radius < p.x + p.width &&
                b.y + b.radius > p.y &&
                b.y - b.radius < p.y + p.height
            ) {
                p.health -= 10;
                b.remove = true;
            }
            continue;
        }
        for (const wall of walls) {
            if (b.x + b.radius > wall.x && b.x - b.radius < wall.x + wall.width && b.y + b.radius > wall.y && b.y - b.radius < wall.y + wall.height) {
                    const overlapX = Math.min(b.x + b.radius - wall.x, wall.x + wall.width - (b.x - b.radius));
                    const overlapY = Math.min(b.y + b.radius - wall.y, wall.y + wall.height - (b.y - b.radius));
                    if (overlapX < overlapY) {
                        b.dx *= -1;
                    } 
                    else {
                        b.dy *= -1;}
                    b.bounces++;
                    if (b.bounces > 3) {
                        b.remove = true;
                    }
                    b.x += b.dx * 2;
                    b.y += b.dy * 2;
                break;
            }
        }
        for (const enemy of game.enemies) {
            if (bulletHitsEnemy(b, enemy)) {
                enemy.health -= 25;
                b.remove = true;
                if (enemy.health <= 0) {
                    enemy.remove = true;
                    game.player.score += 100;
                    if (enemy.type === "guard")
                        game.player.currency += 15;
                    else if (enemy.type === "sentry")
                        game.player.currency += 10;
                    else if (enemy.type === "hunter")
                        game.player.currency += 25;
                    }
                break;
            }
        }
    }
    game.bullets = game.bullets.filter(b => !b.remove);
    game.enemies = game.enemies.filter(e => !e.remove);
}

function drawRooms() {
    const t = 25;
    for (let r of rooms) {
        ctx.fillStyle = "#003b0a";
        ctx.fillRect(r.x, r.y, r.width, r.height);
        ctx.fillStyle = "black";
        const doorX = r.x + r.width / 2 - DOOR_SIZE / 2;
        const doorY = r.y + r.height / 2 - DOOR_SIZE / 2;
        if (r.doorEdge === "top") {
            ctx.fillRect(r.x, r.y, doorX - r.x, t);
            ctx.fillRect(doorX + DOOR_SIZE, r.y, r.x + r.width - (doorX + DOOR_SIZE), t);
            ctx.fillStyle = "orange";
            ctx.fillRect(doorX, r.y, DOOR_SIZE, t);
            ctx.fillStyle = "black";
        } else {
            ctx.fillRect(r.x, r.y, r.width, t);
        }
        if (r.doorEdge === "bottom") {
            const y = r.y + r.height - t;
            ctx.fillRect(r.x, y, doorX - r.x, t);
            ctx.fillRect(doorX + DOOR_SIZE, y, r.x + r.width - (doorX + DOOR_SIZE), t);
            ctx.fillStyle = "orange";
            ctx.fillRect(doorX, y, DOOR_SIZE, t);
            ctx.fillStyle = "black";
        } else {
            ctx.fillRect(r.x, r.y + r.height - t, r.width, t);
        }
        if (r.doorEdge === "left") {
            ctx.fillRect(r.x, r.y, t, doorY - r.y);
            ctx.fillRect(r.x, doorY + DOOR_SIZE, t, r.y + r.height - (doorY + DOOR_SIZE));
            ctx.fillStyle = "orange";
            ctx.fillRect(r.x, doorY, t, DOOR_SIZE);
            ctx.fillStyle = "black";
        } else {
            ctx.fillRect(r.x, r.y, t, r.height);
        }
        if (r.doorEdge === "right") {
            const x = r.x + r.width - t;
            ctx.fillRect(x, r.y, t, doorY - r.y);
            ctx.fillRect(x, doorY + DOOR_SIZE, t, r.y + r.height - (doorY + DOOR_SIZE));
            ctx.fillStyle = "orange";
            ctx.fillRect(x, doorY, t, DOOR_SIZE);
            ctx.fillStyle = "black";
        } else {
            ctx.fillRect(r.x + r.width - t, r.y, t, r.height);
        }
    }
}

function drawEnemies() {
    for (const enemy of game.enemies) {
        if (enemy.type === "guard") {
            if (enemy.state === "patrol")
                ctx.fillStyle = "red";
            else if (enemy.state === "chase")
                ctx.fillStyle = "orange";
            else
                ctx.fillStyle = "red";
        }
        else if (enemy.type === "sentry") {
            ctx.fillStyle = "cyan";
        }
        else if (enemy.type === "hunter") {
            if (enemy.state === "patrol")
                ctx.fillStyle = "purple";
            else if (enemy.state === "chase")
                ctx.fillStyle = "magenta";
            else
                ctx.fillStyle = "purple";
        }
        ctx.beginPath();
        ctx.arc(enemy.x + enemy.width / 2,enemy.y + enemy.height / 2,20,0,Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "black";
        ctx.fillRect(enemy.x - 10,enemy.y - 20,60,8);
        ctx.fillStyle = "lime";
        ctx.fillRect(enemy.x - 10,enemy.y - 20,60 * (enemy.health / enemy.maxHealth),8);
    }
}

function drawPlayer() {
    const p = game.player;
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    const angle = Math.atan2(mouseWorldY - cy,mouseWorldX - cx); //Tells us which direction the player should face.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(0,0,20,0,Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,0,0.35)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0,0,180,-0.5,0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "black";
    ctx.fillRect(p.x - 10,p.y - 20,60,8);
    ctx.fillStyle = "lime";
    ctx.fillRect(p.x - 10,p.y - 20,60 * (p.health / 100),8);
}

function drawBullets() {
    ctx.fillStyle = "white";
    for (let b of game.bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function draw() {
    const v = getView();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#3D8D7A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(v.scale, 0, 0, v.scale, v.offsetX, v.offsetY); //Transforms and shifts their coordinates to ensure that the player is in the center of view.
    // a = scale horizontally b = vertical skew c = horizontal skew d = scale vertically e = Translate vertically f = Translate horizontally
    drawRooms();
    drawEnemies();
    drawPlayer();
    drawBullets();// Everything in the map is drawn keeping player in mind whereas the side controls are drawn with screen coordinates.
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "white";
    ctx.font = "24px Arial"; 
    const timeLeft = getTimeLeft();
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    ctx.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, "0")}`,20,160);
    ctx.fillText("Money: $" + game.player.currency,20,200);
    ctx.fillText("Health: " + game.player.health,20,40);
    ctx.fillText("Score: " + game.player.score,20,80);
    ctx.fillText("Enemies: " + game.enemies.length,20,120);
    if (gameOver) {
        ctx.fillStyle = "white";
        ctx.font = "60px Arial";
        const text = (game.player.health <= 0) ? "YOU LOST" : "TIME UP!";
        ctx.fillText(text,canvas.width / 2 - 140,canvas.height / 2);
    }
}


function update() {
    if (gameOver) return;
    const timeLeft = getTimeLeft();
    if (timeLeft <= 0) {
        gameOver = true;
        return;
    }
    updatePlayer();
    updateEnemies();
    updateBullets();
    updateRoomStatus();
    if (game.player.health <= 0) {
        game.player.health = 0; // The health left is less than what can be taken from
        gameOver = true;
    }
}

function loop() {
    if (gameStarted && !gamePaused) {
        update();
    }
    draw();
    requestAnimationFrame(loop); // this takes the loop function as a callback and enables it to run every frame.
}

function exitGame() {
    bonusTime = 0;
    gameStarted = false;
    gamePaused = false;
    gameOver = false;
    gameStartTime = null;
    totalPausedTime = 0;
    pauseStart = null;
    game.player.x = -250;
    game.player.y = -250;
    game.player.health = 100;
    game.player.score = 0;
    game.player.currency = 0;
    game.bullets = [];
    game.enemies = [];
    buildRooms();
    spawnEnemies();
    document.getElementById("startBtn").style.display = "block";
    document.getElementById("restartBtn").style.display = "none";
}

function restartGame() {
    bonusTime = 0;
    game.player.x = -250;
    game.player.y = -250;
    game.player.health = 100;
    game.player.score = 0;
    game.player.currency = 0;
    game.bullets = [];
    spawnEnemies();
    gameOver = false;
    gamePaused = false;
    gameStarted = true;
    gameStartTime = Date.now();
    totalPausedTime = 0;
    pauseStart = null;
}

function getCurrentRoom() {
    return getRoom(
        game.player.x,
        game.player.y
    );
}

function playerInEnemyRoom(enemy) {
    const currentRoom = getCurrentRoom();
    return (
        currentRoom && enemy.room === currentRoom
    );
}

function getView() {
    const p = game.player;
    const scale = 1;
    return {
        scale,
        offsetX: canvas.width / 2 - p.x * scale, //The coordinates which will center the player in the middle of the canvas
        offsetY: canvas.height / 2 - p.y * scale
    }; // returns an object v = { scale: 1, offsetX: canvas.width / 2 - p.x * scale, offsetY: canvas.height / 2 - p.y * scale }
}

function canSeePlayer(enemy) {
    const p = game.player;
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const distance = Math.hypot(dx, dy);
    if (distance > enemy.detectionRange) {
        return false;
    }
    const angleToPlayer = Math.atan2(dy, dx); // Gives the angle you must rotate fromt the positive x-axis to the vector (x,y).
    // It always gives the shorter signed rotation.
    let angleDifference = angleToPlayer - enemy.facingAngle;
    angleDifference = Math.atan2( Math.sin(angleDifference),Math.cos(angleDifference)); //Converts the angle difference into the smallest possible angle b/w the two directions.
    return (
        Math.abs(angleDifference) < enemy.fov / 2 //The field of vision extends on both sides.
    );
}

buildRooms();
spawnEnemies();
loop();

window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
});
window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", e => { 
    const p = screenToWorld(e.clientX, e.clientY); //Take's the mouse's position relative to the screen.
    mouseWorldX = p.x;
    mouseWorldY = p.y;
});

canvas.addEventListener("click", () => {
    const p = game.player;
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    const angle = Math.atan2(mouseWorldY - cy, mouseWorldX - cx);
    game.bullets.push({
        x: cx,
        y: cy,
        radius: 5,
        speed: 10,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        bounces: 0
    });
});

document.getElementById("startBtn").addEventListener("click", () => {
    gameStarted = true;
    gamePaused = false;
    gameOver = false;
    gameStartTime = Date.now();
    totalPausedTime = 0;
    pauseStart = null;
    document.getElementById("startBtn").style.display = "none";
    document.getElementById("restartBtn").style.display = "block";
});

document.getElementById("pauseBtn").addEventListener("click", () => {
    console.log("PAUSE CLICKED");
    console.log(gameStarted, gamePaused, gameOver);
    if (!gamePaused && gameStarted && !gameOver) {
        gamePaused = true;
        pauseStart = Date.now();
        console.log("GAME PAUSED");
    }
});

document.getElementById("resumeBtn").addEventListener("click", () => {
    if (gamePaused && pauseStart !== null) {
        totalPausedTime += Date.now() - pauseStart;
        pauseStart = null;
        gamePaused = false;
    }
});

document.getElementById("timeBtn").addEventListener("click", () => {
    if (game.player.currency >= 30) {
        game.player.currency -= 30;
        bonusTime += 15;
    }
});

document.getElementById("rulebookBtn").addEventListener("click", () => {
    rulebookpage.style.display = "flex";
});

closeRulebook.addEventListener("click", () => {
    rulebookpage.style.display = "none";
});

document.getElementById("exitBtn").addEventListener("click", () => {
    exitGame();
});

document.getElementById("restartBtn").addEventListener("click", () => {
        restartGame();
});


 