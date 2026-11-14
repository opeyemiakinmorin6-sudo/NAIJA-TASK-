# NAIJA STAR LIFE 3D — Production Blueprint

## Product promise

A globally welcoming, Nigerian-rooted 3D social life simulator. The player experience is the product. Administration is a behind-the-scenes operation and must never dominate the game UI or normal play.

The game should combine the social creativity and personal expression of life simulators with a lively, explorable city, meaningful daily activities and real multiplayer hangouts. It must have its own identity; it is not a clone of another title.

## Delivery strategy

- Build a native Android game first, with a web hub retained for discovery, accounts and news.
- Use Godot 4 with the Compatibility renderer as the initial renderer target. Confirm exact engine version and Android export settings before production builds.
- Use Blender-authored, licensed 3D assets in glTF/GLB format. Do not rely on primitive geometry as the final character, building, vehicle or furniture art.
- Keep the current Three.js game intact as a legacy prototype until the native game has feature parity for the agreed migration scope and has passed release testing.
- Keep source assets and scenes modular. Separate world districts, interiors, player avatar, NPCs, vehicles, UI, social systems and backend integration.

## Player-first experience

1. A polished first-session flow: choose appearance, enter the world quickly, learn controls naturally, and discover an inviting first activity.
2. A persistent avatar: face, skin tone, hair, outfits, accessories, animations and saved wardrobe.
3. A lived-in Nigerian city: distinctive neighbourhoods, architecture, shops, transport, public spaces, soundscape, signage, markets and cultural events.
4. Interactive life: homes, furniture, shopping, work, businesses, food, leisure, transport and progression.
5. Social play: friends, parties, public hangouts, messaging, player reporting, blocking and moderation.
6. Global inclusion: international player identities and events while Nigerian culture remains a defining strength.
7. Respectful monetisation: optional cosmetics and rewarded activities; no forced ads during active gameplay and no pay-to-enjoy progression.

## Technical architecture

### Client
- Godot 4 native Android client.
- Compatibility renderer baseline for broad Android support; quality settings scale texture resolution, shadows, view distance, effects, NPC density and render scale.
- Mobile-first touch controls, controller/keyboard support where available, accessibility settings and safe-area-aware UI.
- Scene streaming by district/interior; object pooling, LODs, occlusion and distance-based simulation.
- Asset bundles by district and optional content pack so the initial install is not needlessly enormous.

### Backend
- Supabase remains the account, profile and durable game-data service where suitable.
- Never put service-role credentials in the client. Use user-scoped sessions and server-side validation.
- Dedicated authoritative multiplayer service for real-time movement and shared sessions. Supabase presence/chat can complement it but is not a substitute for an authoritative real-time game server.
- Server validates currency, inventory, rewards, property ownership, trades and progression. Client display values are never trusted.
- Moderation: block, report, rate limits, age-appropriate safeguards, anti-spam and audit trail.

### Multiplayer rollout
1. Local single-player slice with deterministic movement and interactions.
2. Private test session with two authenticated clients in one small location.
3. Server-authoritative player movement, interpolation, reconnect handling and interest management.
4. Friends, invites, parties and chat with block/report controls.
5. Load tests, abuse testing, regional deployment and operations monitoring before public scale.

## First vertical slice

Build one complete, attractive neighbourhood rather than seven empty districts:
- A recognisable Nigerian street with a market frontage, homes, a small park/plaza and a social venue.
- One high-quality player avatar with a proper rig, idle/walk/run/turn animations and outfit variations.
- Third-person camera and responsive touch movement.
- At least one furnished, enterable home with working doors and interactable furniture.
- Several NPCs with believable idle, walking and simple interaction behaviours.
- One meaningful activity loop (visit a shop or venue, interact, earn a reward, update player progression).
- Performance and memory profiling on representative low-, mid- and high-tier Android devices.

Only after this slice is enjoyable and stable should the team expand the map and feature set.

## Device and download policy

- Do not equate a larger download with better quality. Spend bytes on authored models, textures, animation, audio and world detail that visibly improve play.
- Offer low, balanced and high graphics profiles. The low profile reduces resolution, shadows, draw distance, effects and crowd density rather than removing essential gameplay.
- Download optional district and cosmetic packs on demand, with clear Wi-Fi/mobile-data controls.
- Test Android 8-era devices explicitly. OS compatibility alone does not guarantee that a specific phone's GPU, RAM or thermal limits can run the game smoothly.
- Do not promise support or frame rates until physical-device tests are recorded.

## Quality gates

A milestone is not complete because the code was written. It must pass:
- project import and clean export;
- Android install/launch and touch-control tests;
- real-device frame-time, memory, heat and battery checks;
- gameplay acceptance tests for the full vertical slice;
- two-account multiplayer tests where relevant;
- backend permission and abuse tests;
- accessibility, moderation and privacy review.

## Out of scope for the first slice

- A giant seamless world with every district open at once.
- Hundreds of simultaneous players in one instance.
- Voice/video calling, complex economy trading or unrestricted user-generated content.
- Promising Sims/Avakin parity in one release.

These can be evaluated after the foundation works.

## Immediate build sequence

1. Establish the Godot project and Android Compatibility export configuration in this isolated branch.
2. Create the first authored neighbourhood scene and player controller.
3. Import a properly licensed avatar and animation set; document asset provenance.
4. Implement one home and one complete activity loop.
5. Profile on actual devices and refine.
6. Add the first two-client multiplayer test only after local gameplay is stable.

## Security and project safety

- This work lives on the `starlife-native-foundation` branch.
- Do not replace or delete `starlife-3d.html`, `starlife.html`, existing Supabase functions or tables as part of the initial native-game setup.
- Keep all secrets out of source control. Public client keys are not secrets, but service-role keys and private server credentials must never be committed.
- Record what has actually been tested; never describe a code audit as a device test.
