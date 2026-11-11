# FrameTracker

A personal Warframe collection tracker for planning builds, farming parts, and keeping track of Platinum spending. Track standard and Prime Warframes, their blueprints and components, crafting materials, and Prime relics in one place.

FrameTracker is an early version looking for player feedback. English and Russian are available on every page through the **RU / EN** switch in the top-right corner. The default language is Russian; your browser remembers your choice for the current app address.

## Try it from source

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
