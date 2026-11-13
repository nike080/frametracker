# FrameTracker

A personal Warframe collection tracker for planning builds, farming parts, and keeping track of Platinum spending. Track standard and Prime Warframes, their blueprints and components, crafting materials, and Prime relics in one place.

FrameTracker is an early version looking for player feedback. English and Russian are available on every page through the **RU / EN** switch in the top-right corner. The default language is Russian; your browser remembers your choice for the current app address.

## Download for Windows

**[Download FrameTracker.exe](https://github.com/nike080/frametracker/releases/latest/download/FrameTracker.exe)** · [Release notes and downloads](https://github.com/nike080/frametracker/releases/latest)

Requires **Windows x64**. No installation or Node.js is needed.

1. Download `FrameTracker.exe` using the link above.
2. Double-click it. The app starts locally and opens in your browser.
3. Select **EN** in the top-right corner for English.
4. Keep the FrameTracker window open while using the app; close it to exit.

The executable is unsigned, so Windows may display a warning. Progress is stored in `%LOCALAPPDATA%\FrameTracker`. To update, close the old app and replace the EXE with the new download. Use **Data → Export progress** to back up your collection or move it to another PC.

## Run from source

Requires **Node.js 24**. No dependency installation is needed to run the app.

```sh
npm start
```

Open [http://127.0.0.1:4187/](http://127.0.0.1:4187/) in your browser. Keep the terminal open while using FrameTracker; press Ctrl+C to stop it.

## What you can track

- Your collection of standard, Prime, and Umbra Warframes.
- Blueprints, components, crafting requirements, and manually entered material stock.
- Farming locations and Prime relic information from the bundled catalog.
- Prime component and set price estimates from Warframe.market.
- Collection totals and Platinum spending, with JSON progress export and import.

This is a manual tracker: it does not connect to your Warframe account or automatically read your in-game inventory.

## Windows portable build

To build a standalone executable on **Windows x64 with Node.js 24**:

```sh
npm ci
npm run build:win
npm run test:win
```

Double-click `dist/FrameTracker.exe`. FrameTracker opens in your browser. Keep its window open while using the app and close it to exit. The executable is unsigned, so Windows may display a warning when it is downloaded.

The portable app stores progress and cached prices in `%LOCALAPPDATA%\FrameTracker`. To update, close the old instance and replace the executable. Moving the executable to another folder keeps your data available under the same Windows account.

## Your progress

### Live Prime availability

Prime cards show whether all, some, or none of their parts have relics in the current rotation, including the main blueprint. Use **Show** to filter availability or Prime Resurgence, and **Order** to put available Primes first. Open a card for per-part relic names, known acquisition locations, and Varzia offerings for regular Aya. This describes the full set, independently of your collection progress.

The local server combines the public [WFCD relic database](https://github.com/WFCD/warframe-items) with the [official Warframe worldstate](https://api.warframe.com/cdn/worldState.php). It excludes premium Regal Aya bundles. Data is fetched on opening, every five minutes while visible, and when returning to the tab. **Refresh availability** requests an update, limited to once per minute. The interface shows when each source was fetched and the current Varzia rotation end. WFCD can lag behind game changes; mission access and event conditions still apply.

**Vaulted does not mean purchase-only:** old relics can still be opened, traded, or used by squadmates. Missing, failed, expired or stale source data produces an unconfirmed status. Cached clues remain visible with a warning. The disposable `availability.json` cache is separate from player progress; no Warframe login or inventory access is involved.

### Personal goals

The catalog now includes **Continue collecting**: each active goal shows an explained next step, source details where known, all remaining material requirements, and a personal note. Start with one frame; a full inventory is not required. Notes and the latest recorded change survive restarting and progress export/import.

An empty stock field means **unknown**, while an explicitly entered `0` means a known empty stock. Clear a quantity to mark it unknown again. Advice asks you to check unknown stock instead of claiming a confirmed shortfall. Previously omitted quantities cannot be recovered as known zeros.

Record blueprint acquisition or a crafted component directly from the goal plan. For a known material stock, **Add loot quantity** adds a nonnegative integer. Recording a crafted item does not deduct materials: update remaining stock manually after crafting. Advice follows recipe order, does not reserve stock between goals, and does not claim to be the optimal route.

Source details are based on the bundled catalog snapshot dated **2026-11-10**. Known locations/rotations are displayed; additional requirements and current availability may need checking. Missing relic mission records do not prove a relic is unavailable. Run `node scripts/check-catalog.mjs` to inspect reference errors and source warnings; catalog updates run the same check before replacing the catalog.

Open a Warframe and select **Collect next** to add it to **My goals** in the catalog. Reorder or remove goals there; completed goals stay visible until removed. Ordering does not reserve resources.

Inventory opens in **My goals** mode, showing combined requirements for selected frames and subtracting shared stock once. Switch to **Entire collection** for the original overview. Existing saves start with no goals; goals are included in new exports and imports.

**Undo change** restores the state before the latest progress change, including a goal edit or import. One undo is available during the current session; reloading clears undo history. Resource stock remains manual: marking a component crafted does not deduct materials automatically.

When running from source, progress is saved in your browser for the current app address. Use **Data → Export progress** to make a JSON backup and **Import progress** to restore it or move it to another browser or computer.

The portable build stores progress in your Windows profile. Existing browser progress is migrated automatically when you first open the portable app at the same address in the same browser profile. If the browser or port changes, export progress from the old instance and import it into the new one. The Data menu shows the save status.

The app runs locally. Network requests are used for market prices and externally hosted portraits; updating the catalog also downloads data from its sources.

## Prices and material totals

Opening a Prime Warframe loads component and set prices. In **Summary**, choose **Load prices** to fetch prices across the catalog. The first full load can take several minutes.

Prices estimate the average of up to five of the cheapest active PC crossplay sell offers and are cached for one day. They are estimates, not guaranteed trade prices. The summary shows price coverage and estimates the cost of collected Prime Warframes at current prices unless you enter the actual amount spent.

Material totals cover unfinished recipes. Completed components remove their recipes from the remaining requirements. Inventory quantities are entered manually. Crafted ingredients used by other recipes, such as Volt Neuroptics for Chroma, have separate inventory entries.

## Feedback and bug reports

Please open a GitHub issue with:

- What you were trying to do, what happened, and what you expected.
- Steps to reproduce the problem.
- Your operating system, browser, and whether you used the source or portable build.
- For catalog problems, the Warframe, component, relic, or material involved and the catalog version shown in the app.

Screenshots are helpful. Review exported progress before sharing it publicly; it includes your collection and manually entered data. Feedback on the English translation, farming information, progress saving, and usability is especially welcome.

## Development

```sh
npm test
```

To refresh the bundled catalog:

1. Check the target PC game version against the [Warframe patch notes](https://www.warframe.com/en/patch-notes).
2. Run `npm ci` to install the manifest-reading and build tools.
3. Run `npm run update-catalog -- <version>`. This downloads current source data and prints changes relative to the saved snapshot. The argument labels the verified version; it does not download a historical patch.
4. Review warnings and changes in `public/catalog.json`, run `npm test`, and restart the app. Check saved-progress migration if game identifiers change.

The snapshot records the game version, update date, and official recipe manifest name. Farming locations and drop chances may lag behind game patches until upstream sources update.

Requirements and implementation notes are kept in `openspec/`.

## Data sources and credits

- [Digital Extremes Public Export](https://origin.warframe.com/PublicExport/index_en.txt.lzma) for official recipe data.
- [WFCD warframe-items](https://github.com/WFCD/warframe-items) for catalog data and the WFCD CDN for portraits.
- [WFCD warframe-drop-data](https://github.com/WFCD/warframe-drop-data) for drop tables.
- [Warframe.market](https://warframe.market/) for market price estimates.

FrameTracker is an unofficial fan project and is not affiliated with or endorsed by Digital Extremes or Warframe.market. Warframe and its associated assets belong to their respective owners.
