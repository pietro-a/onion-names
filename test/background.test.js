const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const backgroundScript = fs.readFileSync("js/background.js", "utf8");
const onionAddress = "a".repeat(56) + ".onion";

async function createBackground(mappings = {}) {
  const listeners = {
    storageChanged: null,
    beforeRequest: null,
    actionClicked: null,
  };

  const browser = {
    storage: {
      onChanged: {
        addListener(listener) {
          listeners.storageChanged = listener;
        },
      },
      local: {
        async get() {
          return { aliases: mappings };
        },
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

  // Allow the initial storage read to finish before making requests.
  await new Promise((resolve) => setImmediate(resolve));

  return listeners;
}

test("rewrites an alias to its mapped onion hostname", async () => {
  const listeners = await createBackground({ "example.alt": onionAddress });

  const result = listeners.beforeRequest({
    url: "https://example.alt/",
  });

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

  assert.deepEqual(
    listeners.beforeRequest({ url: "https://unknown.alt/private" }),
    { cancel: true },
  );
});

test("does not alter ordinary hostnames", async () => {
  const listeners = await createBackground({ "example.alt": onionAddress });

  assert.deepEqual(
    listeners.beforeRequest({ url: "https://example.com/path" }),
    {},
  );
});

test("ignores malformed mappings loaded from storage", async () => {
  const listeners = await createBackground({
    "not a valid alias.alt": onionAddress,
    "bad-destination.alt": "not-an-onion.onion",
  });

  assert.deepEqual(
    listeners.beforeRequest({ url: "https://not%20a%20valid%20alias.alt/" }),
    { cancel: true },
  );
  assert.deepEqual(
    listeners.beforeRequest({ url: "https://bad-destination.alt/" }),
    { cancel: true },
  );
});
