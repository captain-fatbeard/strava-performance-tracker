# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.15.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.14.1...v1.15.0) (2026-04-27)


### Features

* add bike fit page with live pose analysis ([3819fa1](https://github.com/captain-fatbeard/strava-performance-tracker/commit/3819fa1c91e310c3c44836f8f1206b2b663093d2))
* customizable weekly plan with auto-classified phase + CTL-aware recommendations ([22225ba](https://github.com/captain-fatbeard/strava-performance-tracker/commit/22225ba22ebbb3bde5b34c0477629d2fcf35ef75))

### [1.14.1](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.14.0...v1.14.1) (2026-04-25)


### Bug Fixes

* lock auto plan phase to week start so it doesn't flip mid-week ([10a9ba9](https://github.com/captain-fatbeard/strava-performance-tracker/commit/10a9ba9f729d771bb1190569224c568e11ff2b9a))

## [1.14.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.13.0...v1.14.0) (2026-04-22)


### Features

* add plan progress, phase toggle, history, and target details ([cfcd98b](https://github.com/captain-fatbeard/strava-performance-tracker/commit/cfcd98b78b85474b5f8aebb4d1b23e68cced7051))

## [1.13.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.12.0...v1.13.0) (2026-04-20)


### Features

* add training plan page with live targets and weekly template ([2f03046](https://github.com/captain-fatbeard/strava-performance-tracker/commit/2f03046eba5687c7cd8371a30fb42070a37ce66f))

## [1.12.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.11.0...v1.12.0) (2026-04-16)


### Features

* add manual override inputs for Max HR and Resting HR ([2ed8869](https://github.com/captain-fatbeard/strava-performance-tracker/commit/2ed88696befcbf1724f52e408d840c40b83f17e2))
* redesign UI with premium typography, unified top bar, and refined aesthetics ([431d715](https://github.com/captain-fatbeard/strava-performance-tracker/commit/431d715c5426e3773b18eea3db30f9e724db6f71))
* unify color system with vibrant chart palette and themed variables ([a566252](https://github.com/captain-fatbeard/strava-performance-tracker/commit/a566252028cfe069c9dc2a27611dcbfa674d825c)), closes [#fbbf24](https://github.com/captain-fatbeard/strava-performance-tracker/issues/fbbf24)

## [1.11.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.10.1...v1.11.0) (2026-04-14)


### Features

* show streak motivation message on day streak card ([0302af6](https://github.com/captain-fatbeard/strava-performance-tracker/commit/0302af67feb1294bfc6dc6f061a9e9d48c53dd61))

### [1.10.1](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.10.0...v1.10.1) (2026-04-09)


### Bug Fixes

* use all activities for week streak calculation instead of time-range-filtered ([b8b29d4](https://github.com/captain-fatbeard/strava-performance-tracker/commit/b8b29d4067922735d6f5a74fb9e3c015513693f5))

## [1.10.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.9.0...v1.10.0) (2026-04-07)


### Features

* add weight slider to VO2max card for what-if estimation ([c0436c1](https://github.com/captain-fatbeard/strava-performance-tracker/commit/c0436c16b7f61fb803454df4277c0f214e93b667))
* show avg duration as primary value in Avg/Week card with activities and distance as sub values ([1cbde56](https://github.com/captain-fatbeard/strava-performance-tracker/commit/1cbde56f7b5c001e878648d14843862547334526))

## [1.9.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.8.0...v1.9.0) (2026-04-06)


### Features

* add day streak and weekly streak continuation status ([bd97c22](https://github.com/captain-fatbeard/strava-performance-tracker/commit/bd97c22b562a982f98b3988f8e84c88be599ad38))
* add shared RangeSelector to Weight History and Fitness charts ([9581a49](https://github.com/captain-fatbeard/strava-performance-tracker/commit/9581a498ccc9b73a4b41083ccda632ea50c50bf0))
* merge activity consistency into weekly training load ([614d0d7](https://github.com/captain-fatbeard/strava-performance-tracker/commit/614d0d70752f5fcea3c31b01666b5e98f091dddd))


### Refactoring

* extract shared utilities and reduce code duplication ([43b427c](https://github.com/captain-fatbeard/strava-performance-tracker/commit/43b427c5d4fe7e4743672bc34d1cfd85421d99a2))

## [1.8.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.7.0...v1.8.0) (2026-04-04)


### Features

* use date-based FTP estimation for stable CTL calculation ([d1eea3b](https://github.com/captain-fatbeard/strava-performance-tracker/commit/d1eea3b1fcbbb18f5bb3cb4589f3f933c5549adf))

## [1.7.0](https://github.com/captain-fatbeard/strava-performance-tracker/compare/v1.6.0...v1.7.0) (2026-04-02)


### Features

* add name search and sortable columns to activity list ([b78e5ea](https://github.com/captain-fatbeard/strava-performance-tracker/commit/b78e5eab68fb227f25de447067130e8ded2eaf77))
* add vitest testing setup with CI workflow ([fa689cd](https://github.com/captain-fatbeard/strava-performance-tracker/commit/fa689cdc20cc22da6032c93efba122f6e44d8ba7))
* improve activity grouping UX with toggle mode and category enforcement ([ebdd757](https://github.com/captain-fatbeard/strava-performance-tracker/commit/ebdd7571a8e258281d74005c2b6027ec450da3f2))

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
