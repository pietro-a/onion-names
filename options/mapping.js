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
function hasOwn(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
function isValidMapping(alias, onion) {
 return typeof alias === "string" && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.alt$/.test(alias) &&
 typeof onion === "string" && /^[a-z2-7]{56}\.onion$/.test(onion);
}
function setMessage(text = "", isError = false) {
 message.textContent = text; message.classList.toggle("error", isError);
}
const fields = {
 alias: { input: aliasInput, error: document.getElementById("alias-error"), validate(value) {
  if (!ALIAS_PATTERN.test(value)) return "Use one label containing letters, digits and internal hyphens only.";
  const full = value + ".alt";
  return full !== editingAlias && hasOwn(aliases, full) ? "The alias " + full + " already exists." : "";
 }},
 onion: { input: onionInput, error: document.getElementById("onion-error"), validate(value) {
  return ONION_PATTERN.test(value) ? "" : "Enter exactly 56 Base32 characters (a–z or digits 2–7).";
 }}
};
function clearFieldError(field) {
 field.error.textContent = ""; field.error.classList.remove("visible"); field.input.removeAttribute("aria-invalid");
}
function validateField(field, showEmpty = true) {
 const value = field.input.value.trim().toLowerCase();
 if (!showEmpty && value === "") { clearFieldError(field); return true; }
 const error = field.validate(value);
 if (error) {
  field.error.textContent = error; field.error.classList.add("visible"); field.input.setAttribute("aria-invalid", "true"); return false;
 }
 clearFieldError(field); return true;
}
function validateInputs() {
 const aliasValid = validateField(fields.alias);
 const onionValid = validateField(fields.onion);
 if (!aliasValid || !onionValid) { (aliasValid ? onionInput : aliasInput).focus(); return null; }
 return { alias: aliasInput.value.trim().toLowerCase() + ".alt", onion: onionInput.value.trim().toLowerCase() + ".onion" };
}
function getEntries() {
 return Object.entries(aliases).filter(([a, o]) => isValidMapping(a, o)).sort(([a], [b]) => a.localeCompare(b));
}
function renderList() {
 list.replaceChildren();
 const entries = getEntries(), query = search.value.trim().toLowerCase();
 const filtered = entries.filter(([a, o]) => (a + " " + o).toLowerCase().includes(query));
 count.textContent = query === "" ? entries.length + (entries.length === 1 ? " mapping" : " mappings") : filtered.length + " of " + entries.length + " mappings";
 if (!filtered.length) {
  const row = document.createElement("tr"), cell = document.createElement("td");
  cell.colSpan = 3; cell.className = "empty"; cell.textContent = entries.length ? "No matching mappings." : "No mappings yet.";
  row.append(cell); list.append(row); return;
 }
 for (const [alias, onion] of filtered) {
  const row = document.createElement("tr"), aliasCell = document.createElement("td"), onionCell = document.createElement("td");
  aliasCell.className = "alias-cell"; aliasCell.textContent = alias;
  onionCell.className = "onion-cell"; onionCell.textContent = onion; onionCell.title = onion;
  const actionsCell = document.createElement("td"), actions = document.createElement("div"); actions.className = "row-actions";
  const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Edit"; edit.setAttribute("aria-label", "Edit " + alias); edit.addEventListener("click", () => selectMapping(alias));
  const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Delete"; remove.setAttribute("aria-label", "Delete " + alias); remove.addEventListener("click", () => deleteMapping(alias));
  actions.append(edit, remove); actionsCell.append(actions); row.append(aliasCell, onionCell, actionsCell); list.append(row);
 }
}
function resetForm() {
 editingAlias = null; form.reset();
 Object.values(fields).forEach(clearFieldError);
 heading.textContent = "Add mapping"; submitButton.textContent = "Save mapping";
 cancelButton.hidden = true; deleteButton.hidden = true; setMessage();
}
function selectMapping(alias) {
 const onion = aliases[alias]; if (!onion) return;
 editingAlias = alias; aliasInput.value = alias.slice(0, -4); onionInput.value = onion.slice(0, -6);
 Object.values(fields).forEach(clearFieldError);
 heading.textContent = "Edit mapping"; submitButton.textContent = "Save changes";
 cancelButton.hidden = false; deleteButton.hidden = false; setMessage();
 editor.scrollIntoView({ behavior: "smooth", block: "start" }); aliasInput.focus();
}
async function saveMappings(updated) {
 await browser.storage.local.set({ [STORAGE_KEY]: updated }); aliases = updated; renderList();
}
async function deleteMapping(alias) {
 if (!hasOwn(aliases, alias) || !window.confirm("Delete the mapping " + alias + "?")) return;
 deleteButton.disabled = true;
 try {
  const updated = { ...aliases }; delete updated[alias]; await saveMappings(updated);
  if (editingAlias === alias) resetForm(); setMessage("Mapping deleted.");
 } catch (error) { setMessage("Could not delete mapping: " + error.message, true); }
 finally { deleteButton.disabled = false; }
}
for (const field of Object.values(fields)) {
 field.input.addEventListener("blur", () => validateField(field));
 field.input.addEventListener("input", () => {
  if (field.error.classList.contains("visible")) validateField(field, false);
  setMessage();
 });
}
form.addEventListener("submit", async (event) => {
 event.preventDefault(); setMessage();
 const mapping = validateInputs(); if (!mapping) return;
 const { alias, onion } = mapping; submitButton.disabled = true;
 try {
  const updated = { ...aliases };
  if (editingAlias !== null && editingAlias !== alias) delete updated[editingAlias];
  updated[alias] = onion; await saveMappings(updated); resetForm(); setMessage("Mapping saved.");
 } catch (error) { setMessage("Could not save mapping: " + error.message, true); }
 finally { submitButton.disabled = false; }
});
addButton.addEventListener("click", () => { resetForm(); editor.scrollIntoView({ behavior: "smooth", block: "start" }); aliasInput.focus(); });
cancelButton.addEventListener("click", resetForm);
deleteButton.addEventListener("click", () => { if (editingAlias !== null) deleteMapping(editingAlias); });
search.addEventListener("input", renderList);
browser.storage.onChanged.addListener((changes, areaName) => {
 if (areaName !== "local" || !hasOwn(changes, STORAGE_KEY)) return;
 storageRevision++;
 const value = changes[STORAGE_KEY].newValue;
 aliases = value && typeof value === "object" && !Array.isArray(value) ? value : {};
 if (editingAlias !== null && !hasOwn(aliases, editingAlias)) resetForm();
 renderList();
});
async function loadMappings() {
 const revisionAtStart = storageRevision, stored = await browser.storage.local.get(STORAGE_KEY), value = stored[STORAGE_KEY];
 if (revisionAtStart === storageRevision) aliases = value && typeof value === "object" && !Array.isArray(value) ? value : {};
 renderList();
}
loadMappings().catch((error) => {
 list.replaceChildren(); const row = document.createElement("tr"), cell = document.createElement("td");
 cell.colSpan = 3; cell.className = "empty"; cell.textContent = "Could not load mappings: " + error.message;
 row.append(cell); list.append(row); count.textContent = "Unavailable";
});
})();