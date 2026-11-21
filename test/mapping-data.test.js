const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseImport, createExport, mergeMappings, FORMAT, VERSION } = require("../options/mapping-data.js");

const onionA = "a".repeat(56) + ".onion";
const onionB = "b".repeat(56) + ".onion";
const file = (aliases, version = VERSION) => JSON.stringify({ format: FORMAT, version, aliases });

test("parses a valid version 1 mappings file", () => {
  assert.deepEqual(parseImport(file({ "one.alt": onionA })), { "one.alt": onionA });
});
test("rejects malformed JSON, wrong format, and unsupported versions", () => {
  assert.throws(() => parseImport("{"), /valid JSON/);
  assert.throws(() => parseImport(JSON.stringify({ format: "other", version: 1, aliases: {} })), /not an OnionNames/);
  assert.throws(() => parseImport(file({ "one.alt": onionA }, 2)), /Unsupported/);
});
test("rejects empty imports and malformed aliases or onion addresses", () => {
  assert.throws(() => parseImport(file({})), /no mappings/);
  assert.throws(() => parseImport(file({ "bad.name.alt": onionA })), /invalid mapping/);
  assert.throws(() => parseImport(file({ "one.alt": "not-an-onion.onion" })), /invalid mapping/);
});
test("validates every mapping before returning imported data", () => {
  assert.throws(() => parseImport(file({ "valid.alt": onionA, "invalid.alt": "bad" })), /invalid mapping: invalid.alt/);
});
test("exports valid mappings in a versioned, sorted format", () => {
  assert.deepEqual(createExport({ "z.alt": onionB, "invalid.alt": "bad", "a.alt": onionA }), {
    format: FORMAT, version: VERSION, aliases: { "a.alt": onionA, "z.alt": onionB },
  });
});
test("merges imported mappings and counts added, updated, and unchanged entries", () => {
  const result = mergeMappings(
    { "same.alt": onionA, "change.alt": onionA, "keep.alt": onionB },
    { "new.alt": onionB, "change.alt": onionB, "same.alt": onionA },
  );
  assert.deepEqual(result.mappings, {
    "same.alt": onionA, "change.alt": onionB, "keep.alt": onionB, "new.alt": onionB,
  });
  assert.deepEqual(result.summary, { added: 1, updated: 1, unchanged: 1 });
});
test("does not mutate the original mappings when merging", () => {
  const existing = { "one.alt": onionA };
  mergeMappings(existing, { "two.alt": onionB });
  assert.deepEqual(existing, { "one.alt": onionA });
});
