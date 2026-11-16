(() => {
  "use strict";

  const STORAGE_KEY = "aliases";
  const ALIAS_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.alt$/;
  const ONION_PATTERN = /^[a-z2-7]{56}\.onion$/;

  let aliases = Object.create(null);
  let mappingsReady = false;
  let storageRevision = 0;

  function isValidMapping(alias, onion) {
    return (
      typeof alias === "string" &&
      ALIAS_PATTERN.test(alias) &&
      typeof onion === "string" &&
      ONION_PATTERN.test(onion)
    );
  }

  function normalizeMappings(value) {
    const normalized = Object.create(null);

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return normalized;
    }

    for (const [alias, onion] of Object.entries(value)) {
      if (isValidMapping(alias, onion)) {
        normalized[alias] = onion;
      }
    }

    return normalized;
  }

  function replaceMappings(value) {
    aliases = normalizeMappings(value);
  }

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) {
      return;
    }

    storageRevision += 1;
    replaceMappings(changes[STORAGE_KEY].newValue);
    mappingsReady = true;
  });

  browser.webRequest.onBeforeRequest.addListener(
    (request) => {
      const url = new URL(request.url);
      const hostname = url.hostname;

      if (!hostname.endsWith(".alt")) {
        return {};
      }

      // Fail closed while storage is loading, and for unknown aliases.
      if (!mappingsReady) {
        return { cancel: true };
      }

      const labels = hostname.split(".");
      if (labels.length < 2) {
        return { cancel: true };
      }

      // The label immediately before ".alt" is the mapped alias.
      const alias = labels[labels.length - 2] + ".alt";
      const onion = aliases[alias];

      if (!onion) {
        return { cancel: true };
      }

      // Preserve every preceding subdomain label.
      const subdomains = labels.slice(0, -2);
      url.hostname = [...subdomains, onion].join(".");

      return { redirectUrl: url.href };
    },
    { urls: ["*://*.alt/*"] },
    ["blocking"],
  );

  browser.action.onClicked.addListener(() => {
    browser.runtime.openOptionsPage();
  });

  async function loadMappings() {
    const revisionAtStart = storageRevision;
    const stored = await browser.storage.local.get(STORAGE_KEY);

    // Do not overwrite a newer value received through onChanged.
    if (revisionAtStart === storageRevision) {
      replaceMappings(stored[STORAGE_KEY]);
    }

    mappingsReady = true;
  }

  loadMappings().catch((error) => {
    console.error("OnionNames could not load its mappings:", error);
    aliases = Object.create(null);
    mappingsReady = true;
  });
})();
