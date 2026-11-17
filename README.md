# OnionNames

Create local, human-readable aliases for Tor onion services.

OnionNames lets you define aliases such as `ddg.alt` and redirects requests to the corresponding v3 onion hostname. Mappings are stored locally in `browser.storage.local`; they are not synchronized or sent to a remote service.

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

Alias lookup and URL rewriting happen locally in the browser. OnionNames does not send your mappings or browsing data to an OnionNames-operated remote service. The extension does need browser permission to observe and handle requests to `.alt` hostnames so it can rewrite known aliases and cancel unknown ones. The browser's extension-permission prompt and settings control that access.

## Managing mappings

Click the OnionNames toolbar button to open the mapping manager in a tab. Mappings are listed alphabetically. You can add, edit, delete, and search by alias. The search matches the alias label only; it does not search the `.alt` suffix or onion destination.

The manager accepts:
- An alias label containing letters, digits, and internal hyphens, followed by the fixed `.alt` suffix.
- A v3 onion hostname containing exactly 56 Base32 characters (`a-z` and `2-7`), followed by the fixed `.onion` suffix.

## Using aliases

Enter an explicit scheme in the address bar, for example `http://ddg.alt` or `https://ddg.alt`. Browser address-bar search heuristics run before extension network-request listeners, so a scheme-less value such as `ddg.alt` may be treated as a search query and never reach OnionNames.

## Tor Browser

Tor Browser users: After installing OnionNames, open `about:addons`, select the extension, and enable **Run in Private Windows**. Tor Browser windows use private browsing contexts, and the extension needs permission to run in them.

## Development

OnionNames is a dependency-free WebExtension using plain JavaScript, HTML, and CSS. The extension targets Firefox/Tor Browser and uses the Firefox `webRequest` blocking API.
