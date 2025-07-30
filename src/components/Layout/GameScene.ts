import Phaser from "phaser";
import type { BackgroundMode } from "./Background";

export default class GameScene extends Phaser.Scene {
  private me!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private preloadComplete = false;
  // network!: Network

  constructor() {
    super("Game");
  }

  preload() {
    this.load.atlas(
      "cloud_day",
      "assets/background/cloud_day.png",
      "assets/background/cloud_day.json"
    );
    this.load.image("backdrop_day", "assets/background/backdrop_day.png");
    this.load.atlas(
      "cloud_night",
      "assets/background/cloud_night.png",
      "assets/background/cloud_night.json"
    );
    this.load.image("backdrop_night", "assets/background/backdrop_night.png");
    this.load.image("sun_moon", "assets/background/sun_moon.png");

    this.load.tilemapTiledJSON("tilemap", "assets/map/map.json");
    this.load.spritesheet("tiles_wall", "assets/map/FloorAndGround.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("chairs", "assets/items/chair.png", {
      frameWidth: 32,
      frameHeight: 64,
    });
    this.load.spritesheet("computers", "assets/items/computer.png", {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet("whiteboards", "assets/items/whiteboard.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet(
      "vendingmachines",
      "assets/items/vendingmachine.png",
      {
        frameWidth: 48,
        frameHeight: 72,
      }
    );
    this.load.spritesheet(
      "office",
      "assets/tileset/Modern_Office_Black_Shadow.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet("basement", "assets/tileset/Basement.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("generic", "assets/tileset/Generic.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("adam", "assets/character/adam.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet("ash", "assets/character/ash.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet("lucy", "assets/character/lucy.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet("nancy", "assets/character/nancy.png", {
      frameWidth: 32,
      frameHeight: 48,
    });

    this.load.on("complete", () => {
      this.preloadComplete = true;
      this.launchBackground(0);
    });
  }
  
  private launchBackground(backgroundMode: BackgroundMode) {
    // Launch background scene - remove the check as it might not exist yet
    try {
      this.scene.launch("background", { backgroundMode });
    } catch (error) {
      console.warn("Background scene not found, continuing without background");
    }
  }

  create() {
    console.log("created", this.make.tilemap());
    // --- Tilemap ---
    const map = this.make.tilemap({ key: "tilemap" }); // Changed from "office-map" to "tilemap"

    // These names MUST match the `name` property inside Tiled's JSON tilesets.
    // Using the exact tileset names from your map file
    const ts1 = map.addTilesetImage("FloorAndGround", "tiles_wall");
    const ts2 = map.addTilesetImage("chair", "chairs");
    const ts3 = map.addTilesetImage("Modern_Office_Black_Shadow", "office");
    const ts4 = map.addTilesetImage("Generic", "generic");
    const ts5 = map.addTilesetImage("computer", "computers");
    const ts6 = map.addTilesetImage("whiteboard", "whiteboards");
    const ts7 = map.addTilesetImage("Basement", "basement");
    const ts8 = map.addTilesetImage("vendingmachine", "vendingmachines");

    const tilesets = [ts1, ts2, ts3, ts4, ts5, ts6, ts7, ts8].filter(Boolean) as Phaser.Tilemaps.Tileset[];

    // Create layers (using the actual layer name from your map)
    const ground = map.createLayer("Ground", tilesets, 0, 0);
    // Since your map only has one layer "Ground", we'll use it for all references
    const deco = null; // No decorations layer exists
    const walls = null; // No walls layer exists - you might need to set collision on the Ground layer instead

    // Enable collision on the ground layer if it has collision properties
    // Be more selective about collision - only set collision on specific tiles
    ground?.setCollisionByProperty({ collides: true });
    // Alternative: Set collision by tile index if you know which tiles should block
    // ground?.setCollisionBetween(1, 100); // Adjust range as needed

    // --- Player ---
    // Using "adam" instead of "player" since that's what you loaded
    this.me = this.physics.add.sprite(400, 300, "adam", 0);
    this.me.setCollideWorldBounds(true);

    // Collisions with ground layer (since there's no separate walls layer)
    if (ground) this.physics.add.collider(this.me, ground);

    // --- Add Interactive Objects Based on Tilemap Object Layers ---
    // SkyOffice uses object layers in Tiled to place interactive items
    // Check for object layers in the tilemap
    const objects = map.getObjectLayer('items'); // or whatever your object layer is named
    
    if (objects) {
      objects.objects.forEach((obj: any) => {
        const { x, y, width, height, name, type } = obj;
        
        let sprite: Phaser.Physics.Arcade.Sprite | null = null;
        
        switch (type || name) {
          case 'chair':
            sprite = this.physics.add.staticSprite(x, y - height, 'chairs', 0);
            break;
          case 'computer':
            sprite = this.physics.add.staticSprite(x, y - height, 'computers', 0);
            break;
          case 'whiteboard':
            sprite = this.physics.add.staticSprite(x, y - height, 'whiteboards', 0);
            break;
          case 'vendingmachine':
            sprite = this.physics.add.staticSprite(x, y - height, 'vendingmachines', 0);
            break;
        }
        
        if (sprite) {
          sprite.setOrigin(0, 0);
          this.physics.add.collider(this.me, sprite);
        }
      });
    } else {
      // Fallback: Manual positioning if no object layer exists
      console.log("No object layer found, using manual positioning");
      
      // Add some items manually - but position them based on your tilemap size
      const tileWidth = map.tileWidth;
      const tileHeight = map.tileHeight;
      
      // Position items relative to tile grid
      const chair1 = this.physics.add.staticSprite(tileWidth * 3, tileHeight * 4, "chairs", 0);
      const chair2 = this.physics.add.staticSprite(tileWidth * 6, tileHeight * 4, "chairs", 1);
      const computer1 = this.physics.add.staticSprite(tileWidth * 4, tileHeight * 2, "computers", 0);
      const whiteboard1 = this.physics.add.staticSprite(tileWidth * 2, tileHeight * 1, "whiteboards", 0);
      const vendingMachine = this.physics.add.staticSprite(tileWidth * 8, tileHeight * 6, "vendingmachines", 0);

      // Set proper origins and collisions
      [chair1, chair2, computer1, whiteboard1, vendingMachine].forEach(sprite => {
        sprite.setOrigin(0, 1); // Bottom-left origin for proper positioning
        this.physics.add.collider(this.me, sprite);
      });
    }

    // Camera follows player
    this.cameras.main.startFollow(this.me, true);
    
    // Set camera and world bounds based on actual tilemap size
    const mapWidth = map.widthInPixels;
    const mapHeight = map.heightInPixels;
    
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    
    // Remove world bounds collision for player to allow room-to-room movement
    this.me.setCollideWorldBounds(false);

    // Cursor keys
    this.cursors = this.input.keyboard!.createCursorKeys();

    // --- Animations ---
    this.anims.create({
      key: "walk",
      frames: this.anims.generateFrameNumbers("adam", { start: 0, end: 3 }), // Changed from "player" to "adam"
      frameRate: 8,
      repeat: -1,
    });
  }

  update() {
    if (!this.me || !this.cursors) return;

    const speed = 160;
    const vx = (this.cursors.left?.isDown ? -1 : 0) + (this.cursors.right?.isDown ? 1 : 0);
    const vy = (this.cursors.up?.isDown ? -1 : 0) + (this.cursors.down?.isDown ? 1 : 0);

    this.me.setVelocity(vx * speed, vy * speed);

    // Handle animations and sprite flipping
    if (vx !== 0 || vy !== 0) {
      this.me.anims.play('walk', true);
      // Flip sprite based on direction
      if (vx < 0) {
        this.me.setFlipX(true);
      } else if (vx > 0) {
        this.me.setFlipX(false);
      }
    } else {
      this.me.anims.stop();
      this.me.setFrame(0); // Set to idle frame
    }
  }
}