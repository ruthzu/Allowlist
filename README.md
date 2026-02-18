# WebTime Tracker Pro (React + shadcn/ui)

A modern Chrome extension to track your website usage, set daily limits, and visualize your data using a professional React-based UI.

## Features
- **Website Usage Tracking:** Monitor time spent on different websites.
- **Daily Limits:** Set daily usage limits for specific sites.
- **Hourly Chime:** Receive a notification every hour on the hour.
- **Sleep Reminder:** Receive a gentle reminder to rest during late-night hours (23:00 - 05:00).
- **Data Visualization:** View usage statistics with interactive charts.
- **Data Export:** Download your usage data as JSON.

## Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI)
- **Charts:** Recharts

## Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the extension:
   ```bash
   npm run build
   ```
   (Or use `npx vite build` for now)

## Installation
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the **`dist`** folder in this project directory.

## Usage
- Click the extension icon to see your stats.
- Click **Settings** to set time limits for websites.
- Click **Export JSON** to download your data.

## Note on Icons
This version does not include physical icon files. Chrome will display a default icon based on the extension name. To add custom icons, place `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` directory.
