import { tileToChunk, getChunkKey, manhattanDistance } from "./coreDS";
import type {
  InteractablesMap,
  InteractableObject,
  InteractionState,
} from "./coreDS";

export interface InteractionEvent {
  type: "available" | "lost" | "triggered";
  objectId: string;
  object?: InteractableObject;
  position?: { x: number; y: number };
}

export type InteractionEventHandler = (event: InteractionEvent) => void;

// Enhanced state update callback type for Redux integration
export type StateUpdateCallback = (
  availableInteractions: InteractableObject[],
  closestInteraction: InteractableObject | null
) => void;

export class InteractionManager {
  private interactablesMap: InteractablesMap;
  private interactionState: InteractionState;
  private eventHandlers: Set<InteractionEventHandler> = new Set();
  private stateUpdateCallback: StateUpdateCallback | null = null;
  private static readonly INTERACTION_COOLDOWN = 300;
  private static readonly UPDATE_DEBOUNCE = 100;
  private updateTimeoutId: number | null = null;
  private currentPlayerPosition: { x: number; y: number } | null = null;

  constructor(interactablesMap: InteractablesMap) {
    this.interactablesMap = interactablesMap;
    this.interactionState = {
      nearbyObjects: new Set(),
      lastInteracted: null,
      cooldownUntil: 0,
      lastPosition: null,
    };
  }

  // Set Redux state update callback
  public setStateUpdateCallback(callback: StateUpdateCallback): void {
    this.stateUpdateCallback = callback;
  }

  public subscribe(handler: InteractionEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  public updateInteractions(playerPosition: { x: number; y: number }): void {
    this.currentPlayerPosition = playerPosition;

    if (this.updateTimeoutId !== null) {
      clearTimeout(this.updateTimeoutId);
    }

    this.updateTimeoutId = window.setTimeout(() => {
      this.performInteractionUpdate(playerPosition);
    }, InteractionManager.UPDATE_DEBOUNCE);
  }

  public getAvailableInteractions(): InteractableObject[] {
    return Array.from(this.interactionState.nearbyObjects)
      .map((id) => this.interactablesMap.objects.get(id))
      .filter((obj): obj is InteractableObject => obj !== undefined);
  }

  public triggerInteraction(objectId: string): boolean {
    const now = Date.now();

    if (now < this.interactionState.cooldownUntil) {
      return false;
    }

    if (!this.interactionState.nearbyObjects.has(objectId)) {
      return false;
    }

    const object = this.interactablesMap.objects.get(objectId);
    if (!object) {
      return false;
    }

    this.interactionState.cooldownUntil =
      now + InteractionManager.INTERACTION_COOLDOWN;
    this.interactionState.lastInteracted = objectId;

    this.emitEvent({
      type: "triggered",
      objectId,
      object,
    });
    return true;
  }

  public getClosestInteraction(playerPosition: {
    x: number;
    y: number;
  }): InteractableObject | null {
    const available = this.getAvailableInteractions();
    if (available.length === 0) return null;

    let closest: InteractableObject | null = null;
    let closestDistance = Infinity;

    available.forEach((obj) => {
      const distance = this.getDistanceToObject(playerPosition, obj);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = obj;
      }
    });

    return closest;
  }

  private performInteractionUpdate(playerPosition: {
    x: number;
    y: number;
  }): void {
    if (
      this.interactionState.lastPosition &&
      this.interactionState.lastPosition.x === playerPosition.x &&
      this.interactionState.lastPosition.y === playerPosition.y
    ) {
      return;
    }

    // console.log("🔍 Updating interactions for position:", playerPosition);

    const previousNearby = new Set(this.interactionState.nearbyObjects);
    const currentNearby = new Set<string>();

    // Get nearby objects using spatial indexing
    const nearbyObjects = this.getNearbyObjects(playerPosition);

    // Check each nearby object for interaction range
    nearbyObjects.forEach((obj) => {
      const distance = this.getDistanceToObject(playerPosition, obj);

      if (distance <= obj.interactionRange) {
        currentNearby.add(obj.id);
      }
    });

    // Update state
    this.interactionState.nearbyObjects = currentNearby;
    this.interactionState.lastPosition = { ...playerPosition };

    // console.log(`📊 Interactions: ${currentNearby.size} available`);
    // console.log("Previous nearby:", Array.from(previousNearby));
    // console.log("Current nearby:", Array.from(currentNearby));

    // Fire events for new interactions (available)
    currentNearby.forEach((objectId) => {
      if (!previousNearby.has(objectId)) {
        const object = this.interactablesMap.objects.get(objectId);
        if (object) {
          // console.log("🆕 New interaction available:", objectId);
          this.emitEvent({
            type: "available",
            objectId,
            object,
            position: playerPosition,
          });
        }
      }
    });

    // Fire events for lost interactions
    previousNearby.forEach((objectId) => {
      if (!currentNearby.has(objectId)) {
      }
    });

    // Update Redux state automatically
    // this.updateReduxState(playerPosition);
  }

  //@ts-ignore // future use
  private updateReduxState(playerPosition: { x: number; y: number }): void {
    if (this.stateUpdateCallback) {
      console.log(this.getAvailableInteractions, this.getClosestInteraction);
      const availableInteractions = this.getAvailableInteractions();
      const closestInteraction = this.getClosestInteraction(playerPosition);
      this.stateUpdateCallback(availableInteractions, closestInteraction);
    }
  }

  private getNearbyObjects(playerPosition: {
    x: number;
    y: number;
  }): InteractableObject[] {
    const nearbyObjects = new Set<string>();

    const { chunkX, chunkY } = tileToChunk(
      playerPosition.x,
      playerPosition.y,
      this.interactablesMap.chunkSize
    );

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkChunkKey = getChunkKey(chunkX + dx, chunkY + dy);
        const chunk = this.interactablesMap.spatialGrid.get(checkChunkKey);

        if (chunk) {
          chunk.objects.forEach((objectId) => nearbyObjects.add(objectId));
        }
      }
    }

    return Array.from(nearbyObjects)
      .map((id) => this.interactablesMap.objects.get(id))
      .filter((obj): obj is InteractableObject => obj !== undefined);
  }

  private getDistanceToObject(
    playerPosition: { x: number; y: number },
    object: InteractableObject
  ): number {
    let minDistance = Infinity;

    object.tiles.forEach((tileKey) => {
      const [tileX, tileY] = tileKey.split(",").map(Number);
      const distance = manhattanDistance(playerPosition, {
        x: tileX,
        y: tileY,
      });
      minDistance = Math.min(minDistance, distance);
    });

    return minDistance;
  }

  private emitEvent(event: InteractionEvent): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error("Error in interaction event handler:", error);
      }
    });
  }

  public cleanup(): void {
    if (this.updateTimeoutId !== null) {
      clearTimeout(this.updateTimeoutId);
      this.updateTimeoutId = null;
    }
    this.eventHandlers.clear();
    this.stateUpdateCallback = null;
  }
}
