var settings = {
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 400
    },
    GAME: {
        WIDTH: 2284,
        HEIGHT: 1224
    },
    START: {
        X: 4*32,
        Y: 4*32
    }
}
var game = new Phaser.Game(settings.CANVAS.WIDTH, 
                           settings.CANVAS.HEIGHT, 
                           Phaser.CANVAS, 
                           'main-game-canvas', 
                           { 
                                preload: preload, 
                                create: create, 
                                update: update,
                                render: render
                           }
);

function preload() {
    game.load.image('tiles', 'assets/tilemaps/tiles/Tiles_32x32.png');
    game.load.tilemap('tilemap', 'assets/tilemaps/maps/lvl1_Foreground.csv', null, Phaser.Tilemap.CSV);
    game.load.tilemap('backtiles', 'assets/tilemaps/maps/lvl1_Background.csv', null, Phaser.Tilemap.CSV);
    game.load.tilemap('spikes', 'assets/tilemaps/maps/lvl1_Spikes.csv', null, Phaser.Tilemap.CSV);
    game.load.image('block', 'assets/sprites/block.png');
    game.load.spritesheet('heart', 'assets/sprites/heart-32.png', 32, 32);
    game.load.image('background', 'assets/backs/sky.png');
    //https://opengameart.org/content/husky-sprites
    game.load.spritesheet('dog', 'assets/sprites/dog_notail.png', 44, 37);
    //https://opengameart.org/content/cat-sprites
    game.load.spritesheet('cat', 'assets/sprites/cat/cat.png', 40, 30);
    
    game.load.audio('longest_time', ['assets/music/longest_time.mp3', 'assets/music/longest_time.ogg']);
}

var dog, cat;
var catReady = false, dogReady = false;
var map;
var cursors, letterKeys;
var yAxis = p2.vec2.fromValues(0, 1);

function resetPlayers() {
    dog.reset(settings.START.X-50, settings.START.Y);
    cat.reset(settings.START.X+50, settings.START.Y);
    playerCenter.position = Phaser.Point.centroid([dog.position, cat.position])
}

function create() {
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.scale.refresh();

    // Load the background
    bg = game.add.tileSprite(0, 0, settings.GAME.WIDTH, settings.GAME.HEIGHT, 'background');
    
    // Play soundtrack
    music = game.add.audio('longest_time');
    music.play();
    
    // Introductory text
    var style = { font: "44px Arial", fill: "#000000", align: "left" };
    text = game.add.text(32, 90, "decoding", style);
    //text.anchor.set(0.5);
    text.text = "Cursors keys control the dog.\nA-W-D control the cat.\nReach the heart!"
    
    // Tilemaps
    backmap = game.add.tilemap('backtiles', 32, 32);
    backmap.addTilesetImage('tiles');
    var groundLayerBack = backmap.createLayer(0);
    groundLayerBack.resizeWorld();
    
    spikeMap = game.add.tilemap('spikes', 32, 32);
    spikeMap.addTilesetImage('tiles');
    var groundLayerSpike = spikeMap.createLayer(0);
    groundLayerSpike.resizeWorld();
    spikeMap.setCollisionBetween(0, 100);
    
    map = game.add.tilemap('tilemap', 32, 32);
    map.addTilesetImage('tiles');
    
    var groundLayer = map.createLayer(0);
    groundLayer.resizeWorld();
    
    map.setCollisionBetween(0, 100);
    
    // World boundaries
    game.world.setBounds(0, 0, settings.GAME.WIDTH, settings.GAME.HEIGHT);

    //  Enable p2 physics
    game.physics.startSystem(Phaser.Physics.P2JS);

    game.physics.p2.gravity.y = 350;
    game.physics.p2.world.defaultContactMaterial.friction = 0.3;
    game.physics.p2.world.setGlobalStiffness(1e5);

    //  Add a sprite
    dog = game.add.sprite(settings.START.X-50, settings.START.Y, 'dog');
    dog.animations.add('run', [4, 5, 6, 7, 8], 10, true);
    dog.animations.add('jump', [8], 10, true);
    dog.animations.add('idle', [0, 1, 2, 3], 1, true);
    dog.anchor.setTo(.5, .5);
    
    cat = game.add.sprite(settings.START.X+50, settings.START.Y, 'cat');
    cat.animations.add('run', [2,3,4,5,6,7], 10, true);
    cat.animations.add('jump', [2], 10, true);
    cat.animations.add('idle', [0, 1], 1, true);
    cat.anchor.setTo(.5, .5);
    
    dog.facing = 'idle';
    cat.facing = 'idle';
    dog.jumpTimer = 0;
    cat.jumpTimer = 0;
    
    playerCenter = game.add.sprite(settings.START.X, settings.START.Y);
    playerCenter.anchor.setTo(.5, .5);
    
    players = game.add.group();
    players.add(dog);
    players.add(cat);
    players.add(playerCenter);

    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(dog);
    game.physics.p2.enable(cat);
    
    dog.scale.x = -1;
    cat.scale.x = -1;
    
    dog.body.fixedRotation = true;
    dog.body.damping = 0.5;
    cat.body.fixedRotation = true;
    cat.body.damping = 0.5;
    
    //  A stack of boxes - you'll stick to these
    var boxes = [
        // First box puzzle
        game.add.sprite(600, 200, 'block'),
        // Second box puzzle
        game.add.sprite(3*32, 29*32, 'block'),
    ];
    boxes.forEach(function(box) {
        game.physics.p2.enable(box);
        box.body.mass = 6;
        // box.body.static = true;
        box.body.setMaterial(boxMaterial);
    });
    
    var heart = game.add.sprite(68*32+16, 4*32, 'heart');
    heart.animations.add('idle', [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23], 10, true);
    heart.animations.play('idle');
    game.physics.p2.enable(heart)
    heart.body.mass = 10;
    heart.body.fixedRotation = true;
    heart.body.isHeart = true;
    heart.tint = 0x8888FF;
    //heart.body.damping = 0;
    
    //  4 trues = the 4 faces of the world in left, right, top, bottom order
    game.physics.p2.setWorldMaterial(worldMaterial, true, true, true, true);

    var dogMaterial = game.physics.p2.createMaterial('dogMaterial', dog.body);
    var catMaterial = game.physics.p2.createMaterial('catMaterial', cat.body);
    var heartMaterial = game.physics.p2.createMaterial('heartMaterial', heart.body);
    var worldMaterial = game.physics.p2.createMaterial('worldMaterial');
    var boxMaterial = game.physics.p2.createMaterial('worldMaterial');


    //  Here is the contact material. It's a combination of 2 materials, so whenever shapes with
    //  those 2 materials collide it uses the following settings.

    var groundDogCM = game.physics.p2.createContactMaterial(dogMaterial, worldMaterial, { friction: 0.0 });
    var groundCatCM = game.physics.p2.createContactMaterial(catMaterial, worldMaterial, { friction: 0.0 });
    var groundBoxesCM = game.physics.p2.createContactMaterial(worldMaterial, boxMaterial, { friction: 0.6 });
    var heartCM = game.physics.p2.createContactMaterial(worldMaterial, heartMaterial);
    heartCM.friction = 0.0;     // Friction to use in the contact of these two materials.
    heartCM.restitution = 1.0;  // Restitution (i.e. how bouncy it is!) to use in the contact of these two materials.
    heartCM.stiffness = 1e7;    // Stiffness of the resulting ContactEquation that this ContactMaterial generate.
    heartCM.relaxation = 3;     // Relaxation of the resulting ContactEquation that this ContactMaterial generate.
    heartCM.frictionStiffness = 1e7;    // Stiffness of the resulting FrictionEquation that this ContactMaterial generate.
    heartCM.frictionRelaxation = 3;     // Relaxation of the resulting FrictionEquation that this ContactMaterial generate.
    heartCM.surfaceVelocity = 0;
    
    var normalTiles = game.physics.p2.convertTilemap(map, groundLayer);
    var spikes = game.physics.p2.convertTilemap(spikeMap, groundLayerSpike);
    
    game.physics.p2.setBoundsToWorld(true, true, true, true, false);
    
    spikes.forEach(function(spike) {
        spike.isSpike = true;
    });
    
    cat.body.onBeginContact.add(function(body, bodyB, shapeA, shapeB, equation) {
        if (body !== null) {
            if (body.isSpike) {
                resetPlayers();
            } else if (body.isHeart) {
                catReady = true;
                heart.tint = 0xFFFFFF;
            }
        }
    }, this);
    dog.body.onBeginContact.add(function(body, bodyB, shapeA, shapeB, equation) {
        if (body !== null) {
            if (body.isSpike) {
                resetPlayers();
            } else if (body.isHeart) {
                dogReady = true;
                heart.tint = 0xFFFFFF;
            }
        }
    }, this);

    cursors = game.input.keyboard.createCursorKeys();
    letterKeys = {
        left: game.input.keyboard.addKey(Phaser.Keyboard.A),
        right: game.input.keyboard.addKey(Phaser.Keyboard.D),
        up: game.input.keyboard.addKey(Phaser.Keyboard.W)
    };
    
    game.camera.follow(playerCenter);
}

function handlePlayerMovement(player, left, right, up) {
    if (left.isDown) {
        player.body.moveLeft(200);
        if (player.facing != 'left') {
            player.animations.play('run');
            player.scale.x = 1;
            player.facing = 'left';
        }
    } else if (right.isDown) {
        player.body.moveRight(200);
        
        if (player.facing != 'right') {
            player.animations.play('run');
            player.scale.x = -1;
            player.facing = 'right';
        }
    } else {
        player.body.velocity.x = 0;

        if (player.facing != 'idle') {
            player.animations.play('idle');
            player.facing = 'idle';
        }
    }
    
    if (checkIfCanJump(player)) {
        if (up.isDown && game.time.now > player.jumpTimer) {
            player.body.moveUp(300);
            player.animations.play('jump');
            player.jumpTimer = game.time.now + 750;
        }
    }
    
    /*dog.body.collides(spikeMap, function(e) {
        console.log(e);
    });*/
}

function update() {
    playerCenter.position = Phaser.Point.centroid([dog.position, cat.position])
    handlePlayerMovement(dog, cursors.left, cursors.right, cursors.up);
    handlePlayerMovement(cat, letterKeys.left, letterKeys.right, letterKeys.up);
    
    if (catReady && dogReady) {
        window.location.href = 'victory.html';
    }
}

function render() {
    /*game.debug.cameraInfo(game.camera, 32, 32);
    game.debug.spriteCoords(dog, 32, 500);*/
}

function checkIfCanJump(player) {

    var result = false;

    for (var i=0; i < game.physics.p2.world.narrowphase.contactEquations.length; i++) {
        var c = game.physics.p2.world.narrowphase.contactEquations[i];

        if (c.bodyA === player.body.data || c.bodyB === player.body.data) {
            var d = p2.vec2.dot(c.normalA, yAxis);

            if (c.bodyA === player.body.data) {
                d *= -1;
            }

            if (d > 0.5) {
                result = true;
            }
        }
    }
    
    return result;

}

