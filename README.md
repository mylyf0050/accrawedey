# AccraWɔdey — 3D Life + Shared City

AccraWɔdey is a Ghana-first multiplayer city/life simulation built on the existing Shared City server and economy. The current client combines the original land/building economy with a lightweight WebGL 3D free-roam layer.

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
