var config = {
    width: 800,
    height: 600,
    type: Phaser.AUTO,
    parent: 'phaser-example'
};

var gameTime; // Current game time
var totalDistancedMovedNormalized; // Total distance the bus has moved along the path (normalized 0 to 1)
var lastBusPosition; // Current position of the bus
var lastBusPositionNorm; // Normalized last bus position along path
var isBusStopped = true;
var lastBusWasStopped = true;

var graphics; // Graphics settings
var tweenFollower; // Progress of tween to move bus
var path; // Path that the bus will follow (route)

// Stops
var stopDistancesNormalized = []; // Stops along the paths (normalized to path length)
var passengersAtStops = []; // Passengers at each stop
var closestStop = -1;

// Game state stuff
var levelStatusTextLeft;
var levelStatusTextRight;
var totalPassengersPickedUp = 0; // Total number of passengers picked up
var movesRemaining = 14; // Total number of remaining moves before losing
var numberOfPassengersToWin = 100; // Number of passengers that must be picked up to beat the level
var isGameOver = false; // Have the game over conditions been met yet (either win or lose)

// Number of stars in users account
var numberOfStars = 1000;
var starsText;

// Controls
var goButton; // Makes the bus go
var buyMovesButton; // Buy additional moves with stars

// Go Indicator
var throttleBar; // Bar that increase to indicate how far you will go
var throttleBarStartingY = 515; // Default location of throttle bar
var isGoClicked = false; // Is the go button currently clicked
var maxGoDuration = 1200; // Max time you can hold go before it stops increasing

// Debugging/Dev Displays
var mouseInfoText;
var mouseDownDuration;
var isAtStop = false;
var confirmResult = false;

var busImage; // The bus image

var gameScene = new Phaser.Scene("gameScene");
var titleScene = new Phaser.Scene("titleScene");

// Depths
var mapDepth = -3;
var pathDepth = -2;
var stopDepth = -1;
var gameStatusBgDepth = 1;
var gameStatusTextDepth = 2;

var game = new Phaser.Game(config);

// Add both scenes (it does not start them)
game.scene.add("titleScene", titleScene);
game.scene.add("gameScene", gameScene);

// Start the title scene
game.scene.start("titleScene");

gameScene.preload = function () {
    // Bus image
    this.load.image('bus', 'assets/bus.png');
    this.load.image('map', 'assets/bg3.png');
    this.load.image('bus-stop', 'assets/bus-stop.png');
    this.load.image('gas-pedal', 'assets/gas-pedal.png');

    // -----------------------------------
    // Progress Bar
    var progressBar = this.add.graphics();
    var progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(240, 270, 320, 50);

    var width = this.cameras.main.width;
    var height = this.cameras.main.height;
    var loadingText = this.make.text({
        x: width / 2,
        y: height / 2 - 50,
        text: 'Loading...',
        style: {
            font: '20px monospace',
            fill: '#ffffff'
        }
    });
    loadingText.setOrigin(0.5, 0.5);

    var percentText = this.make.text({
        x: width / 2,
        y: height / 2 - 5,
        text: '0%',
        style: {
            font: '18px monospace',
            fill: '#ffffff'
        }
    });
    percentText.setOrigin(0.5, 0.5);

    var assetText = this.make.text({
        x: width / 2,
        y: height / 2 + 50,
        text: '',
        style: {
            font: '18px monospace',
            fill: '#ffffff'
        }
    });

    assetText.setOrigin(0.5, 0.5);

    this.load.on('progress', function (value) {
        percentText.setText(parseInt(value * 100) + '%');
        progressBar.clear();
        progressBar.fillStyle(0xffffff, 1);
        progressBar.fillRect(250, 280, 300 * value, 30);
    });

    this.load.on('fileprogress', function (file) {
        assetText.setText('Loading Game: ' + file.key);
    });

    this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
        percentText.destroy();
        assetText.destroy();
    });
    // -----------------------------------

    // Logo image
    // this.load.image('logo', 'assets/Cubic_CTS_UMO.png');
    // for (var i = 0; i < 500; i++) {
    //     this.load.image('Awesome Gaming Experiences : ' + i, 'assets/Cubic_CTS_UMO.png');
    // }

    gameScene = this;
}

gameScene.create = function () {

    //var logo = this.add.image(650, 150, 'logo');

    this.input.mouse.disableContextMenu();
    graphics = this.add.graphics();

    // Background map
    var backgroundMap = this.add.image(0, 0, 'map').setOrigin(0, 0);
    backgroundMap.setDepth(mapDepth);
    this.cameras.main.setSize(800, 600);

    // Go button/throttle background
    goBackground = this.add.rectangle(760, 390, 55, 380, 0x06D9AB);
    goBackground.fixedToCamera = true;
    goBackground.setScrollFactor(0, 0);
    goBackground.setStrokeStyle(4, 0x111111);

    // Debugging/Dev stuff
    mouseInfoText = this.add.text(10, 10, '', { fill: '#00ff00' });
    mouseInfoText.fixedToCamera = true;
    mouseInfoText.setScrollFactor(0, 0);

    // Game status background
    gameStatusBg = this.add.rectangle(400, 0, 800, 120, 0x222222, 0.7);
    gameStatusBg.fixedToCamera = true;
    gameStatusBg.setStrokeStyle(4, 0x111111);
    gameStatusBg.setScrollFactor(0, 0);
    gameStatusBg.setDepth(gameStatusBgDepth);

    // Game status text
    levelStatusTextLeft = this.add.text(10, 10, '', { fontSize: '20px', fill: '#FFFFFF' });
    levelStatusTextLeft.fixedToCamera = true;
    levelStatusTextLeft.setScrollFactor(0, 0);
    levelStatusTextLeft.setDepth(gameStatusTextDepth);
    levelStatusTextRight = this.add.text(400, 10, '', { fontSize: '20px', fill: '#FFFFFF' });
    levelStatusTextRight.fixedToCamera = true;
    levelStatusTextRight.setScrollFactor(0, 0);
    levelStatusTextRight.setDepth(gameStatusTextDepth);

    // Level complete text - win/lose
    levelCompleteText = this.add.text(300, 150, '', { fontSize: '45px', fill: '#000000', stroke: '#AAAAAA', strokeThickness: 5 });
    levelCompleteText.fixedToCamera = true;
    levelCompleteText.setScrollFactor(0, 0);

    // Go Button background
    goBackground = this.add.rectangle(760, 550, 40, 40, 0x333333);
    goBackground.fixedToCamera = true;
    goBackground.setScrollFactor(0, 0);
    goBackground.setStrokeStyle(2, 0x111111);

    // Go button - moves the bus
    goButton = this.add.image(760, 550, 'gas-pedal');
    goButton.scaleX = 0.07;
    goButton.scaleY = 0.07;
    goButton.setInteractive();
    goButton.fixedToCamera = true;
    goButton.setScrollFactor(0, 0);

    goButton.on('pointerdown', function (pointer) { onGoButtonDown(pointer) });
    goButton.on('pointerup', function (pointer) { onGoButtonUp(pointer) });
    goButton.on('pointerout', function (pointer) { onGoButtonOut(pointer) });

    // Go Indicator/Throttle
    throttleBar = this.add.rectangle(758, throttleBarStartingY, 10, 0, 0xff6699);
    throttleBar.fixedToCamera = true;
    throttleBar.setScrollFactor(0, 0);
    throttleBar.setStrokeStyle(2, 0x111111);

    // Stars text background
    var starsTextBg = this.add.rectangle(10, 590, 650, 100, 0x222222, 0.7);
    starsTextBg.fixedToCamera = true;
    starsTextBg.setScrollFactor(0, 0);
    starsTextBg.setDepth(gameStatusBgDepth);
    starsTextBg.setStrokeStyle(4, 0x111111);

    // Buy moves button
    buyMovesButton = this.add.text(10, 570, 'Buy a move for 150 Stars!', { fontSize: '20px', fill: '#FFFFFF' });
    buyMovesButton.setInteractive();
    buyMovesButton.on('pointerup', buyMove);
    buyMovesButton.fixedToCamera = true;
    buyMovesButton.setScrollFactor(0, 0);
    buyMovesButton.setDepth(gameStatusTextDepth);

    // Text for stars
    starsText = this.add.text(10, 550, '', { fontSize: '20px', fill: '#FFFFFF' });
    starsText.fixedToCamera = true;
    starsText.setScrollFactor(0, 0);
    starsText.setDepth(gameStatusTextDepth);

    // Init total distance moved
    totalDistancedMovedNormalized = 0;
    lastBusPositionNorm = 0;

    // Init bus
    busImage = this.add.image(388, 355, 'bus');
    busImage.scaleX = 0.10;
    busImage.scaleY = 0.10;
    lastBusPosition = new Phaser.Math.Vector2(100, 300);

    this.cameras.main.startFollow(busImage, true, 0.08, 0.08);

    // Create path
    path = new Phaser.Curves.Path(388, 355);
    path.lineTo(660, 355);
    path.lineTo(660, 550);
    path.lineTo(858, 550);
    path.lineTo(858, 430);
    path.lineTo(595, 430);
    path.lineTo(595, 548);
    path.lineTo(504, 548);
    path.lineTo(504, 666);
    path.lineTo(660, 666);
    path.lineTo(660, 836);
    path.lineTo(986, 836);
    path.lineTo(986, 741);
    path.lineTo(1166, 741);
    path.lineTo(1166, 549);
    path.lineTo(1224, 549);
    path.lineTo(1224, 666);
    path.lineTo(859, 666);
    path.lineTo(859, 912);
    path.lineTo(1315, 912);

    // Create stops
    stopDistancesNormalized.push(0.1);
    stopDistancesNormalized.push(0.2);
    stopDistancesNormalized.push(0.3);
    stopDistancesNormalized.push(0.35);
    stopDistancesNormalized.push(0.42);
    stopDistancesNormalized.push(0.5);
    stopDistancesNormalized.push(0.6);
    stopDistancesNormalized.push(0.75);
    stopDistancesNormalized.push(0.84);
    stopDistancesNormalized.push(0.92);

    // Add passengers for stops
    // Random number at each stop
    // for (var curStop = 0; curStop < stopDistancesNormalized.length; curStop++) {
    //     var passengerText = this.add.text(10, 10, '', { fill: '#00ff00' });
    //     passengersAtStops.push({ numPassengers: getRandomInt(40), text: passengerText });
    // }
    // Manually set numbers
    passengersAtStops.push({ numPassengers: 10, text: this.add.text(10, 10, '', { fill: '#000000' }) });
    passengersAtStops.push({ numPassengers: 15, text: this.add.text(10, 10, '', { fill: '#000000' }) });
    passengersAtStops.push({ numPassengers: 40, text: this.add.text(10, 10, '', { fill: '#000000' }) });
    passengersAtStops.push({ numPassengers: 10, text: this.add.text(10, 10, '', { fill: '#000000' }) });
    passengersAtStops.push({ numPassengers: 15, text: this.add.text(10, 10, '', { fill: '#000000' }) });
    passengersAtStops.push({ numPassengers: 10, text: this.add.text(10, 10, '', { fill: '#000000' }) });
    passengersAtStops.push({ numPassengers: 30, text: this.add.text(10, 10, '', { fill: '#000000' }) });
    passengersAtStops.push({ numPassengers: 20, text: this.add.text(10, 10, '', { fill: '#000000' }) });
    passengersAtStops.push({ numPassengers: 20, text: this.add.text(10, 10, '', { fill: '#000000' }) });
    passengersAtStops.push({ numPassengers: 40, text: this.add.text(10, 10, '', { fill: '#000000' }) });

    // Track progress of the bus along the path from the tween
    tweenFollower = { t: 0, vec: new Phaser.Math.Vector2() };
}

gameScene.update = function (time, delta) {

    var pointer = this.input.activePointer;

    // Update the saved game time
    gameTime = time;

    // Clear graphics settings
    graphics.clear();

    // Draw the path
    graphics.lineStyle(3, 0x111111, 1);
    graphics.setDepth(pathDepth);
    path.draw(graphics);

    // Draw the stops and passengers
    graphics.fillStyle(0x00ff00, 1);
    for (var curStop = 0; curStop < stopDistancesNormalized.length; curStop++) {
        // Stops
        var pointOnPath = new Phaser.Math.Vector2();
        path.getPoint(stopDistancesNormalized[curStop], pointOnPath);
        //graphics.fillCircle(pointOnPath.x, pointOnPath.y, 10);

        var stop = this.add.image(pointOnPath.x, pointOnPath.y, 'bus-stop');
        stop.setDepth(stopDepth);
        stop.scaleX = 0.08;
        stop.scaleY = 0.08;

        // Passengers
        passengersAtStops[curStop].text.setX(pointOnPath.x + 10); // Offset a little from the path
        passengersAtStops[curStop].text.setY(pointOnPath.y + 10); // Offset a little from the path
        passengersAtStops[curStop].text.setText(passengersAtStops[curStop].numPassengers);
        passengersAtStops[curStop].text.setDepth(stopDepth);
    }

    // Check if bus is stopped
    if (lastBusPositionNorm == tweenFollower.t) {
        isBusStopped = true;
    } else {
        isBusStopped = false;
    }
    lastBusPositionNorm = tweenFollower.t;

    // Check if just stopped so that we can pick up passengers
    var closestDistNorm = 1.0;
    if (isBusStopped && !lastBusWasStopped) {
        // Find closest stop on route
        currentProgressNormalized = tweenFollower.t;
        for (var stop = 0; stop < stopDistancesNormalized.length; stop++) {
            var distanceToStop = Math.abs(stopDistancesNormalized[stop] - currentProgressNormalized);
            if (distanceToStop < closestDistNorm) {
                closestDistNorm = distanceToStop;
                closestStop = stop;
            }
        }

        // Check if stop is close enough to pick up passengers
        var lengthToStop = closestDistNorm * path.getLength();
        if (lengthToStop < 30) {
            isAtStop = true;
            // Pick up the passengers
            totalPassengersPickedUp += passengersAtStops[closestStop].numPassengers;
            passengersAtStops[closestStop].numPassengers = 0;
        } else {
            isAtStop = false;
        }

        // Check for win/lose
        if (totalPassengersPickedUp >= numberOfPassengersToWin) {
            levelCompleteText.setText('You Win!');
            isGameOver = true;
        } else if (movesRemaining == 0 && totalPassengersPickedUp < numberOfPassengersToWin) {
            levelCompleteText.setText('You Lose!');
            isGameOver = true;
        } else if (tweenFollower.t > 0.99) {
            levelCompleteText.setText('You Lose!');
            isGameOver = true;
        }

    }
    lastBusWasStopped = isBusStopped;

    // Update go button indicator
    // Make throttle indicator taller the longer the button is held
    // Height grows down, so have to adjust location as well
    if (isGoClicked) {
        var duration = (gameTime - pointer.downTime);
        // Max duration 3 sec
        if (duration > maxGoDuration) {
            duration = maxGoDuration;
        }
        var height = duration / 1000.0 * 250.0;
        throttleBar.setSize(15, height);
        throttleBar.setY(throttleBarStartingY - height);
    } else {
        throttleBar.setSize(15, 0);
        throttleBar.setY(throttleBarStartingY);
    }



    // Update level status info
    levelStatusTextLeft.setText([
        'Passengers Picked Up: ' + totalPassengersPickedUp,
        'Passengers To Win: ' + numberOfPassengersToWin
    ]);
    levelStatusTextRight.setText([
        'Moves Remaining: ' + movesRemaining
        //'Passengers Remaining: ' + (numberOfPassengersToWin - totalPassengersPickedUp)
    ]);

    // Update dev test stuff
    // mouseInfoText.setText([
    //     'x: ' + pointer.worldX,
    //     'y: ' + pointer.worldY,
    //     'isDown: ' + pointer.isDown,
    //     'Mouse held for: ' + mouseDownDuration,
    //     'DistanceMovedNorm: ' + totalDistancedMovedNormalized,
    //     'isBusStopped: ' + isBusStopped,
    //     'closestStop: ' + closestStop,
    //     'isAtStop: ' + isAtStop
    // ]);

    starsText.setText('Star Balance: ' + numberOfStars);

}

titleScene.preload = function () {
    this.load.image('background', 'assets/Cubic_CTS_UMO.png');
};

titleScene.create = function () {
    var bg = this.add.sprite(300, 200, 'background');
    bg.setOrigin(0, 0);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
        this.scene.switch('gameScene');
    }
    );

    var text = this.add.text(250, 400, 'Welcome to Bus Stop Hub Game!');
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
        this.scene.switch('gameScene');
    }
    );
};

function onGoButtonDown(pointer) {
    isGoClicked = true;
}

function onGoButtonUp(pointer) {
    if (pointer.leftButtonReleased()) {
        if (movesRemaining <= 0 && numberOfStars > 150) {
            confirmToMove()
        } else if (!isGameOver) {
            // Get time button was down (in ms)
            mouseDownDuration = gameTime - pointer.downTime;
            if (mouseDownDuration > maxGoDuration) {
                mouseDownDuration = maxGoDuration;
            }

            // Move the bus
            // Move more the longer mouse is held down - 500 units of distance per second held
            var distanceToMove = mouseDownDuration / 1000 * 450;
            // Normalize
            normalizedDistToMove = distanceToMove / path.getLength();

            // Add to total moved
            totalDistancedMovedNormalized += normalizedDistToMove;
            // Move the bus
            var tween = gameScene.tweens.add({
                targets: tweenFollower,
                t: totalDistancedMovedNormalized,
                ease: 'Sine.easeInOut',
                duration: 1200,
                yoyo: false,
                repeat: 0,
                onUpdate: onBusMove
            });

            // Decrease number of moves remaining
            movesRemaining--;
        } else {
            isGameOver = true;
        }
    }

    // Clear flag that button is clicked
    isGoClicked = false;
}

function onGoButtonOut(pointer) {
    isGoClicked = false;
}

function onBusMove(tween, target, param) {
    // Update bus position
    path.getPoint(tweenFollower.t, tweenFollower.vec);
    busImage.setX(tweenFollower.vec.x);
    busImage.setY(tweenFollower.vec.y);

    // Update bus rotation
    var movedVector = new Phaser.Math.Vector2();
    movedVector.x = tweenFollower.vec.x - lastBusPosition.x;
    movedVector.y = tweenFollower.vec.y - lastBusPosition.y;
    busImage.setRotation(movedVector.angle());
    lastBusPosition.x = tweenFollower.vec.x;
    lastBusPosition.y = tweenFollower.vec.y;
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function confirmToMove() {
    if (!confirmResult) {
        confirmResult = confirm("Please Buy Moves to continue!");
        if (!confirmResult) {
            levelCompleteText.setText('You Lose!');
            //showing Game Over.
            isGameOver = true;
            alert("Game Over!!!");
        }
    }

}

function buyMove(pointer) {
    if (pointer.leftButtonReleased()) {
        // Buy move with stars
        if (numberOfStars >= 150) {
            numberOfStars -= 150;
            movesRemaining += 1;
            isGameOver = false;
            levelCompleteText.setText('');
        } else {
            alert("Exausted all points!! Come back later!")
        }
        this.scene.update();
    }
}
