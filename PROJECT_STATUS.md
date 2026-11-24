# GTA VI: Leonida & Vice City — Project Status

## Architecture & Module Inventory
All source files obey the strict **≤ 500 lines per file** modularity rule and communicate through the centralized `GameRegistry`, `EventBus`, and `SimulationClock`.

- **Core (`src/core/`)**: `types.ts`, `events.ts`, `clock.ts`, `registry.ts`, `input.ts`, `gameRuntime.ts`
- **Assets & Rendering (`src/assets/`, `src/rendering/`)**: `proceduralTextures.ts`, `assetLoader.ts`, `shaders.ts` (Rayleigh/Mie Sky + Parallax Interior Mapping), `engineGrafik.ts` (Babylon WebGPU + WebGL2 fallback, ACES/Bloom/DoF pipeline, CSM/ShadowGenerator)
- **World, Weather & Water (`src/world/`)**: `spatialGrid.ts`, `weatherSystem.ts`, `roadNetwork.ts` (A* graph + rail), `interiors.ts`, `worldArchitecture.ts`, `waterDiving.ts` (Gerstner waves, buoyancy, diving, salvage)
- **Gameplay (`src/gameplay/`)**: `characterRig.ts`, `playerController.ts`, `combatAnimation.ts`, `weaponsInventory.ts`, `vehicleModels.ts`, `vehiclePhysics.ts`, `aviationMarine.ts`, `transportSystems.ts`, `activitiesMissions.ts`
- **AI, Audio & Persistence (`src/ai/`, `src/audio/`, `src/persistence/`)**: `npcCrowdAI.ts`, `policeForensics.ts`, `economyEncounters.ts`, `spatialAudio.ts`, `db.ts`, `saveManager.ts`
- **UI & Localization (`src/ui/`, `src/App.tsx`)**: `localization.ts` (EN/DE/ES/FR), `Minimap.tsx`, `HudOverlay.tsx`, `WeaponWheelOverlay.tsx`, `HackingMinigame.tsx`, `PhoneApps.tsx`, `SmartphoneOverlay.tsx`, `DevConsole.tsx`, `LoadingOverlay.tsx`, `GameOverOverlay.tsx`, `PauseMenu.tsx`, `ActivityOverlay.tsx`, `TouchControls.tsx`
- **Tests (`src/tests/`)**: `integrationTests.ts` (in-engine Flows A–L via console `run_tests`), `runTests.ts` (headless CLI test runner)

## GitHub Status
No GitHub integration or remote credentials are configured in this workspace; all source code is maintained directly in the workspace files.

## Next Expansion Readiness
Ready for upcoming visual reference images, custom 3D glTF/GLB vehicle/character asset upgrades, and additional mission/world expansions.
