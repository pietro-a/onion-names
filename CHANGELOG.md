# Changelog

All notable changes to OnionNames are documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and version numbers follow [Semantic Versioning](https://semver.org/).

## [0.2.0] - Unreleased

### Added
- Export all mappings to a versioned JSON backup file.
- Import versioned JSON mapping files, merging additions and updates with existing mappings.
- Copy buttons for onion addresses.
- Automated tests for mapping file validation, export, and import merging.

## [0.1.0] - 2026-11-21

### Added
- Local `.alt` aliases for Tor onion services.
- Mapping management with add, edit, delete, and alias-only search.
- Local request rewriting with fail-closed handling for unknown aliases.
- Firefox/Tor Browser WebExtension support.
