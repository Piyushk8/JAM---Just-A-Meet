
## 🔄 Overview: How Nearby Users Work

### ✅ Backend: Emits `room-sync` for each user individually

```ts
this.io.to(me.socketId).emit("room-sync", {
  ts: Date.now(),
  me: { x: me.x, y: me.y },
  players: nearbyUsers.map((u) => ({
    id: u.id,
    x: u.x,
    y: u.y,
    username: u.username,
  })),
  proximity: {
    entered,
    left,
  },
  audio: inRange.map((u) => ({
    id: u.id,
    level: calculateAudioLevel(d),
  })),
});
```

### 👇 Players = Nearby users **from the POV of the current user**

For each connected user (`me`), we:

* Look at which users are **close** to `me` (within `PROXIMITY_THRESHOLD`)
* Send only that subset in the `players` array.
* Also include:

  * `entered`: users who just became nearby
  * `left`: users who just left proximity

---

## 📦 `RoomSyncPayload` Type (frontend)

```ts
interface RoomSyncPayload {
  ts: number;
  me: { x: number; y: number };
  players: User[]; // nearby users only
  proximity: {
    entered: string[]; // user IDs
    left: string[];
  };
  audio: { id: string; level: number }[];
}
```

---

## 🎯 Frontend Usage (React + Redux example)

### 1. Update my position

```ts
setCurrentUser(me);
```

### 2. Merge `players` into global map of users (as discussed)

```ts
dispatch(updateUsersInRoom(players)); // merges into usersInRoom Map
```

### 3. Maintain a `nearbyUsers` list separately

You can either:

* Store an array: `User[]`
* Or a Set: `Set<string>` (just user IDs)
* Or a map for extra detail: `Map<string, User>`

Update it like:

```ts
setNearbyUsers(players); // overwrite with current nearby
```

Or in Redux:

```ts
dispatch(setNearbyUsers(players.map((u) => u.id)));
```

---

## 🗺️ Why this split?

* `usersInRoom`: Map of **all** users in the room. Used to render full state, audio mute, etc.
* `nearbyUsers`: Lightweight list used for **rendering**, A/V subscription, proximity interactions, etc.

---

## 📡 Proximity Audio/Video

This is where `entered` and `left` are useful:

```ts
liveKitManager?.syncSubscriptions(
  proximity.entered,
  proximity.left
);
```

So your media system only loads streams for nearby users and frees them when they leave.

---

## ✅ Summary

| Concept             | Data Source                  | Where used                         |
| ------------------- | ---------------------------- | ---------------------------------- |
| All users in room   | `usersInRoom: Map`           | Global user state, fallback render |
| Nearby users        | `players: User[]` from BE    | Rendering, A/V, proximity UI       |
| Proximity diff      | `entered`, `left`            | Subscribe/unsubscribe from audio   |
| Frontend separation | `usersInRoom`, `nearbyUsers` | Efficient UI + media mgmt          |

---

Let me know:

* if you want full Redux slice for nearby users,
* or how to filter `usersInRoom` to derive nearby users without separate state.
