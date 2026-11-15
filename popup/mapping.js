(() => {
  "use strict";

  const STORAGE_KEY = "aliases";

  const form = document.getElementById("mapping-form");
  const list = document.getElementById("mapping-list");
  const count = document.getElementById("count");
  const heading = document.getElementById("editor-heading");
  const aliasInput = document.getElementById("alias");
  const onionInput = document.getElementById("onion");
  const submitButton = document.getElementById("submit-button");
  const cancelButton = document.getElementById("cancel-button");
  const deleteButton = document.getElementById("delete-button");
  const message = document.getElementById("message");

  let aliases = {};
  let editingAlias = null;

  function setMessage(text = "", isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
  }

  function hostnamePrefix(hostname, suffix) {
    return hostname.slice(0, -suffix.length);
  }

  function renderList() {
    list.replaceChildren();

    const entries = Object.entries(aliases).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    count.textContent = `${entries.length} ${entries.length === 1 ? "mapping" : "mappings"}`;

    if (entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No mappings yet.";
      list.append(empty);
      return;
    }

    for (const [alias, onion] of entries) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "mapping-row";
      row.setAttribute("aria-pressed", String(alias === editingAlias));
      row.setAttribute("aria-label", `Edit ${alias}`);

      const aliasLine = document.createElement("div");
      aliasLine.className = "mapping-alias";
      aliasLine.textContent = alias;

      const destinationLine = document.createElement("div");
      destinationLine.className = "mapping-destination";

      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.textContent = "→";

      const destination = document.createElement("span");
      destination.textContent = onion;

      destinationLine.append(arrow, destination);
      row.append(aliasLine, destinationLine);

      row.addEventListener("click", () => selectMapping(alias));
      list.append(row);
    }
  }

  function resetForm() {
    editingAlias = null;
    form.reset();

    heading.textContent = "Add mapping";
    submitButton.textContent = "Add";
    cancelButton.hidden = true;
    deleteButton.hidden = true;

    setMessage();
    renderList();
  }

  function selectMapping(alias) {
    const onion = aliases[alias];

    if (!onion) {
      return;
    }

    editingAlias = alias;
    aliasInput.value = hostnamePrefix(alias, ".alt");
    onionInput.value = hostnamePrefix(onion, ".onion");

    heading.textContent = "Edit mapping";
    submitButton.textContent = "Save";
    cancelButton.hidden = false;
    deleteButton.hidden = false;

    setMessage();
    renderList();
  }

  function validateInputs() {
    const aliasPrefix = aliasInput.value.trim().toLowerCase();
    const onionPrefix = onionInput.value.trim().toLowerCase();

    // A single hostname label, without dots or a suffix.
    if (
      aliasPrefix.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(aliasPrefix)
    ) {
      throw new Error(
        "Use a valid alias label, e.g. ddg (letters, digits, hyphens).",
      );
    }

    // A v3 onion address has exactly 56 Base32 characters before .onion.
    if (!/^[a-z2-7]{56}$/.test(onionPrefix)) {
      throw new Error(
        "Enter a valid v3 onion hostname: exactly 56 letters a–z or digits 2–7.",
      );
    }

    return {
      alias: `${aliasPrefix}.alt`,
      onion: `${onionPrefix}.onion`,
    };
  }

  async function loadMappings() {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];

    aliases =
      value && typeof value === "object" && !Array.isArray(value) ? value : {};

    renderList();
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

    if (alias !== editingAlias && Object.hasOwn(aliases, alias)) {
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

      await browser.storage.local.set({
        [STORAGE_KEY]: updated,
      });

      aliases = updated;
      resetForm();
      setMessage("Mapping saved.");
    } catch (error) {
      setMessage(`Could not save mapping: ${error.message}`, true);
    } finally {
      submitButton.disabled = false;
    }
  });

  cancelButton.addEventListener("click", resetForm);

  deleteButton.addEventListener("click", async () => {
    if (editingAlias === null || !Object.hasOwn(aliases, editingAlias)) {
      return;
    }

    const aliasToDelete = editingAlias;

    if (!window.confirm(`Delete the mapping ${aliasToDelete}?`)) {
      return;
    }

    deleteButton.disabled = true;

    try {
      const updated = { ...aliases };
      delete updated[aliasToDelete];

      await browser.storage.local.set({
        [STORAGE_KEY]: updated,
      });

      aliases = updated;
      resetForm();
      setMessage("Mapping deleted.");
    } catch (error) {
      setMessage(`Could not delete mapping: ${error.message}`, true);
    } finally {
      deleteButton.disabled = false;
    }
  });

  loadMappings().catch((error) => {
    list.replaceChildren();

    const problem = document.createElement("p");
    problem.className = "empty";
    problem.textContent = `Could not load mappings: ${error.message}`;
    list.append(problem);
  });
})();
