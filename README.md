# Nottingham City Phone Controller

A mobile-first landscape phone controller for the browser game. This repository is separate from `cyberokasha-dev/Nottingham-city`.

## Included
- Landscape-first controller layout with portrait rotate prompt
- Clickable Nottingham City title opens Pause / Resume overlay
- Connect modal with pairing-code input and QR scanning where supported
- Large left movement joystick and wide central camera swipe surface
- Larger triangle, square, circle and cross action buttons
- L1/L2 and R1/R2 shoulder buttons
- Settings and driving-mode visual preview

## Connect to the game
Open the browser game on your computer and press **Phone controller**. Scan its QR code with your phone camera, or open this controller page and enter the six-character pairing code. Both devices need internet. The bridge uses PeerJS/WebRTC; it sends stick, button and camera-swipe input to the normal game actions. A lost signal releases held controls after one second.

The stick moves on foot and steers/drives in a vehicle. Triangle interacts, square jumps, circle punches, cross runs or applies the handbrake, L1 guards, R1 uses the heavy punch, L2 brakes/reverses, and R2 accelerates. Swipe the centre to look around on foot and double-tap it to change camera. The driving-mode setting changes the controller display; the game determines the actual action context. The controller Pause menu is its own overlay.

QR scanning inside the page requires HTTPS and browser support for `BarcodeDetector`; your phone's camera can also open the QR link directly. The Android wrapper loads the hosted controller page. Root and `docs` copies contain the same connection code.

## GitHub Pages
In this repository, open Settings → Pages and choose Deploy from a branch, branch `main`, folder `/(root)`. After deployment, the controller URL should be `https://cyberokasha-dev.github.io/nottingham-city-phone-controller/`.
