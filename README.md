# Just a Meet (JAM)

## Overview

**Just a Meet (JAM)** is a web-based 2D multiplayer virtual environment that allows users to navigate a shared space, interact with objects, and engage in proximity-based audio/video communication. Inspired by platforms like **Kumospace** and **Workadventure**, it combines real-time presence, collaborative interactions, and dynamic rooms for a highly immersive experience.

## Demo Room


https://github.com/user-attachments/assets/53dd92d3-506d-4abe-9822-5553bbc40b83


## Room Layout
<img width="1081" height="761" alt="Larger Office" src="https://github.com/user-attachments/assets/2fb3d289-4222-4e9e-a331-53a61e6fdd67" />

**Key Highlights:**
- Grid-based movement and collision detection using Tiled maps
- Real-time multiplayer sync with Socket.io
- Dynamic, consent-based A/V communication using LiveKit
- Interactive objects and proximity-based actions
- Scalable architecture for multiple rooms and users

---

## Features

### User Interaction
- Avatar movement in a 2D map
- Collision-aware navigation
- Nearby panel showing other users (desktop & mobile-friendly)
- Interaction prompts for objects (e.g., “Press E to interact”)

### Proximity Audio/Video
- Users can hear/see only nearby participants
- Multi-user group calls (4–6 participants)
- Consent-based joining of A/V conversations
- Availability status management (Available, Busy, Away, Offline)
- Auto-availability updates based on A/V usage

### Room Management
- Dynamic rooms using Tiled maps
- Single main room for presence, sub-channels for A/V calls
- Room creation, joining, and movement handled in real-time

### Additional
- Multi-device support (desktop & mobile)
- Responsive UI for Nearby users panel
- Optimized rendering using Canvas + React separation
- Support for multiple rooms with independent state

---

## Tech Stack

### Frontend
- React – UI and state management
- Canvas API – Rendering maps and characters
- Redux – Global state management (user presence, interactions)
- Motion/Framer Motion – Animations
- Axios – API calls

### Backend
- Node.js + Express – API and WebSocket server
- Socket.io – Real-time presence and interactions
- LiveKit – Proximity-based SFU for audio/video
- Redis / In-memory store – User & room session management

### Assets
- Tiled Map Editor – JSON map layouts
- Tilesets – PNG-based map textures
- Sprites – Character and object sprites with JSON metadata

---

## Architecture

              ┌─────────────┐
              │   Client    │
              │  (React +   │
              │  Canvas)    │
              └─────┬──────┘
                    │ Socket.io / HTTP
                    │
          ┌─────────▼─────────┐
          │      Backend       │
          │ Node.js + Express  │
          │ Socket.io          │
          └─────────┬─────────┘
                    │
     ┌──────────────┴──────────────┐
     │                             │

## Key Points:
  - Canvas Rendering handles map and character visuals separately from UI
  - Socket.io syncs player positions, presence, and interaction events
  - LiveKit SFU enables dynamic proximity-based audio/video rooms without mixing A/V with presence channels
  - Data Store keeps track of rooms, users, and active interactions for game loop updates

---

## Future Enhancements

Persistent rooms and user data

Avatar customization and animations

Enhanced proximity-based events (object triggers, mini-games)

Advanced scaling for large rooms (>50 users)
