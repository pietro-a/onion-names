# OnionNames

Create local, human-readable aliases for Tor onion services. OnionNames resolves those aliases inside the browser by rewriting matching request hostnames to their mapped v3 onion addresses.

Mappings stay in the browser's local extension storage. OnionNames does not collect or transmit user data, and it does not use a remote lookup service, proxy, analytics, or telemetry.

## How hostname mapping works

Each mapping consists of one alias label and one v3 onion hostname:

```text
ddg.alt → duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion
```

Only the label immediately before `.alt` is used for the lookup. Any labels before it are preserved as subdomains:

| Requested URL | Redirected URL |
| --- | --- |
| `http://ddg.alt/` | `http://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/` |
| `http://www.ddg.alt/` | `http://www.duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/` |
| `http://www.subdomain.ddg.alt:8080/path?q=1` | `http://www.subdomain.duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion:8080/path?q=1` |

The scheme, port, path, query string, and fragment are preserved. OnionNames changes only the hostname.

Aliases are single DNS labels: dots are not allowed in the alias itself. Subdomains are not separate mappings. A request for an unknown `.alt` alias is cancelled so it is not sent to ordinary hostname resolution.

OnionNames validates hostname syntax only. It does not look up DNS records, contact onion services to verify them, or check whether a service exists or supports a requested subdomain.

## Privacy and permissions

OnionNames works locally in your browser:

- Alias mappings are stored in `browser.storage.local` and are not synchronized by the extension.
- Matching `.alt` requests are inspected locally so known aliases can be rewritten and unknown aliases can be cancelled.
- OnionNames does not collect or transmit personal data, browsing history, alias mappings, analytics, or telemetry to the developer or a third party.
- There is no OnionNames-operated remote lookup service or proxy.

The extension requests access to `storage`, `webRequest`, `webRequestBlocking`, and the `*://*.alt/*` host pattern. These permissions are required to store mappings and handle requests in the alias namespace. See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

When you visit a mapped alias, your browser connects to the destination onion service through its configured Tor network. That connection is separate from any data collection by OnionNames.

## Managing mappings

Click the OnionNames toolbar button to open the mapping manager in a tab. Mappings are listed alphabetically. You can add, edit, delete, and search by alias. The search matches the alias label only; it does not search the `.alt` suffix or onion destination. Click an alias to copy its local address, including the `http://` scheme (for example, `http://ddg.alt`).

The manager accepts:
- An alias label containing letters, digits, and internal hyphens, followed by the fixed `.alt` suffix.
- A v3 onion hostname containing exactly 56 Base32 characters (`a-z` and `2-7`), followed by the fixed `.onion` suffix.

### Backing up and restoring mappings

Use **Export mappings** to download all valid mappings as a JSON file, regardless of the current search filter. The file uses a versioned format:

```json
{
  "format": "onionnames-mappings",
  "version": 1,
  "aliases": {
    "ddg.alt": "duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion"
  }
}
```

Use **Import mappings** to restore a backup or add mappings from another OnionNames installation. Import merges with existing mappings: new aliases are added, aliases with different destinations are updated from the file, and identical mappings are left unchanged. The manager displays a summary and asks for confirmation before saving. The entire file is validated first; malformed files, unsupported format versions, and empty imports are rejected without changing stored mappings.

Keep exported files somewhere safe. They contain your local alias list, even though OnionNames itself does not transmit that data.

## Using aliases

Enter an explicit scheme in the address bar, for example `http://ddg.alt` or `https://ddg.alt`. Browser address-bar search heuristics run before extension network-request listeners, so a scheme-less value such as `ddg.alt` may be treated as a search query and never reach OnionNames.

## Tor Browser

Tor Browser users: After installing OnionNames, open `about:addons`, select the extension, and enable **Run in Private Windows**. Tor Browser windows use private browsing contexts, and the extension needs permission to run in them.

## Development

OnionNames is a dependency-free WebExtension using plain JavaScript, HTML, and CSS. The extension targets Firefox/Tor Browser and uses the Firefox `webRequest` blocking API.
