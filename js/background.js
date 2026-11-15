(() => {
  "use strict";

  browser.webRequest.onBeforeRequest.addListener(
    (req) => {
      const url = new URL(req.url);

      if (url.hostname !== "ddg.alt") {
        return {};
      }

      url.hostname =
        "duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion";

      return { redirectUrl: url.href };
    },
    { urls: ["*://ddg.alt/*"] },
    ["blocking"],
  );
})();
