
# 🗺️ Architecture Overview: Kumospace-style 2D Multiplayer App

---

## ⚙️ 1. Backend Architecture

### 🧩 Components:

* **Socket.IO Server**
* **Room Manager**
* **Spatial Index (Grid-based)**
* **Proximity Engine**
* **User Registry (Per Room)**
* **Tick System**

---

### 🏗️ Room and User Management

* **`Map<string, Room>`** – Active rooms
* Each `Room` contains:

  * `Map<string, User>` – all connected users
  * `Map<string, Set<string>>` – proximity graph: who is near whom
* `User` object includes:

  ```ts
  interface User {
    id: string;
    username: string;
    x: number;
    y: number;
    socketId: string;
    roomId: string;
    sprite: string;
    isAudioEnabled?: boolean;
    isVideoEnabled?: boolean;
  }
  ```

---

### 🔁 Tick Loop (Real-time Sync Loop)

* Runs \~30 times/sec
* For each room:

  * For each user:

    * Get **nearby candidates** via spatial grid
    * Compute actual distances
    * Track **proximity diffs** (entered / left)
    * Emit `room-sync` to *that user only*:

      ```ts
      {
        me: { x, y },
        players: [nearby users only],
        proximity: { entered, left },
        audio: [{ id, level }]
      }
      ```

---

## 🧠 2. Frontend Architecture

### 📁 State Management (Redux or Zustand)

* `usersInRoom: Map<string, User>` – all known users
* `nearbyUserIds: Set<string>` – users currently within proximity
* `currentUser: User` – local player
* Optional: `audioSubscriptions`, `spriteData`, `roomMetadata`

---

### 🔌 Socket Handling (`room-sync`)

On receiving `room-sync`:

```ts
newSocket.on("room-sync", (payload) => {
  setCurrentUser(payload.me);

  // Merge nearby players into users map
  setUsers(prev => {
    const map = new Map(prev);
    for (const p of payload.players) {
      map.set(p.id, { ...map.get(p.id), ...p });
    }
    return map;
  });

  // Replace proximity set
  setNearbyUserIds(new Set(payload.players.map(p => p.id)));

  // Sync proximity audio/video
  liveKitManager?.syncSubscriptions(payload.proximity.entered, payload.proximity.left);
});
```

---

### 🎨 UI Rendering Pipeline

* Use `nearbyUserIds` to filter `usersInRoom`

```tsx
const nearbyUsers = useMemo(() => {
  return Array.from(nearbyUserIds).map(id => usersInRoom.get(id)).filter(Boolean);
}, [usersInRoom, nearbyUserIds]);

return (
  <>
    {nearbyUsers.map(user => (
      <Player key={user.id} user={user} />
    ))}
  </>
);
```

* `Player` component is `React.memo`-wrapped for performance
* Local user (`currentUser`) controlled separately

---

### 🧮 Movement & Input

* Local movement updates sent via socket (`move`, `positionUpdate`)
* Server updates everyone else via `room-sync`
* Optional: client-side smoothing via `framer-motion` or tweening

---

## 🔊 Audio/Video (Proximity-Based)

### 🔁 `proximity.entered` / `left`

* `liveKitManager.syncSubscriptions(entered, left)` adds/removes tracks
* Level control via `audio: [{ id, level }]` map

---

## 📦 Asset System (Tiled Map / Sprites)

* Tiled `.json` + PNG for rooms
* PNG sprite sheets for characters
* Dynamic loading via canvas renderer

---

## 🧱 Rendering Backend

* **Canvas-based rendering** for map + characters
* **React DOM** overlay for UI components (e.g., name tags, modals)
* Layers:

  1. Map (canvas)
  2. Characters (canvas or DOM+absolute)
  3. UI overlays (React DOM)

---

## 🧰 Developer Utilities

* **Debug Tools**: show all users on map with bounding boxes
* **Hot Reload**: enable fast iteration on sprite updates
* **Latency Logging**: measure `tick → room-sync → render` delay

---

## 📈 Optimization Techniques

| Area                | Technique                                          |
| ------------------- | -------------------------------------------------- |
| State Management    | Use `Map` for fast lookups and incremental updates |
| UI Rendering        | Memoize components (`React.memo`)                  |
| Position Updates    | Only send deltas / nearby user positions           |
| Spatial Filtering   | Grid-based spatial index                           |
| Proximity Detection | Per-user proximity sets with diffing               |
| Canvas Performance  | Batch draw tiles / characters                      |
| Audio Scaling       | Calculate level based on `distance` in tick loop   |

---

## 📚 Sample Folder Structure

```
/client
  /components
    Player.tsx
    CanvasRenderer.ts
  /state
    userStore.ts
    proximityStore.ts
  /sockets
    socketManager.ts
  /utils
    spatial.ts
    movement.ts
  App.tsx

/server
  index.ts
  /managers
    RoomManager.ts
    SpatialGrid.ts
    ProximityManager.ts
  /types
    User.ts
    Room.ts
  tickLoop.ts
```

---

Let me know if you want a Markdown version of this for your docs.
