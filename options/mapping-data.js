(() => {
  "use strict";
  const FORMAT = "onionnames-mappings";
  const VERSION = 1;
  const ALIAS_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.alt$/;
  const ONION_PATTERN = /^[a-z2-7]{56}\.onion$/;
  function validateMapping(alias, onion) {
    return typeof alias === "string" && ALIAS_PATTERN.test(alias) && typeof onion === "string" && ONION_PATTERN.test(onion);
  }
  function parseImport(text) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error("The selected file is not valid JSON."); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("The file must contain a JSON object.");
    if (data.format !== FORMAT) throw new Error("This is not an OnionNames mappings file.");
    if (data.version !== VERSION) throw new Error("Unsupported mappings file version.");
    if (!data.aliases || typeof data.aliases !== "object" || Array.isArray(data.aliases)) throw new Error("The file must contain an aliases object.");
    const entries = Object.entries(data.aliases);
    if (entries.length === 0) throw new Error("The file contains no mappings to import.");
    for (const [alias, onion] of entries) if (!validateMapping(alias, onion)) throw new Error("The file contains an invalid mapping: " + alias);
    return Object.fromEntries(entries);
  }
  function createExport(aliases) {
    const entries = Object.entries(aliases || {}).filter(([alias, onion]) => validateMapping(alias, onion)).sort(([a], [b]) => a.localeCompare(b));
    return { format: FORMAT, version: VERSION, aliases: Object.fromEntries(entries) };
  }
  function mergeMappings(existing, imported) {
    const mappings = { ...(existing || {}) };
    const summary = { added: 0, updated: 0, unchanged: 0 };
    for (const [alias, onion] of Object.entries(imported)) {
      if (!Object.prototype.hasOwnProperty.call(mappings, alias)) summary.added++;
      else if (mappings[alias] === onion) summary.unchanged++;
      else summary.updated++;
      mappings[alias] = onion;
    }
    return { mappings, summary };
  }
  const api = { FORMAT, VERSION, validateMapping, parseImport, createExport, mergeMappings };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.OnionNamesData = api;
})();
