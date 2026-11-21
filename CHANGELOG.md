# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/), [SemVer](https://semver.org/)

## [Unreleased]

### Added
- **main**: Favicon set (ico, 16/32 PNG, apple-touch, Android icons) and web manifest

### Changed
- **main**: Satoshi is the only font; Inter Tight and the Google Fonts request removed
- **build**: Pin Node to 24.x via package.json engines
- **readme**: Add project README

## [0.1.0] - 2026-11-21

### Added
- **main**: One-page scroll story (hero, galaxy convergence, about, stack, experience, education) in Astro + three.js + GSAP, with Vitest and Playwright checks
### Changed
- Brand brief, glossary, stack ADR (Astro over Next.js) and agent docs
### Fixed
- **main**: Galaxy no longer crashes under reduced motion (render scheduler declared before first resize)
