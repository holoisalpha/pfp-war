# PFP WAR

A canvas-based battle royale simulator for X/Twitter followers. Profile pictures battle until one remains.

## Features

- **Battle Royale** - All your followers fight in a physics-based arena
- **Real Profile Pictures** - Pre-rendered circular PFPs for smooth performance
- **Video Recording** - Record battles at 60fps, 10Mbps quality
- **Mobile Friendly** - Tap to start/pause, works great on phones
- **Pepe Tank** - Stall breaker appears at 10 players, fires heat-seeking missiles
- **ETH Power-ups** - Spawn at final 2 players, +30 HP on pickup
- **Top 5 Reset** - Optional mechanic: at 5 players, reset health + respawn 5 eliminated players
- **Victory Path** - Visualize the winner's journey through the battle

## Quick Start

1. Visit the deployed site
2. Tap **"Load @HoloisAlpha Followers"** (or upload your own JSON)
3. Tap the screen to start
4. Tap again to pause (shows Resume/Restart buttons)

## Controls

- **Tap screen** - Start or pause the battle
- **When paused** - Resume or Restart buttons appear
- **After winner** - New Battle button appears

## Loading Followers

Three ways to load follower data:

1. **Built-in** - Tap "Load @HoloisAlpha Followers"
2. **Paste JSON** - Tap "Paste JSON" and paste your data
3. **Upload File** - Tap "Upload JSON" to select a file
4. **URL Parameter** - Add `?data=https://your-url.com/followers.json`

## Follower JSON Format

```json
{
  "account": "username",
  "totalFollowers": 1234,
  "followers": [
    {
      "username": "follower1",
      "displayName": "Follower One",
      "pfpUrl": "https://...",
      "pfpBase64": "data:image/..."
    }
  ]
}
```

## Game Mechanics

### Combat
- Collision-based damage
- Faster player deals more damage
- Speed advantage (35%+) determines attacker vs defender
- Health bars show remaining HP

### Scaling
- Dynamic player sizes based on remaining count
- Game speed increases as players are eliminated
- Spatial grid collision detection handles 2500+ players

### Extras (Toggle ON/OFF)
- **Pepe Tank** - Appears at 10 players, targets highest HP player, fires if no kill in 5 seconds
- **ETH Power-ups** - 3 spawn at final 2 players

### Top 5 Reset (Toggle ON/OFF)
- At 5 players remaining, all survivors reset to full health
- 5 random eliminated players respawn
- Final 10 showdown begins

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- React + Vite
- Tailwind CSS
- HTML5 Canvas
- IndexedDB (for caching large follower data)
- MediaRecorder API (video recording)

## License

MIT
