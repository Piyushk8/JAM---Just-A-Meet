// GameContainer.tsx
import { useEffect } from 'react';
import Phaser from 'phaser';
import GameScene from './GameScene';

export default function GameContainer() {
  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'phaser-container',
      width: 1280,
      height: 720,
      pixelArt: true,
      physics: { default: 'arcade', arcade: { debug: true } },
      scene: [GameScene],
    };
    const game = new Phaser.Game(config);
    return () => game.destroy(true);
  }, []);

  return <div id="phaser-container" style={{ width: '100%', height: '100%' }} />;
}
