const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const backgroundScript = fs.readFileSync("js/background.js", "utf8");
const onionAddress = "a".repeat(56) + ".onion";

async function createBackground(mappings = {}, options = {}) {
  const listeners = {
    storageChanged: null,
    beforeRequest: null,
    actionClicked: null,
  };

  const getMappings = options.getMappings || (async () => mappings);

  const browser = {
    storage: {
      onChanged: {
        addListener(listener) {
          listeners.storageChanged = listener;
        },
      },
      local: {
        get: async () => ({ aliases: await getMappings() }),
      },
    },
    webRequest: {
      onBeforeRequest: {
        addListener(listener) {
          listeners.beforeRequest = listener;
        },
      },
    },
    action: {
      onClicked: {
        addListener(listener) {
          listeners.actionClicked = listener;
        },
      },
    },
    runtime: {
      openOptionsPage() {},
    },
  };

  vm.runInNewContext(backgroundScript, {
    browser,
    URL,
    console,
  });

  // Ensure the background script has started its initial storage read.
  await new Promise((resolve) => setImmediate(resolve));

  if (options.waitForInitial !== false) {
    // Allow the initial storage read to finish before making requests.
    await new Promise((resolve) => setImmediate(resolve));
  }

  return listeners;
}

function request(listeners, hostname, path = "/") {
  return listeners.beforeRequest({ url: `https://${hostname}${path}` });
}

test("rewrites an alias to its mapped onion hostname", async () => {
  const listeners = await createBackground({ "example.alt": onionAddress });

  const result = request(listeners, "example.alt");

  assert.equal(result.redirectUrl, `https://${onionAddress}/`);
});

test("preserves subdomains and URL components when rewriting", async () => {
  const listeners = await createBackground({ "example.alt": onionAddress });

  const result = listeners.beforeRequest({
    url: "http://www.docs.example.alt:8080/a/b?key=value#section",
  });

  assert.equal(
    result.redirectUrl,
    `http://www.docs.${onionAddress}:8080/a/b?key=value#section`,
  );
});

test("cancels requests for unknown aliases", async () => {
  const listeners = await createBackground();

  const result = request(listeners, "unknown.alt", "/private");

  assert.equal(result.cancel, true);
});

test("cancels unknown aliases even when they have multiple subdomains", async () => {
  const listeners = await createBackground();

  const result = request(listeners, "www.docs.unknown.alt");

  assert.equal(result.cancel, true);
});

test("does not alter ordinary hostnames", async () => {
  const listeners = await createBackground({ "example.alt": onionAddress });

  const result = request(listeners, "example.com", "/path");

  assert.deepEqual({ ...result }, {});
});

test("ignores malformed mappings loaded from storage", async () => {
  const listeners = await createBackground({
    "bad_alias.alt": onionAddress,
    "bad-destination.alt": "not-an-onion.onion",
  });

  assert.equal(request(listeners, "bad_alias.alt").cancel, true);
  assert.equal(request(listeners, "bad-destination.alt").cancel, true);
});

test("accepts aliases at the minimum and maximum supported lengths", async () => {
  const aliases = {
    "a.alt": onionAddress,
    "ab.alt": onionAddress,
    [`a`.repeat(63) + ".alt"]: onionAddress,
  };
  const listeners = await createBackground(aliases);

  assert.equal(request(listeners, "a.alt").redirectUrl, `https://${onionAddress}/`);
  assert.equal(request(listeners, "ab.alt").redirectUrl, `https://${onionAddress}/`);
  assert.equal(
    request(listeners, "a".repeat(63) + ".alt").redirectUrl,
    `https://${onionAddress}/`,
  );
});

test("rejects aliases longer than 63 characters and invalid label syntax", async () => {
  const invalidAliases = [
    "a".repeat(64) + ".alt",
    "-leading.alt",
    "trailing-.alt",
    "has_underscore.alt",
    "Uppercase.alt",
  ];
  const mappings = Object.fromEntries(
    invalidAliases.map((alias) => [alias, onionAddress]),
  );
  const listeners = await createBackground(mappings);

  for (const alias of invalidAliases) {
    assert.equal(request(listeners, alias).cancel, true, alias);
  }
});

test("applies added, edited, and deleted mappings from local storage changes", async () => {
  const firstOnion = onionAddress;
  const secondOnion = "b".repeat(56) + ".onion";
  const listeners = await createBackground({});

  listeners.storageChanged(
    { aliases: { oldValue: {}, newValue: { "added.alt": firstOnion } } },
    "local",
  );
  assert.equal(
    request(listeners, "added.alt").redirectUrl,
    `https://${firstOnion}/`,
  );

  listeners.storageChanged(
    {
      aliases: {
        oldValue: { "added.alt": firstOnion },
        newValue: { "added.alt": secondOnion },
      },
    },
    "local",
  );
  assert.equal(
    request(listeners, "added.alt").redirectUrl,
    `https://${secondOnion}/`,
  );

  listeners.storageChanged(
    { aliases: { oldValue: { "added.alt": secondOnion }, newValue: {} } },
    "local",
  );
  assert.equal(request(listeners, "added.alt").cancel, true);
});

test("ignores storage changes from other areas and unrelated keys", async () => {
  const listeners = await createBackground({ "kept.alt": onionAddress });
  const replacement = "b".repeat(56) + ".onion";

  listeners.storageChanged(
    { aliases: { newValue: { "kept.alt": replacement } } },
    "sync",
  );
  listeners.storageChanged(
    { unrelated: { newValue: true } },
    "local",
  );

  assert.equal(
    request(listeners, "kept.alt").redirectUrl,
    `https://${onionAddress}/`,
  );
});

test("fails closed while the initial storage read is pending", async () => {
  let resolveInitialRead;
  const initialRead = new Promise((resolve) => {
    resolveInitialRead = resolve;
  });
  const listeners = await createBackground({}, {
    getMappings: () => initialRead,
    waitForInitial: false,
  });

  assert.equal(request(listeners, "known.alt").cancel, true);

  resolveInitialRead({ "known.alt": onionAddress });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    request(listeners, "known.alt").redirectUrl,
    `https://${onionAddress}/`,
  );
});

test("does not let a stale initial read overwrite a newer storage change", async () => {
  const staleOnion = onionAddress;
  const currentOnion = "b".repeat(56) + ".onion";
  let resolveInitialRead;
  const initialRead = new Promise((resolve) => {
    resolveInitialRead = resolve;
  });
  const listeners = await createBackground({}, {
    getMappings: () => initialRead,
    waitForInitial: false,
  });

  listeners.storageChanged(
    { aliases: { oldValue: {}, newValue: { "current.alt": currentOnion } } },
    "local",
  );
  resolveInitialRead({ "stale.alt": staleOnion });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    request(listeners, "current.alt").redirectUrl,
    `https://${currentOnion}/`,
  );
  assert.equal(request(listeners, "stale.alt").cancel, true);
});
