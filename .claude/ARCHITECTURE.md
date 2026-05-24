# UI Architecture — Signal Relay

## Component tree

```
home.tsx
└── <LandingPage onStart />               src/ui/LandingPage.tsx

main.ts
└── render(<GameUI ref />, #ui-root)
    ├── <CockpitHUD ref />                src/ui/CockpitHUD.tsx
    │   ├── top-bar (elapsed, systemId, progress)
    │   ├── <MFD ref />  ×2              src/ui/MFD.tsx
    │   │   └── <*View ref data />        src/ui/mfd/views/
    │   ├── <SimParamsPanel />            src/ui/cockpit/SimParamsPanel.tsx
    │   ├── <PredictionPanel />           src/ui/cockpit/PredictionPanel.tsx
    │   ├── <FlightControlsPanel />       src/ui/cockpit/FlightControlsPanel.tsx
    │   ├── <HeadingPanel />              src/ui/cockpit/HeadingPanel.tsx
    │   └── <StatusPanel ref />           src/ui/cockpit/StatusPanel.tsx
    ├── <GalaxyMap visible onTransit />   src/ui/GalaxyMap.tsx
    ├── <TechTree visible onUpgrade />    src/ui/TechTree.tsx
    ├── <SimulationHUD />                 src/ui/SimulationHUD.tsx
    ├── <DebugPanel />                    src/ui/DebugPanel.tsx
    └── <ControlsPanel />                 src/ui/ControlsPanel.tsx
```

## Reactivity

All live game state is in **`src/core/gameSignals.ts`** as `@preact/signals` signals.
The 60-fps game loop writes to signals; components read them automatically.

Canvas components (StatusPanel, GalaxyMap, TechTree) expose a `.draw(data)` method
via `useImperativeHandle`. The game loop calls these directly for frame-accurate drawing.

## SCSS co-location

Each `Foo.tsx` imports `./Foo.scss` at the top.
`Foo.scss` uses CSS custom properties (`var(--cyan)`, etc.) directly — no `@use` needed.
To `@use` a Sass module, use `@use 'abstracts/variables'` (resolved via `includePaths: ['src/scss']` in vite.config).

Global styles (reset, typography, base) remain in `src/scss/main.scss` and are imported
once in `main.ts` and `home.tsx`.

## Mounting entry points

| HTML        | Entry        | Root element |
|-------------|--------------|--------------|
| index.html  | src/home.tsx | `#landing`   |
| simulation.html | src/main.ts | `#ui-root`  |
| docs.html   | src/docs/main.tsx | `#docs-root` |

## FloatingWindow

`<FloatingWindow title minWidth minHeight>` wraps any draggable/resizable panel.
Used by: SimulationHUD, DebugPanel, ControlsPanel.
Source: `src/systems/FloatingWindow.tsx`.
