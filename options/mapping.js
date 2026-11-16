(() => {
  "use strict";

  const STORAGE_KEY = "aliases";
  const ALIAS_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  const ONION_PATTERN = /^[a-z2-7]{56}$/;

  const form = document.getElementById("mapping-form");
  const list = document.getElementById("mapping-list");
  const count = document.getElementById("count");
  const search = document.getElementById("search");
  const editor = document.getElementById("editor");
  const heading = document.getElementById("editor-heading");
  const aliasInput = document.getElementById("alias");
  const onionInput = document.getElementById("onion");
  const submitButton = document.getElementById("submit-button");
  const addButton = document.getElementById("add-button");
  const cancelButton = document.getElementById("cancel-button");
  const deleteButton = document.getElementById("delete-button");
  const message = document.getElementById("message");

  let aliases = {};
  let editingAlias = null;
  let storageRevision = 0;

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isValidMapping(alias, onion) {
    return (
      typeof alias === "string" &&
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.alt$/.test(alias) &&
      typeof onion === "string" &&
      /^[a-z2-7]{56}\.onion$/.test(onion)
    );
  }

  function setMessage(text = "", isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
  }

  function getEntries() {
    return Object.entries(aliases)
      .filter(([alias, onion]) => isValidMapping(alias, onion))
      .sort(([a], [b]) => a.localeCompare(b));
  }

  function renderList() {
    list.replaceChildren();

    const entries = getEntries();
    const query = search.value.trim().toLowerCase();
    const filtered = entries.filter(([alias, onion]) =>
      `${alias} ${onion}`.toLowerCase().includes(query),
    );

    count.textContent =
      query === ""
        ? `${entries.length} ${entries.length === 1 ? "mapping" : "mappings"}`
        : `${filtered.length} of ${entries.length} mappings`;

    if (filtered.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.className = "empty";
      cell.textContent =
        entries.length === 0 ? "No mappings yet." : "No matching mappings.";
      row.append(cell);
      list.append(row);
      return;
    }

    for (const [alias, onion] of filtered) {
      const row = document.createElement("tr");

      const aliasCell = document.createElement("td");
      aliasCell.className = "alias-cell";
      aliasCell.textContent = alias;

      const onionCell = document.createElement("td");
      onionCell.className = "onion-cell";
      onionCell.textContent = onion;
      onionCell.title = onion;

      const actionsCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "row-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.setAttribute("aria-label", `Edit ${alias}`);
      edit.addEventListener("click", () => selectMapping(alias));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.setAttribute("aria-label", `Delete ${alias}`);
      remove.addEventListener("click", () => deleteMapping(alias));

      actions.append(edit, remove);
      actionsCell.append(actions);
      row.append(aliasCell, onionCell, actionsCell);
      list.append(row);
    }
  }

  function resetForm() {
    editingAlias = null;
    form.reset();
    heading.textContent = "Add mapping";
    submitButton.textContent = "Add mapping";
    cancelButton.hidden = true;
    deleteButton.hidden = true;
    setMessage();
  }

  function selectMapping(alias) {
    const onion = aliases[alias];
    if (!onion) return;

    editingAlias = alias;
    aliasInput.value = alias.slice(0, -".alt".length);
    onionInput.value = onion.slice(0, -".onion".length);
    heading.textContent = "Edit mapping";
    submitButton.textContent = "Save changes";
    cancelButton.hidden = false;
    deleteButton.hidden = false;
    setMessage();
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
    aliasInput.focus();
  }

  function validateInputs() {
    const aliasPrefix = aliasInput.value.trim().toLowerCase();
    const onionPrefix = onionInput.value.trim().toLowerCase();

    if (!ALIAS_PATTERN.test(aliasPrefix)) {
      throw new Error(
        "Enter one valid alias label: letters, digits and internal hyphens only.",
      );
    }

    if (!ONION_PATTERN.test(onionPrefix)) {
      throw new Error(
        "Enter exactly 56 Base32 characters (a–z or digits 2–7).",
      );
    }

    return {
      alias: `${aliasPrefix}.alt`,
      onion: `${onionPrefix}.onion`,
    };
  }

  async function saveMappings(updated) {
    await browser.storage.local.set({ [STORAGE_KEY]: updated });
    aliases = updated;
    renderList();
  }

  async function deleteMapping(alias) {
    if (!hasOwn(aliases, alias)) return;
    if (!window.confirm(`Delete the mapping ${alias}?`)) return;

    deleteButton.disabled = true;

    try {
      const updated = { ...aliases };
      delete updated[alias];
      await saveMappings(updated);

      if (editingAlias === alias) resetForm();
      setMessage("Mapping deleted.");
    } catch (error) {
      setMessage(`Could not delete mapping: ${error.message}`, true);
    } finally {
      deleteButton.disabled = false;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage();

    let mapping;
    try {
      mapping = validateInputs();
    } catch (error) {
      setMessage(error.message, true);
      return;
    }

    const { alias, onion } = mapping;
    if (alias !== editingAlias && hasOwn(aliases, alias)) {
      setMessage(`The alias ${alias} already exists.`, true);
      return;
    }

    submitButton.disabled = true;

    try {
      const updated = { ...aliases };
      if (editingAlias !== null && editingAlias !== alias) {
        delete updated[editingAlias];
      }
      updated[alias] = onion;

      await saveMappings(updated);
      resetForm();
      setMessage("Mapping saved.");
    } catch (error) {
      setMessage(`Could not save mapping: ${error.message}`, true);
    } finally {
      submitButton.disabled = false;
    }
  });

  addButton.addEventListener("click", () => {
    resetForm();
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
    aliasInput.focus();
  });

  cancelButton.addEventListener("click", resetForm);
  deleteButton.addEventListener("click", () => {
    if (editingAlias !== null) deleteMapping(editingAlias);
  });
  search.addEventListener("input", renderList);

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !hasOwn(changes, STORAGE_KEY)) return;

    storageRevision += 1;
    const value = changes[STORAGE_KEY].newValue;
    aliases =
      value && typeof value === "object" && !Array.isArray(value) ? value : {};

    if (editingAlias !== null && !hasOwn(aliases, editingAlias)) {
      resetForm();
    }

    renderList();
  });

  async function loadMappings() {
    const revisionAtStart = storageRevision;
    const stored = await browser.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];

    if (revisionAtStart === storageRevision) {
      aliases =
        value && typeof value === "object" && !Array.isArray(value) ? value : {};
    }

    renderList();
  }

  loadMappings().catch((error) => {
    list.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "empty";
    cell.textContent = `Could not load mappings: ${error.message}`;
    row.append(cell);
    list.append(row);
    count.textContent = "Unavailable";
  });
})();
