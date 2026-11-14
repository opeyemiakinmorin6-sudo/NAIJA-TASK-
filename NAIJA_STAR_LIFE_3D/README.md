# NAIJA STAR LIFE 3D — Native game foundation

This folder is the isolated Godot 4 project foundation. It does not replace the existing browser prototype.

## Current state

- Godot project configuration targets the Compatibility renderer.
- A minimal main scene, player scene, third-person controller, touchscreen movement/camera input and interaction ray are in place.
- A first activity interaction loop is wired: approach the activity marker, target it with the camera, then press E or use the on-screen INTERACT button. It awards prototype-only local Star Coins and has a short cooldown.
- The current capsule and ground are temporary greybox test objects, not final character or environment art.
- The activity marker, player capsule and ground are temporary greybox objects. The Star Coins reward is local prototype state only; it is not connected to Supabase, cannot be withdrawn, and must not be treated as real currency.
- No licensed production avatar, district environment, animation pack, Android export, multiplayer server or device performance test is included yet.

## Open the project

1. Install Godot 4.x on a desktop computer.
2. Open this folder as a project.
3. Run the main scene.
4. Use WASD or arrow keys to move, Shift to run, Space to jump, and hold the right mouse button while moving the mouse to orbit the camera. On touchscreens, drag on the left half to move and drag on the right half to orbit the camera. The activity button appears when the camera targets the activity marker. A visible movement joystick, jump/run controls and proper mobile HUD are still required.

## Next milestones

Android touch controls, the first authored Nigerian neighbourhood, licensed character and animation assets, one home and one complete activity loop.

## Production rules

- Final art must be authored or properly licensed and its provenance documented.
- Never commit service-role keys, private multiplayer credentials or other secrets.
- Keep the legacy starlife-3d.html and starlife.html unchanged until migration is approved.
- A successful project import is not proof of Android compatibility or performance. Record actual device tests separately.
