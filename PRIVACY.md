# Privacy Policy

**Last updated: November 17, 2026**

OnionNames is a browser extension for creating local, human-readable aliases for Tor onion services. It processes alias mappings and matching browser requests locally. It does not collect or transmit user data.

## Data collection and transmission

OnionNames does not collect, sell, share, or transmit personal data, browsing history, usage analytics, diagnostics, or alias mappings to the developer or to any third-party service. It contains no analytics, telemetry, advertising, or remote lookup service.

The extension declares Firefox's `data_collection_permissions.required` as `["none"]` to indicate that it does not collect or transmit data.

## Information processed locally

To provide its functionality, OnionNames:

- Stores the aliases and corresponding v3 onion hostnames you create in the browser's `storage.local`.
- Observes browser requests whose hostnames end in `.alt`, using the permissions requested in the extension manifest.
- Reads the requested hostname to find the matching local alias. For a known alias, it replaces the hostname with the mapped onion hostname while preserving the rest of the URL. For an unknown alias, it cancels the request.

This processing happens inside the browser. The extension does not send the requested URL or your mappings to an OnionNames-operated server. The mappings are stored locally and are not synchronized by OnionNames.

## Connections to onion services

When you visit a successfully mapped alias, the browser proceeds to connect to the resulting onion address using your configured browser and Tor network. That connection is made by the browser, not through an OnionNames-operated proxy or lookup server. The onion service you choose may receive the information normally involved in a connection to that service.

OnionNames checks the syntax of an onion hostname when you save a mapping. It does not contact the onion service to check whether it exists or is reachable.

## Permissions

OnionNames requests:

- `storage` to save and retrieve mappings locally.
- `webRequest` and `webRequestBlocking` to inspect matching `.alt` requests and redirect or cancel them.
- Host access to `*://*.alt/*`, limited to requests to the local alias namespace.

These permissions are necessary for the extension's core functionality.

## Changes to this policy

If the extension's data practices change, this policy will be updated alongside the relevant release.
