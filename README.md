# Accrawedey — 3D Life + Shared City

Accrawedey is a Ghana-first multiplayer city/life simulation built on the existing Shared City server and economy. The current client combines the original land/building economy with a lightweight WebGL 3D free-roam layer.

## 3D Life
- Third-person 3D player movement with WASD/arrow keys.
- Drag to orbit the camera and mouse wheel to zoom.
- Accra locations: Osu Oxford Street, Makola Market, Airport City, Labadi Beach, East Legon, Jamestown and a trotro station.
- Press **E** near a location to perform a life action.
- Life needs are persistent server-side: hunger, energy, fun, social, hygiene and bladder.
- Life actions affect money and needs: eat, work, relax, social, sleep, culture and travel.
- Connected players broadcast their 3D positions to one another in real time.

## Existing city systems
The original shared-city economy, land ownership, jobs, companies, vehicles, elections, police/prison systems and account authentication remain in the server.

## Render
Node 20+ is recommended. The service serves the generated `client/index.html` and WebSocket endpoint from the same process. `ws` is declared in `package.json` and locked in `package-lock.json`.

Build locally with:

```bash
npm ci
npm run build
npm start
```

The build script is portable and uses its own project directory; it does not depend on an external `/home/claude/...` path.
## Accrawedey 3D Accra World

The 3D Life world now uses named Greater Accra locations rather than anonymous blocks. The current map includes Jamestown, Makola Market, Adabraka, Ridge, Osu/Oxford Street, Labone, Cantonments, Airport City, Airport Residential Area, Roman Ridge, Achimota, Circle, Kaneshie, Dansoman, Labadi, La, Teshie, Nungua, Spintex, East Legon, Shiashie, Madina, Legon, North Legon, Haatso, Westlands, Kokomlemle, Tesano, Abeka, Tema, Tema Community 1 and Prampram.

Explore cycles through these named locations and the player can freely roam between them.
