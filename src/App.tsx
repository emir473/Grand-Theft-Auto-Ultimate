import { useEffect, useRef, useState } from 'react';
import { GameRuntime, type HudSnapshot } from './core/gameRuntime';
import type { AssetLoadProgress } from './assets/assetLoader';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { HudOverlay } from './ui/HudOverlay';
import { SmartphoneOverlay } from './ui/SmartphoneOverlay';
import { WeaponWheelOverlay } from './ui/WeaponWheelOverlay';
import { PauseMenu } from './ui/PauseMenu';
import { DevConsole } from './ui/DevConsole';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { ActivityOverlay } from './ui/ActivityOverlay';
import { TouchControls } from './ui/TouchControls';
import { WorldMapOverlay } from './ui/WorldMapOverlay';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);

  const [loadProgress, setLoadProgress] = useState<AssetLoadProgress>({
    percent: 0,
    statusKey: 'loading.subtitle',
    currentAsset: 'initializing',
    errors: [],
    requiredComplete: false,
    optionalPending: true,
  });
  const [ready, setReady] = useState(false);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [activityMode, setActivityMode] = useState<string | null>(null);
  const [minimapRotate, setMinimapRotate] = useState(true);
  const [muted, setMuted] = useState(false);
  const [gameOver, setGameOver] = useState<{ mode: 'none' | 'wasted' | 'busted'; fineCents: number }>({
    mode: 'none',
    fineCents: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const runtime = new GameRuntime();
    runtimeRef.current = runtime;

    let hudInterval = 0;

    const unsubDied = runtime.registry.events.on('player:died', () => {
      const fine = Math.min(500000, Math.floor(runtime.registry.getActiveCharacter().cashCents * 0.1));
      setGameOver({ mode: 'wasted', fineCents: fine });
      setPhoneOpen(false);
      setWheelOpen(false);
    });
    const unsubArrested = runtime.registry.events.on('player:arrested', (ev) => {
      setGameOver({ mode: 'busted', fineCents: ev.bailCents });
      setPhoneOpen(false);
      setWheelOpen(false);
    });
    const unsubRespawn = runtime.registry.events.on('player:respawned', () => {
      setGameOver({ mode: 'none', fineCents: 0 });
    });

    void runtime
      .boot(canvas, (p) => setLoadProgress(p), {
        onTogglePhone: () => {
          setPhoneOpen((prev) => {
            const next = !prev;
            runtime.registry.state.phoneOpen = next;
            runtime.registry.events.emit(next ? 'phone:opened' : 'phone:closed', {
              characterId: runtime.registry.state.activeCharacterId,
            });
            return next;
          });
        },
        onToggleConsole: () => {
          setConsoleOpen((prev) => {
            const next = !prev;
            runtime.registry.state.consoleOpen = next;
            return next;
          });
        },
        onTogglePause: () => {
          setPauseOpen((prev) => {
            const next = !prev;
            runtime.registry.state.pauseMenuOpen = next;
            runtime.registry.clock.setPaused(next);
            return next;
          });
        },
        onToggleWeaponWheel: (open) => {
          setWheelOpen(open);
          runtime.weapons.setWeaponWheelOpen(open);
        },
        onToggleDirector: () => {
          runtime.combat.toggleDirectorMode();
        },
        onOpenActivity: (kind) => {
          setActivityMode(kind);
        },
        onOpenAtm: () => {
          setActivityMode('atm');
        },
      })
      .then(() => {
        setMinimapRotate(runtime.registry.state.minimapRotate);
        setHud(runtime.getHudSnapshot());
        setReady(true);
        hudInterval = window.setInterval(() => {
          setHud(runtime.getHudSnapshot());
        }, 66);
      })
      .catch((err) => {
        setLoadProgress((prev) => ({
          ...prev,
          errors: [...prev.errors, err instanceof Error ? err.message : String(err)],
        }));
      });

    return () => {
      window.clearInterval(hudInterval);
      unsubDied();
      unsubArrested();
      unsubRespawn();
      runtime.dispose();
    };
  }, []);

  const runtime = runtimeRef.current;

  return (
    <div className="relative w-full h-full bg-neutral-950 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block outline-none" />

      {!ready && (
        <LoadingOverlay
          progress={loadProgress}
          onCancelOptional={() => {
            runtime?.assetLoader.cancel();
            setReady(true);
          }}
        />
      )}

      {ready && runtime && hud && (
        <>
          <HudOverlay
            runtime={runtime}
            hud={hud}
            minimapRotate={minimapRotate}
            muted={muted}
            onToggleMinimapRotate={() => {
              const next = !minimapRotate;
              setMinimapRotate(next);
              runtime.registry.state.minimapRotate = next;
            }}
            onOpenWorldMap={() => setMapOpen(true)}
            onOpenPhone={() => {
              const next = !phoneOpen;
              setPhoneOpen(next);
              runtime.registry.state.phoneOpen = next;
            }}
            onOpenWeaponWheel={() => {
              const next = !wheelOpen;
              setWheelOpen(next);
              runtime.weapons.setWeaponWheelOpen(next);
            }}
            onOpenPause={() => {
              setPauseOpen(true);
              runtime.registry.state.pauseMenuOpen = true;
              runtime.registry.clock.setPaused(true);
            }}
            onOpenConsole={() => {
              const next = !consoleOpen;
              setConsoleOpen(next);
              runtime.registry.state.consoleOpen = next;
            }}
            onSwitchCharacter={() => {
              runtime.player.switchCharacter();
              setHud(runtime.getHudSnapshot());
            }}
            onToggleDirector={() => runtime.combat.toggleDirectorMode()}
            onToggleMute={() => {
              const next = !muted;
              setMuted(next);
              runtime.audio.setMuted(next);
            }}
            onInteract={() => runtime.input.triggerVirtualKey('KeyE')}
          />

          <TouchControls input={runtime.input} />

          {phoneOpen && (
            <SmartphoneOverlay
              runtime={runtime}
              onClose={() => {
                setPhoneOpen(false);
                runtime.registry.state.phoneOpen = false;
              }}
            />
          )}

          {wheelOpen && (
            <WeaponWheelOverlay
              runtime={runtime}
              onClose={() => {
                setWheelOpen(false);
                runtime.weapons.setWeaponWheelOpen(false);
              }}
            />
          )}

          {activityMode && (
            <ActivityOverlay
              runtime={runtime}
              mode={activityMode}
              onClose={() => setActivityMode(null)}
              onRefresh={() => setHud(runtime.getHudSnapshot())}
            />
          )}

          {pauseOpen && (
            <PauseMenu
              runtime={runtime}
              onResume={() => {
                setPauseOpen(false);
                runtime.registry.state.pauseMenuOpen = false;
                runtime.registry.clock.setPaused(false);
              }}
              onRefresh={() => setHud(runtime.getHudSnapshot())}
              onOpenWorldMap={() => {
                setPauseOpen(false);
                runtime.registry.state.pauseMenuOpen = false;
                runtime.registry.clock.setPaused(false);
                setMapOpen(true);
              }}
            />
          )}

          {mapOpen && (
            <WorldMapOverlay
              runtime={runtime}
              hud={hud}
              onClose={() => setMapOpen(false)}
              onRefreshHud={() => setHud(runtime.getHudSnapshot())}
            />
          )}

          {consoleOpen && (
            <DevConsole
              runtime={runtime}
              onClose={() => {
                setConsoleOpen(false);
                runtime.registry.state.consoleOpen = false;
              }}
            />
          )}

          {gameOver.mode !== 'none' && (
            <GameOverOverlay
              mode={gameOver.mode}
              fineCents={gameOver.fineCents}
              onRespawn={() => runtime.player.completeRespawn()}
            />
          )}
        </>
      )}
    </div>
  );
}
