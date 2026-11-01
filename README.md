# BoltzGen novel-target input comparison

Public, read-only Mol* viewer for the curated experimental/predicted structural inputs used in the BoltzGen novel-target comparison. The viewer exposes an explicit overlay transform, target qualification labels, confidence metrics, and provenance for each displayed coordinate asset.

## Viewer

Open the [interactive viewer](https://hannesstark.github.io/boltzgen-novel-input-viewer/) or a target directly, for example [9x86_A overlay](https://hannesstark.github.io/boltzgen-novel-input-viewer/?record=9x86_A&view=overlay).

The blue structure is the experimental coordinate frame and the orange structure is the predicted coordinate frame after the recorded rigid alignment. The site reports the alignment convention, RMSD, asset hashes, PDB release date, selection status, and measured prediction-quality gates.

## Scientific scope

The manifest contains 13 post-cutoff candidate targets. Ten are frozen for the comparison; one fails the measured accuracy gate and two qualified candidates are retained as non-selected audit context. The production six-score comparison is marked pending until the supervised 4,000-attempt run is complete.

This site contains curated structure coordinates and metadata only. It does not expose raw datasets, credentials, internal paths, or unpublished production outputs.

## Reproducibility

- Website manifest SHA-256: `6551d24ba1bd5569bdc56f73fc40e79e16c461c159bcd56303650a738fb89594`
- Mol* dependency: 4.18.0
- Build source and browser tests are under [`source/`](./source/).
- Coordinate assets are gzip-compressed and independently hash-checked by the browser before rendering.

The public deployment is built from the repository `main` branch with GitHub Pages.
