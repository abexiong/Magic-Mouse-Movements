# Contributing

Thank you for helping Magic Mouse Movements grow. Contributions are welcome when they make a movement easier to understand, safer to integrate, more accessible, or more useful in a real website.

## Choose the right contribution path

- Report a reproducible problem with the bug report form.
- Propose a new movement with the movement proposal form before investing in a complete implementation.
- Suggest a documentation repair with the documentation form.
- Report security vulnerabilities privately through GitHub Security Advisories. Do not open a public issue for a vulnerability.

Submitting an issue or pull request does not grant repository write access. Maintainers review every proposed change and decide whether it should be revised, closed, or merged.

## Local development

1. Fork the repository on GitHub.
2. Clone your fork and create a focused branch.
3. Install dependencies with `npm ci`.
4. Make one cohesive change.
5. Run `npm run verify`.
6. Push the branch to your fork and open a pull request against `main`.

Keep pull requests focused. Separate unrelated repairs, new movements, and large documentation rewrites so they can be reviewed independently.

## Requirements for every pull request

1. Explain the user need and the behavior that changed.
2. Include or update tests for material behavior.
3. Preserve keyboard access, native cursor restoration, reduced motion, coarse pointer, and data saver behavior.
4. Destroy observers, listeners, animation frames, canvases, and WebGL resources during cleanup.
5. Use only assets and source material you own or have permission to contribute under the MIT License.
6. Do not include private paths, credentials, client material, or unpublished personal content.
7. Run `npm run verify` and report the result in the pull request.

## Requirements for a new movement

New movements must:

- Solve a clear interaction or communication use case.
- Keep the rendering core dependency-free.
- Follow the shared lifecycle in `src/core/types.ts`.
- Include a neutral demonstration scene that makes the use case understandable.
- Include standalone HTML and React guidance in the kit README.
- Document configuration, accessibility behavior, fallbacks, and cleanup.
- Add the movement to the catalog and preserve the existing public export structure.

## Review and merge process

GitHub Actions runs the `verify` job on every pull request. The job installs the locked dependencies, type-checks, builds, and tests the package. A maintainer may request changes or additional evidence before merging.

Only a maintainer can merge into `main`. Open conversations must be resolved and the required verification check must pass. The repository owner retains an emergency ruleset bypass for recovery, but normal changes should use a pull request.
