import { tileToChunk, getChunkKey, getTileKey, manhattanDistance } from "./coreDS";
import type {
  InteractablesMap,
  InteractableObject,
  SpatialChunk,
  Rectangle,
  InteractionState,
} from "./coreDS";

export interface InteractionEvent {
  type: 'available' | 'lost' | 'triggered';
  objectId: string;
  object?: InteractableObject;
  position?: { x: number; y: number };
}

export type InteractionEventHandler = (event: InteractionEvent) => void;

export class InteractionManager {
  private interactablesMap: InteractablesMap;
  private interactionState: InteractionState;
  private eventHandlers: Set<InteractionEventHandler> = new Set();
  private static readonly INTERACTION_COOLDOWN = 300; 
  private static readonly UPDATE_DEBOUNCE = 100; 
  private updateTimeoutId: number | null = null;

  constructor(interactablesMap: InteractablesMap) {
    this.interactablesMap = interactablesMap;
    this.interactionState = {
      nearbyObjects: new Set(),
      lastInteracted: null,
      cooldownUntil: 0,
      lastPosition: null
    };
  }

  //This is the main thing --> This adds our handlers (custom) and attach calls them on any event crucial for EVENT DRIVEN arch
  public subscribe(handler: InteractionEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  public updateInteractions(playerPosition: { x: number; y: number }): void {
    if (this.updateTimeoutId !== null) {
      clearTimeout(this.updateTimeoutId);
    }

    this.updateTimeoutId = window.setTimeout(() => {
      this.performInteractionUpdate(playerPosition);
    }, InteractionManager.UPDATE_DEBOUNCE);
  }

  public getAvailableInteractions(): InteractableObject[] {
    console.log(this.interactionState.nearbyObjects)
    return Array.from(this.interactionState.nearbyObjects)
      .map(id => this.interactablesMap.objects.get(id))
      .filter((obj): obj is InteractableObject => obj !== undefined);
  }

  public triggerInteraction(objectId: string): boolean {
    const now = Date.now();
    
    if (now < this.interactionState.cooldownUntil) {
    //   console.log("cooldown");
      return false;
    }

    if (!this.interactionState.nearbyObjects.has(objectId)) {
    //   console.log("Object not in range:", objectId);
      return false;
    }

    const object = this.interactablesMap.objects.get(objectId);
    if (!object) {
    //   console.log("Object not found:", objectId);
      return false;
    }

    this.interactionState.cooldownUntil = now + InteractionManager.INTERACTION_COOLDOWN;
    this.interactionState.lastInteracted = objectId;

    this.emitEvent({
      type: 'triggered',
      objectId,
      object
    });

    console.log("Interaction triggered:", objectId);
    return true;
  }

  public getClosestInteraction(playerPosition: { x: number; y: number }): InteractableObject | null {
    const available = this.getAvailableInteractions();
    if (available.length === 0) return null;

    let closest: InteractableObject | null = null;
    let closestDistance = Infinity;

    available.forEach(obj => {
      const distance = this.getDistanceToObject(playerPosition, obj);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = obj;
      }
    });

    return closest;
  }

  private performInteractionUpdate(playerPosition: { x: number; y: number }): void {
    if (
      this.interactionState.lastPosition &&
      this.interactionState.lastPosition.x === playerPosition.x &&
      this.interactionState.lastPosition.y === playerPosition.y
    ) {
      return;
    }

    console.log("🔍 Updating interactions for position:", playerPosition);

    const previousNearby = new Set(this.interactionState.nearbyObjects);
    const currentNearby = new Set<string>();

    // Get nearby objects using spatial indexing
    const nearbyObjects = this.getNearbyObjects(playerPosition);

    // Check each nearby object for interaction range
    nearbyObjects.forEach(obj => {
      const distance = this.getDistanceToObject(playerPosition, obj);
      
      if (distance <= obj.interactionRange) {
        currentNearby.add(obj.id);
      }
    });

    this.interactionState.nearbyObjects = currentNearby;
    this.interactionState.lastPosition = { ...playerPosition };

    // console.log(`📊 Interactions: ${currentNearby.size} available`);

    currentNearby.forEach(objectId => {
      if (!previousNearby.has(objectId)) {
        const object = this.interactablesMap.objects.get(objectId);
        if (object) {
          this.emitEvent({
            type: 'available',
            objectId,
            object,
            position: playerPosition
          });
        }
      }
    });

    // Find lost interactions
    previousNearby.forEach(objectId => {
      if (!currentNearby.has(objectId)) {
        this.emitEvent({
          type: 'lost',
          objectId
        });
      }
    });
  }
// here goes the chunking logic , for spatial range (just nearby tiles)....................................
  private getNearbyObjects(playerPosition: { x: number; y: number }): InteractableObject[] {
    const nearbyObjects = new Set<string>();
    
    //To Get player's chunk and surrounding chunks
    const { chunkX, chunkY } = tileToChunk(
      playerPosition.x, 
      playerPosition.y, 
      this.interactablesMap.chunkSize
    );

    //To Check 3x3 grid of chunks around player
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkChunkKey = getChunkKey(chunkX + dx, chunkY + dy);
        const chunk = this.interactablesMap.spatialGrid.get(checkChunkKey);
        
        if (chunk) {
          chunk.objects.forEach(objectId => nearbyObjects.add(objectId));
        }
      }
    }

    // Convert to objects and filter out null values
    return Array.from(nearbyObjects)
      .map(id => this.interactablesMap.objects.get(id))
      .filter((obj): obj is InteractableObject => obj !== undefined);
  }

  private getDistanceToObject(
    playerPosition: { x: number; y: number }, 
    object: InteractableObject
  ): number {
    let minDistance = Infinity;

    // Find minimum distance to any tile of the object
    object.tiles.forEach(tileKey => {
      const [tileX, tileY] = tileKey.split(',').map(Number);
      const distance = manhattanDistance(playerPosition, { x: tileX, y: tileY });
      minDistance = Math.min(minDistance, distance);
    });

    return minDistance;
  }

  private emitEvent(event: InteractionEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error("Error in interaction event handler:", error);
      }
    });
  }

  // Cleanup method
  public cleanup(): void {
    if (this.updateTimeoutId !== null) {
      clearTimeout(this.updateTimeoutId);
      this.updateTimeoutId = null;
    }
    this.eventHandlers.clear();
  }
}