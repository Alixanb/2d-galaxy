# SCSS Architecture

Modular feature-based SCSS structure located in `src/scss/`. The project uses modern Sass with `@use` and `@forward`.

## Directory Structure

- `abstracts/`: Non-rendering SCSS. Contains variables, mixins, and animations.
- `base/`: Global styles, reset, and typography.
- `features/`: Logic grouped by UI module.
    - `cockpit/`: HUD and cockpit controls.
    - `hud/`: Simulation and floating window styles.
    - `landing/`: Landing page and SEO.
    - `docs/`: Documentation page layout and components.
- `main.scss`: Central entry point that imports all modules.

## Usage

Files are linked directly in HTML for Vite to process:
`<link rel="stylesheet" href="/src/scss/main.scss" />`
