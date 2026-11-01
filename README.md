# BoltzGen novel-target input comparison

[Open the public Mol* viewer](https://hannesstark.github.io/boltzgen-novel-input-viewer/) · [9x86_A aligned overlay](https://hannesstark.github.io/boltzgen-novel-input-viewer/?record=9x86_A&view=overlay)

Thirteen candidate targets are shown with measured qualification labels: ten in the frozen panel, two qualified but unselected, and one rejected for measured accuracy. Blue is experimental and orange is predicted, aligned offline with recorded correspondence and transforms.

The final comparison contains 4,000 attempts across forty cells; all six endpoints are present and independently audited. The site includes six-score PDF/PNG figures, paired target-level estimates and intervals, per-target plots, counts and provenance. Predicted inputs increased binder pTM in both modalities and slightly reduced nanobody hydrogen-bond counts. The other nine endpoint/modality intervals included zero. This is a computational comparison conditioned on accurate target predictions, not evidence of experimental binding success or equivalence. Pointwise intervals are unadjusted across comparisons.

See [methods and results](data/results/methods_and_results.md) and [result provenance](data/results/provenance.json). The authoritative attempt data and operational evidence are retained separately; the public site contains only curated structural and comparison assets.

## Rebuild

Mol* is pinned to 4.18.0. From the repository root:

```sh
mkdir -p source/public
cp -R data source/public/
cd source
npm ci
SITE_BASE=/boltzgen-novel-input-viewer/ npm run build
SITE_BASE=/boltzgen-novel-input-viewer/ npm test
```

Copy the contents of `source/dist/` into the repository root to update the static snapshot. The source public staging directory and dependencies are not tracked. GitHub Pages serves `main:/`.

The build validates all thirteen records, twenty-six compressed coordinate assets and every final-result checksum. Five Chromium tests cover overlays and history, rejected labels, mobile overflow, final figures/downloads and visible coordinate errors.

Website manifest SHA-256: `ba95d90b0963f5618b3fd9a0c6decab160e7085bd608d53b3af3383086686542`.
