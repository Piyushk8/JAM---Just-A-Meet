import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { Socket } from 'socket.io-client';

interface User {
  id: string;
  username: string;
  x: number;
  y: number;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
}

interface PhaserRoomProps {
  socket: Socket | null;
  currentUser: User | null;
  users: Map<string, User>;
  nearbyUsers: User[];
  onUserMove: (x: number, y: number) => void;
}

class GameScene extends Phaser.Scene {
  private socket: Socket | null = null;
  private currentUser: User | null = null;
  private users: Map<string, User> = new Map();
  private nearbyUsers: User[] = [];
  private onUserMove: (x: number, y: number) => void = () => {};
  
  // Game objects
  private avatars: Map<string, Phaser.GameObjects.Container> = new Map();
  private currentUserAvatar: Phaser.GameObjects.Container | null = null;
  private proximityCircles: Phaser.GameObjects.Graphics[] = [];
  private background: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: any) {
    this.socket = data.socket;
    this.currentUser = data.currentUser;
    this.users = data.users;
    this.nearbyUsers = data.nearbyUsers;
    this.onUserMove = data.onUserMove;
  }

  preload() {
    // Create simple colored rectangles as avatars since we can't load external images
    this.load.image('avatar-current', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    this.load.image('avatar-other', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  }

  create() {
    // Create gradient background
    this.createBackground();
    
    // Enable pointer events
    this.input.on('pointerdown', this.handleClick, this);
    
    // Create current user avatar
    if (this.currentUser) {
      this.createCurrentUserAvatar();
    }
    
    // Create other user avatars
    this.updateOtherUsers();
    
    // Create proximity circles
    this.updateProximityCircles();
  }

  private createBackground() {
    this.background = this.add.graphics();
    
    // Create gradient effect with multiple colored rectangles
    const colors = [0x667eea, 0x764ba2];
    const width = 1200;
    const height = 800;
    
    for (let i = 0; i < height; i += 20) {
      const alpha = 1 - (i / height) * 0.3;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(colors[0]),
        Phaser.Display.Color.ValueToColor(colors[1]),
        100,
        i / height * 100
      );
      
      this.background.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), alpha);
      this.background.fillRect(0, i, width, 20);
    }
  }

  private createCurrentUserAvatar() {
    if (!this.currentUser) return;

    // Create container for avatar
    const container = this.add.container(this.currentUser.x + 30, this.currentUser.y + 30);
    
    // Avatar body (circle)
    const avatarBody = this.add.circle(0, 0, 30, 0xFF6B6B);
    avatarBody.setStrokeStyle(4, 0xFFFFFF);
    
    // Avatar emoji
    const avatarEmoji = this.add.text(0, -5, '👤', {
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Username
    const usernameText = this.add.text(0, 45, `${this.currentUser.username} (You)`, {
      fontSize: '12px',
      color: '#FFFFFF',
      backgroundColor: 'rgba(255,107,107,0.9)',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);
    
    // Add pulsing animation
    this.tweens.add({
      targets: avatarBody,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    container.add([avatarBody, avatarEmoji, usernameText]);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, 35), Phaser.Geom.Circle.Contains);
    
    // Make draggable
    this.input.setDraggable(container);
    container.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.x = dragX;
      container.y = dragY;
      this.onUserMove(dragX - 30, dragY - 30);
      this.updateProximityCircles();
    });
    
    this.currentUserAvatar = container;
  }

  private createOtherUserAvatar(user: User): Phaser.GameObjects.Container {
    const container = this.add.container(user.x + 30, user.y + 30);
    
    // Check if user is nearby
    const isNearby = this.nearbyUsers.some(nearby => nearby.id === user.id);
    const avatarColor = isNearby ? 0x4CAF50 : 0x2196F3;
    
    // Avatar body
    const avatarBody = this.add.circle(0, 0, 30, avatarColor);
    avatarBody.setStrokeStyle(3, 0xFFFFFF);
    
    // Avatar emoji
    const avatarEmoji = this.add.text(0, -5, '👥', {
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Username
    const usernameText = this.add.text(0, 45, user.username, {
      fontSize: '12px',
      color: '#FFFFFF',
      backgroundColor: isNearby ? 'rgba(76,175,80,0.9)' : 'rgba(33,150,243,0.9)',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);
    
    // Media indicators
    const indicators: Phaser.GameObjects.Text[] = [];
    if (user.isAudioEnabled) {
      const audioIcon = this.add.text(25, -25, '🎤', {
        fontSize: '16px',
        backgroundColor: 'rgba(76,175,80,0.8)',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);
      indicators.push(audioIcon);
    }
    
    if (user.isVideoEnabled) {
      const videoIcon = this.add.text(-25, -25, '📹', {
        fontSize: '16px',
        backgroundColor: 'rgba(33,150,243,0.8)',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);
      indicators.push(videoIcon);
    }
    
    // Proximity indicator
    if (isNearby) {
      const proximityIcon = this.add.text(35, -35, '🟢', {
        fontSize: '12px'
      }).setOrigin(0.5);
      
      // Pulsing animation for nearby users
      this.tweens.add({
        targets: proximityIcon,
        alpha: 0.5,
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
      
      indicators.push(proximityIcon);
    }
    
    container.add([avatarBody, avatarEmoji, usernameText, ...indicators]);
    return container;
  }

  private updateOtherUsers() {
    // Remove old avatars
    this.avatars.forEach(avatar => avatar.destroy());
    this.avatars.clear();
    
    // Create new avatars
    Array.from(this.users.values()).forEach(user => {
      const avatar = this.createOtherUserAvatar(user);
      this.avatars.set(user.id, avatar);
    });
  }

  private updateProximityCircles() {
    if (!this.currentUser || !this.currentUserAvatar) return;
    
    // Clear existing circles
    this.proximityCircles.forEach(circle => circle.destroy());
    this.proximityCircles = [];
    
    const x = this.currentUserAvatar.x;
    const y = this.currentUserAvatar.y;
    
    // Chat range circle (outer)
    const chatCircle = this.add.graphics();
    chatCircle.lineStyle(2, 0x4CAF50, 0.3);
    chatCircle.strokeCircle(x, y, 200);
    chatCircle.setDepth(-1);
    this.proximityCircles.push(chatCircle);
    
    // Connection range circle (inner)
    const connectionCircle = this.add.graphics();
    connectionCircle.lineStyle(2, 0xFF6B6B, 0.4);
    connectionCircle.strokeCircle(x, y, 150);
    connectionCircle.setDepth(-1);
    this.proximityCircles.push(connectionCircle);
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    if (!this.currentUser || !this.currentUserAvatar) return;
    
    // Move current user avatar to clicked position
    const newX = pointer.x;
    const newY = pointer.y;
    
    this.tweens.add({
      targets: this.currentUserAvatar,
      x: newX,
      y: newY,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.onUserMove(newX - 30, newY - 30);
        this.updateProximityCircles();
      }
    });
  }

  // Public methods to update from React
  updateUsers(users: Map<string, User>, nearbyUsers: User[]) {
    this.users = users;
    this.nearbyUsers = nearbyUsers;
    this.updateOtherUsers();
  }

  updateCurrentUser(user: User) {
    this.currentUser = user;
    if (this.currentUserAvatar) {
      this.currentUserAvatar.setPosition(user.x + 30, user.y + 30);
      this.updateProximityCircles();
    }
  }

  moveOtherUser(userId: string, x: number, y: number) {
    const avatar = this.avatars.get(userId);
    if (avatar) {
      this.tweens.add({
        targets: avatar,
        x: x + 30,
        y: y + 30,
        duration: 200,
        ease: 'Power1'
      });
    }
  }
}

const PhaserRoom: React.FC<PhaserRoomProps> = ({
  socket,
  currentUser,
  users,
  nearbyUsers,
  onUserMove
}) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<GameScene | null>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1200,
      height: 800,
      parent: gameRef.current,
      backgroundColor: '#667eea',
      scene: GameScene,
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    phaserGameRef.current = new Phaser.Game(config);
    
    phaserGameRef.current.scene.start('GameScene', {
      socket,
      currentUser,
      users,
      nearbyUsers,
      onUserMove
    });

    sceneRef.current = phaserGameRef.current.scene.getScene('GameScene') as GameScene;

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  // Update scene when data changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateUsers(users, nearbyUsers);
    }
  }, [users, nearbyUsers]);

  useEffect(() => {
    if (sceneRef.current && currentUser) {
      sceneRef.current.updateCurrentUser(currentUser);
    }
  }, [currentUser]);

  return (
    <div 
      ref={gameRef} 
      className="phaser-room"
      style={{
        width: '1200px',
        height: '800px',
        border: '3px solid white',
        borderRadius: '15px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}
    />
  );
};

export default PhaserRoom;