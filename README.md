# Watch Shape Editor

[![CI](https://github.com/cedernaes/monkey-c-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/cedernaes/monkey-c-generator/actions/workflows/ci.yml)

Draw icons and other shapes for Garmin Connect IQ watch faces, and copy them as
Monkey C drawing calls.

**Use it at <https://cedernaes.com/monkey-c-generator/>**

Watches draw without anti-aliasing, so the editor shows your shapes on the
watch's own pixel grid, inside the outline of a round, semi-round or
rectangular screen. What you draw becomes `fillPolygon`, `fillRectangle`,
`fillRoundedRectangle`, `fillCircle` and `drawLine` calls.

## Features

- **Tools:** polygon, rectangle, rounded rectangle, circle and line, plus select
  and move. Each has a one-key shortcut (`V` `P` `R` `U` `C` `L`).
- **Editing:**
  - Drag shapes to move them, and drag their handles to reshape.
  - On polygons, double-click an edge to add a point and Alt-click a point to
    remove it.
  - The properties panel has number fields for exact positions.
  - Arrow keys nudge the selected shape; hold Shift for 10× the step.
  - The shape list works like layers, with the front shape at the top. Drag
    shapes in it to reorder them.
  - Undo and redo.
- **Screens:** presets for common screen sizes, or a custom size and shape.
  Snapping to 1 or 0.5 px.
- **Guides:** shapes that are drawn in the editor but left out of the code, for
  showing the rest of your watch face while you draw.
- **Reference image:**
  - Load or paste an image, such as a simulator screenshot, to trace over.
  - It stays locked in place while you draw.
  - **Adjust image** lets you move, resize and crop it.
  - It can be shown under or on top of the shapes.
- **Code in three styles:**
  - **Design grid:** calls `gx()`/`gy()`/`sz()` helpers, so the shapes scale to
    other screens. The editor shows the helpers to paste into your view.
  - **Screen pixels:** plain numbers.
  - **Function with an origin:** wraps the shapes in a function like
    `drawIcon(dc, x, y, s)` that draws them at any position and scale.
- **Saving:**
  - Your drawing is saved in the browser.
  - **Save** and **Open** read and write `.json` files.

The pixel preview is close to what a watch draws but not guaranteed to match
every edge pixel. Check the final result in the Connect IQ simulator.

## Privacy

The editor runs entirely in your browser. Nothing you draw and no image you
load is sent to a server. Your drawing and settings are kept in your browser's
local storage; reference images aren't saved at all. **Save** and **Open** read
and write files on your own computer.

## Development

Needs Node.js 22.12 or newer.

```sh
npm install
npm run dev        # http://localhost:5173
```

| Command            | What it does                               |
| ------------------ | ------------------------------------------ |
| `npm run dev`      | Start the dev server with hot reload       |
| `npm test`         | Run the unit and smoke tests once (Vitest) |
| `npm run test:watch` | Run the tests on every change            |
| `npm run lint`     | Lint with oxlint                           |
| `npm run typecheck` | Type-check with TypeScript                |
| `npm run build`    | Type-check and build into `dist/`          |
| `npm run preview`  | Serve the built app                        |

### Layout

```
src/
  model/        Plain TypeScript, no React: shapes, geometry, pixel
                rasterising, Monkey C code generation, the file format.
                Unit-tested.
  state/        Undo/redo reducer, browser storage, file helpers
  render/       Draws the scene onto the canvas
  components/   React components: canvas, panels, fields
  App.tsx       Wires state, keyboard shortcuts and panels together
```

## CI and deployment

`.github/workflows/ci.yml` lints, type-checks, tests and builds every push and
pull request. For pushes to `main`, it then publishes the build to GitHub Pages
at `https://<user>.github.io/<repo>/`, or the owner's custom domain. The
workflow sets Vite's base path to the repository name.

The repository needs Pages enabled once, with **Settings → Pages → Source:
GitHub Actions**.

## License

[GNU Affero General Public License v3.0](LICENSE). If you run a modified version
for others to use over a network, the license asks you to offer them its source
code. The app links to its source in the header.
