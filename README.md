# Nottingham City Phone Controller

A standalone mobile-first landscape controller UI prototype. This repository is separate from `cyberokasha-dev/Nottingham-city`.

## Included
- Landscape-first controller layout with portrait rotate prompt
- Clickable Nottingham City title opens Pause / Resume overlay
- Connect modal with pairing-code input and QR scanning where supported
- Large left movement joystick and wide central camera swipe surface
- Larger triangle, square, circle and cross action buttons
- L1/L2 and R1/R2 shoulder buttons
- Settings and driving-mode visual preview

## Important
This is a front-end prototype only. It does **not** connect to the game yet and never pretends pairing succeeded. A working connection still needs a secure WebSocket relay (`wss://`), a shared pairing protocol, and a receiver added to the Godot game.

QR camera access requires HTTPS or localhost and browser support for `BarcodeDetector`.

## GitHub Pages
In this repository, open Settings → Pages and choose Deploy from a branch, branch `main`, folder `/(root)`. After deployment, the controller URL should be `https://cyberokasha-dev.github.io/nottingham-city-phone-controller/`.
