# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.19.1] - 2026-02-16

### Changed

- **[MAJOR]** E2E test suite cleanup - reduced from 80 files to 6 core files (#63)
  - Test files: 80 → 6 (↓ 92.5%)
  - Test cases: 1,439 → 172 (↓ 88%)
  - CI runtime: 60+ min → <10 min (↓ 83%)
  - Maintained 100% critical path coverage
  - Archived 78 redundant test files to `archive/deleted-tests/`

### Added

- **TESTING.md** - Comprehensive testing guide with philosophy and guidelines (#63)
  - E2E test philosophy (user journeys, no mocking, mobile-first)
  - The 6 core test files documentation
  - Test migration guidelines (unit vs integration vs E2E)
  - Contributing guidelines for new tests

- **Strict E2E test limit rule** - Maximum 10 E2E tests per feature (mandatory) (#63)
  - Prevents future test suite bloat
  - Enforces proper test layering (E2E for journeys, unit for logic)
  - Documented in CLAUDE.md as critical requirement

- **E2E test cleanup documentation** (#63)
  - E2E-TEST-CLEANUP-PLAN.md - Detailed cleanup strategy
  - E2E-TEST-CLEANUP-FINAL-SUMMARY.md - Complete project summary
  - E2E-TEST-CLEANUP-PHASE-4-VALIDATION.md - Coverage validation

### Fixed

- Build: Remove server-only imports from client components (45bdb2a)
- Cron debug: Update force-process endpoint to use content_items table (593164f)

### Documentation

- Update `/ship` command to clarify E2E tests run only on CI/CD, not locally (8814a94)
- Update CLAUDE.md testing strategy with new test counts and limits (186feee)

---

## [0.19.0] - 2026-02-14

### Added

- Replace custom drum picker with shadcn time picker components (db2f6a4)
  - Upgraded shadcn/ui: 0.18.2 → 0.19.0
  - Improved time selection UX

- Show post ID in cards for developer users (ea3dbdb)
  - Better debugging for developers

---

## [0.16.0] - 2026-02-10

### Added

- E2E environment isolation + cron debug logs (#60)

---

## Previous Releases

See [GitHub Releases](https://github.com/PiotrRomanczuk/instagram-stories-webhook/releases) for releases v0.15.0 and earlier.

---

[Unreleased]: https://github.com/PiotrRomanczuk/instagram-stories-webhook/compare/v0.19.1...HEAD
[0.19.1]: https://github.com/PiotrRomanczuk/instagram-stories-webhook/compare/v0.19.0...v0.19.1
[0.19.0]: https://github.com/PiotrRomanczuk/instagram-stories-webhook/compare/v0.16.0...v0.19.0
[0.16.0]: https://github.com/PiotrRomanczuk/instagram-stories-webhook/releases/tag/v0.16.0
