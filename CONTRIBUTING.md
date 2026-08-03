# Contributing

Thank you for helping Magic Mouse Movements grow.

## Before opening a pull request

1. Keep the rendering core dependency-free.
2. Include a neutral demonstration scene and complete setup guidance.
3. Preserve keyboard access, native cursor restoration, reduced motion, coarse pointer, and data saver behavior.
4. Destroy observers, listeners, animation frames, canvases, and WebGL resources during cleanup.
5. Run `npm run verify`.

New movements should follow the shared lifecycle in `src/core/types.ts` and include standalone HTML plus React examples in their kit README.
