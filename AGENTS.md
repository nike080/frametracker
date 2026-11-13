# Project working notes

- Make changes on a dedicated `codex/` branch; do not commit or push directly to main. Merge only when requested.
- For browser testing, start the app with `npm start -- --no-browser`. If the usual port is occupied or unresponsive, use a free PORT (for example 4190) and open that address in the internal browser.
- Stop the application processes started for testing when done. Rebuild `dist/FrameTracker.exe` for the user when requested; run the portable smoke check and close its processes as well.
