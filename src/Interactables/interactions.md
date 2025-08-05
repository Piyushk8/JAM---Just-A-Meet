
## 1. Building the Interactables Map

### **`InteractablesMapBuilder.buildInteractablesMap(mapData)`**

1. **Initial Data Structures**

   ```ts
   interactablesMap: {
     objects: Map<string,InteractableObject>,     // all objects by ID
     tileToObjects: Map<string,Set<string>>,      // tileKey → object IDs
     spatialGrid: Map<string,SpatialChunk>,       // chunkKey → set of object IDs
     chunkSize: number                            // e.g. 8 tiles per chunk
   }
   ```

2. **Loop over all layers**

   * **Object layers** (e.g. a “Computers” layer in Tiled) → `processObjectLayer`
   * **Tile layers** (e.g. large sprites drawn as tiles) → `processTileLayer`

3. **`processObjectLayer`**
   For each placed object (`obj.x`, `obj.y`, `obj.width`, `obj.height`):

   * Compute which tiles it covers (bounds → `tileLeft, tileTop, tileRight, tileBottom`)
   * Build a **`Set<string>`** of all `"x,y"` tile keys it occupies.
   * Create an **`InteractableObject`** record:

     ```ts
     {
       id, type, tiles, bounds: {x,y,width,height},
       metadata: {name, properties, originalObject},
       interactionRange  // from Tiled props or default 1
     }
     ```
   * 👉 Call `addObjectToMaps()`

4. **`processTileLayer`**
   When your map uses a tile layer to place interactables (e.g. a row of vending-machine tiles):

   * Flood-fill connected non-zero tiles into one object.
   * Compute bounds and tiles exactly as above.
   * Create `InteractableObject` and `addObjectToMaps()`.

5. **`addObjectToMaps(obj)`**

   * **`objects.set(obj.id, obj)`**
   * For each tile key in `obj.tiles`:

     * `tileToObjects.get(key)?.add(obj.id)`
   * Determine which **spatial chunks** (e.g. 8×8-tile blocks) this object intersects, and add `obj.id` to those `spatialGrid` entries.

🔑 **Result**:

* **Fast tile lookup** via `tileToObjects: Map<"x,y", Set<objectId>>`.
* **Fast range/area lookup** via `spatialGrid: Map<"chunkX,chunkY", SpatialChunk>`.

---

##  2. Managing and Triggering Interactions

### **`new InteractionManager(interactablesMap)`**

1. **Internal State**

   ```ts
   interactionState = {
     nearbyObjects: Set<string>,   // IDs currently in range
     lastInteracted: string|null,  
     cooldownUntil: number,        // timestamp
     lastPosition: {x,y}|null
   }
   eventHandlers: Set<InteractionEventHandler>
   ```

2. **`subscribe(handler)`**
   Add your callback to receive events of types:

   * `"available"` → object just came into range
   * `"lost"`      → object just left range
   * `"triggered"` → user explicitly interacted (e.g. pressed “E”)

3. **`updateInteractions(playerPosition)`**
   Debounced (every 100 ms):

   * **Skip** if position unchanged.
   * **Query nearby objects** via `getNearbyObjects()`.
   * **Filter** them by Manhattan distance ≤ each object’s `interactionRange`.
   * Compare with previous `nearbyObjects`:

     * For each **new** ID → emit `{type: 'available', objectId, object, position}`.
     * For each **missing** ID → emit `{type: 'lost', objectId}`.
   * Update `interactionState.nearbyObjects` and `lastPosition`.

4. **`getNearbyObjects(playerPosition)`**

   * Compute which **chunk** the player is in.
   * Look in that chunk and its 8 neighbors in `spatialGrid`.
   * Collect unique object IDs → return their full `InteractableObject` records.

5. **`triggerInteraction(objectId)`**

   * If now < `cooldownUntil`, reject (return `false`).
   * If `objectId` not in `nearbyObjects`, reject.
   * Otherwise:

     * Set a short cooldown (e.g. 300 ms).
     * Emit `{type: 'triggered', objectId, object}`.
     * Return `true`.

6. **`getClosestInteraction()`**

   * From your current `nearbyObjects`, pick the one with minimum manhattan distance.

---

##  3. Putting It All Together

### **Initialization (e.g. on room load)**

```ts
// 1) Build the map once from your Tiled JSON
const interactablesMap = InteractablesMapBuilder.buildInteractablesMap(mapData);

// 2) Create the manager
const interactionMgr = new InteractionManager(interactablesMap);

// 3) Subscribe to interaction events
const unsubscribe = interactionMgr.subscribe(event => {
  switch (event.type) {
    case 'available':
      // e.g. show “Press E to open Whiteboard”
      showPromptFor(event.object!);
      break;
    case 'lost':
      hidePromptFor(event.objectId);
      break;
    case 'triggered':
      // open the feature UI
      openFeature(event.object!);
      break;
  }
});
```

### **On Player Movement (e.g. canvas tick or socket update)**

```ts
function onPlayerMove(x, y) {
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);

  interactionMgr.updateInteractions({ x: tileX, y: tileY });
}
```

### **On Key Press (e.g. user hits “E” to interact)**

```ts
window.addEventListener('keydown', e => {
  if (e.key === 'e') {
    const closest = interactionMgr.getClosestInteraction({ x: tileX, y: tileY });
    if (closest) {
      interactionMgr.triggerInteraction(closest.id);
    }
  }
});
```

### **Cleanup (e.g. leaving room)**

```ts
unsubscribe();
interactionMgr.cleanup();
```

---

## Important concepts involved

* **Spatial indexing** (chunks + tile map) keeps your per-update cost to only the handful of objects near the player.
* **Debouncing** ensures you aren’t recalculating on every pixel movement.
* **Event-driven** model (`subscribe` + emit) cleanly separates your engine logic from UI.
* **Cooldown** prevents spamming interactions.

With this in place, you get a **scalable**, **high-performance** interaction system that easily handles hundreds of objects and delivers precise “available/lost/triggered” events for your React UI.
