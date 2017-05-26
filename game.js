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
    game.load.image('background', 'assets/backs/sky.png');
    //https://opengameart.org/content/husky-sprites
    game.load.spritesheet('dog', 'assets/sprites/dog_75.png', .75*90, .75*59);
    //https://opengameart.org/content/cat-sprites
    game.load.spritesheet('cat', 'assets/sprites/cat/cat.png', 40, 30);
}

var dog, cat;
var map;
var cursors, letterKeys;
var yAxis = p2.vec2.fromValues(0, 1);

function resetPlayers() {
    dog.x = settings.START.X-50;
    cat.x = settings.START.X+50;
    dog.y = settings.START.Y;
    cat.y = settings.START.Y;
    playerCenter.position = Phaser.Point.centroid([dog.position, cat.position])
}

function create() {
    // Load the background
    bg = game.add.tileSprite(0, 0, settings.GAME.WIDTH, settings.GAME.HEIGHT, 'background');
    
    backmap = game.add.tilemap('backtiles', 32, 32);
    backmap.addTilesetImage('tiles');
    var groundLayerBack = backmap.createLayer(0);
    groundLayerBack.resizeWorld();
    
    spikeMap = game.add.tilemap('spikes', 32, 32);
    spikeMap.addTilesetImage('tiles');
    var groundLayerSpike = spikeMap.createLayer(0);
    groundLayerSpike.resizeWorld();
    
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
    dog.animations.add('run', [12, 13, 14, 15, 16], 10, true);
    dog.animations.add('jump', [16], 10, true);
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
    
    dog.body.fixedRotation = true;
    dog.body.damping = 0.5;
    cat.body.fixedRotation = true;
    cat.body.damping = 0.5;

    var dogMaterial = game.physics.p2.createMaterial('dogMaterial', dog.body);
    var catMaterial = game.physics.p2.createMaterial('catMaterial', cat.body);
    var worldMaterial = game.physics.p2.createMaterial('worldMaterial');
    var boxMaterial = game.physics.p2.createMaterial('worldMaterial');

    //  4 trues = the 4 faces of the world in left, right, top, bottom order
    game.physics.p2.setWorldMaterial(worldMaterial, true, true, true, true);

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

    //  Here is the contact material. It's a combination of 2 materials, so whenever shapes with
    //  those 2 materials collide it uses the following settings.

    var groundDogCM = game.physics.p2.createContactMaterial(dogMaterial, worldMaterial, { friction: 0.0 });
    var groundCatCM = game.physics.p2.createContactMaterial(catMaterial, worldMaterial, { friction: 0.0 });
    var groundBoxesCM = game.physics.p2.createContactMaterial(worldMaterial, boxMaterial, { friction: 0.6 });
    
    game.physics.p2.convertTilemap(map, groundLayer);
    
    game.physics.p2.setBoundsToWorld(true, true, true, true, false);

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
}

function update() {
    
    playerCenter.position = Phaser.Point.centroid([dog.position, cat.position])
    handlePlayerMovement(dog, cursors.left, cursors.right, cursors.up);
    handlePlayerMovement(cat, letterKeys.left, letterKeys.right, letterKeys.up);
}

function render() {
    game.debug.cameraInfo(game.camera, 32, 32);
    game.debug.spriteCoords(dog, 32, 500);
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

