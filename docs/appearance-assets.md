# Appearance assets

Faction names, emblems and Warframe imagery belong to Digital Extremes. Emblems were retrieved from the public Warframe Wiki image archive on 2026-11-13 and embedded in public/themes.js. They are decorative identity marks, used as monochrome masks without altering their outlines. This fan application is not affiliated with Digital Extremes.

The 23 palettes and bilingual thematic mottos are original UI interpretations, not official color standards or quotations. Themes without a retrieved emblem use the existing FrameTracker mark. No additional remote image request is needed to render a theme. Existing frame portraits retain their WFCD CDN source.

## Material icons (FT-17)

All 127 catalog materials have locally bundled official PNGs in `public/material-icons.json`, downloaded from Digital Extremes Public Export. Each `icons[id]` entry records the material name, official `manifestId`, exact hashed `source` URL and embedded image. The snapshot also records retrieval time, index URL and manifest URL. These assets belong to Digital Extremes.

The synthetic catalog ID `credits` uses the official daily CollectCredits emblem; its white artwork has a dark backing for visibility in light themes. All other materials match their catalog IDs directly. Images are shown without cropping or recoloring.

Refresh with `node scripts/update-material-icons.mjs` after updating the catalog. This downloads the official index, resolves ExportManifest.json and validates all PNGs before replacing the snapshot. Material imagery needs no runtime network connection; missing images use a neutral placeholder while text remains available. The snapshot is about 10.1 MB and is included by the Windows build script.

## Embedded emblem source links

| Asset | Source |
| --- | --- |
| SteelMeridian | [Original image](https://static.wikia.nocookie.net/warframe/images/3/31/SteelMeridianSigil.png) |
| SolarisUnited | [Original image](https://static.wikia.nocookie.net/warframe/images/d/d5/SolarisUnitedSigil.png) |
| PerrinSequence | [Original image](https://static.wikia.nocookie.net/warframe/images/c/c1/PerrinSequenceSigil.png) |
| CephalonSimaris | [Original image](https://static.wikia.nocookie.net/warframe/images/5/5e/CephalonSimarisSigil.png) |
| Ostron | [Original image](https://static.wikia.nocookie.net/warframe/images/8/80/OstronSigil.png) |
| Necraloid | [Original image](https://static.wikia.nocookie.net/warframe/images/2/28/NecraloidSigil.png) |
| Conclave | [Original image](https://static.wikia.nocookie.net/warframe/images/d/d9/ConclaveSigil.png) |
| VoxSolaris | [Original image](https://static.wikia.nocookie.net/warframe/images/c/cb/VoxSolarisIcon.png) |
| Hex | [Original image](https://static.wikia.nocookie.net/warframe/images/2/29/HexIcon.png) |
| Ventkids | [Original image](https://static.wikia.nocookie.net/warframe/images/e/e2/VentkidsIcon.png) |
| Entrati | [Original image](https://static.wikia.nocookie.net/warframe/images/9/9f/EntratiIcon.png) |
| Nightwave | [Original image](https://static.wikia.nocookie.net/warframe/images/c/ca/Nightwave.png) |
| RedVeil | [Original image](https://static.wikia.nocookie.net/warframe/images/c/c4/RedVeilSigil.png) |
| NewLoka | [Original image](https://static.wikia.nocookie.net/warframe/images/8/8f/NewLokaSigil.png) |
| CephalonSuda | [Original image](https://static.wikia.nocookie.net/warframe/images/c/cb/CephalonSudaSigil.png) |
