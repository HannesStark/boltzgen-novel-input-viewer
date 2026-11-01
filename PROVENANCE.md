# Provenance

The public bundle is a curated, offline coordinate package for the BoltzGen novel-target input comparison. Each record in `data/manifest.json` carries the source identifiers, release date, qualification status, explicit experimental-frame alignment transform, decoded coordinate length, and SHA-256 for both displayed assets.

The predicted coordinates were transformed into the experimental coordinate frame with a deterministic Kabsch fit over observed C-alpha atoms. The browser validates the gzip payload (when delivered compressed), decoded length, and SHA-256 before passing coordinates to Mol*. No network fetch is needed for structure data after the page bundle loads.

Manifest SHA-256: `6551d24ba1bd5569bdc56f73fc40e79e16c461c159bcd56303650a738fb89594`

The production comparison section is intentionally marked pending until the supervised production run publishes its audited six-score results.
