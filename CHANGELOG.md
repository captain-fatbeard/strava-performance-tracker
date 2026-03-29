# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.6.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.5.0...v1.6.0) (2026-03-29)


### Features

* add activity grouping to merge activities into one ([a709527](https://github.com/captain-fatbeard/strava-performance-tracker/commit/a7095272bfb29b9042311301d9940b2a0ba1adfd))

## [1.5.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.4.0...v1.5.0) (2026-03-27)


### Features

* move Activities to last position in nav bar ([cbd23d8](https://github.com/captain-fatbeard/strava-performance-tracker/commit/cbd23d81361b7da1134aad432d8b8c1b50f7c7c9))


### Bug Fixes

* prevent session loss on Strava sync failure ([2a63dbb](https://github.com/captain-fatbeard/strava-performance-tracker/commit/2a63dbbe8b4c92a19659c5e569dabbe539393217))

## [1.4.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.3.0...v1.4.0) (2026-03-24)


### Features

* replace exclude mechanism with training/performance activity categories ([0fc57cc](https://github.com/captain-fatbeard/strava-performance-tracker/commit/0fc57cc1f11346dd3c911f6b5fb5e9e71f292885))

## [1.3.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.2.0...v1.3.0) (2026-03-23)


### Features

* add Records page with personal records, power records, best efforts, and popular segments ([6dbd8bd](https://github.com/captain-fatbeard/strava-performance-tracker/commit/6dbd8bdac4c24d320596658eed97bc67a52bae17))

## [1.2.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.1.1...v1.2.0) (2026-03-20)


### Features

* add ride score column to activity list ([943b137](https://github.com/captain-fatbeard/strava-performance-tracker/commit/943b1373ddde8feac14604a7425af558195693c8))
* add trend line connecting dots on Power Sustainability chart ([bd5508a](https://github.com/captain-fatbeard/strava-performance-tracker/commit/bd5508a0c97b9ff5705404bea3b42f8da6d6de7b))

### [1.1.1](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.1.0...v1.1.1) (2026-03-19)


### Bug Fixes

* resolve Invalid time value error on performance page ([851a5d7](https://github.com/captain-fatbeard/strava-performance-tracker/commit/851a5d791a48b12eaf442efc38e6e74756ccf064))

## 1.1.0 (2026-03-19)


### Features

* add activity scoring with effort vs terrain analysis ([58b4b6b](https://github.com/captain-fatbeard/strava-performance-tracker/commit/58b4b6b2bd9adde6dc08ee4086c63411274fcd1a))

## [1.0.0] - 2025-02-22

### Features

- **Dashboard:** Overview page with stats cards, personal records, and key metrics (FTP, W/kg, avg power, avg HR)
- **Training:** Fitness & Form chart (CTL/ATL/TSB), power zones distribution, weekly training progress
- **Health:** Weight tracking with history chart, heart rate insights, activity insights with VO2max categories
- **Performance:** Cycling metrics (efficiency, power trends, climbing speed), running metrics (pace, cadence, VO2max)
- **Activities:** Searchable activity list with detail pages, interactive maps, and per-activity charts
- **Strava Integration:** OAuth login, paginated activity sync, full history "Sync All" with rate limiting
- **Data Persistence:** Supabase for settings sync, weight entries, activity caching, and excluded activities
- **Responsive Design:** Mobile nav drawer, responsive grids, sidebar/drawer settings panel
- **Customization:** Configurable time ranges, activity type filters, activity exclusion from stats
- **Analytics Engine:** FTP estimation, TSS/CTL/ATL/TSB calculations, power zones, HR zones, personal records
- **UI/UX:** Dark theme with teal/cyan accents, animated charts, gradient text, modal dialogs
