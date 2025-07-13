const readFileSync = require("fs").readFileSync;
const injectScript = readFileSync("./patchy.js", "utf8");
(() => {
  const instanceOf = (x, y) => {
    try {
      return x instanceof y;
    } catch {
      return false;
    }
  };
  const WeakRefMap = (() => {
    const $weakRefMap = Symbol("*weakRefMap");
    return class WeakRefMap extends Map {
      constructor() {
        super();
        this[$weakRefMap] = new Map();
      }

      get(key) {
        const ref = this[$weakRefMap].get(key);
        const value = ref?.deref?.();
        if (value === undefined) {
          this[$weakRefMap].delete(key);
        }
        return value;
      }

      set(key, value) {
        this[$weakRefMap].set(key, new WeakRef(value));
        return this;
      }

      delete(key) {
        return this[$weakRefMap].delete(key);
      }

      has(key) {
        const value = this[$weakRefMap].get(key)?.deref?.();
        if (value === undefined) {
          this[$weakRefMap].delete(key);
          return false;
        }
        return true;
      }
    };
  })();

  const isValidResponse = (x) =>
    (x?.status === 200 && !x?.bodyUsed && !x?.body?.locked) ||
    x?.status === 304;

  globalThis.WeakCache = new WeakRefMap();
  const $response = Symbol("*response");
  const $fetch = Symbol("*fetch");
  globalThis[$fetch] = fetch;
  globalThis.fetch = async function fetch() {
    const args = [...arguments].map((x) => x?.clone?.() ?? x);
    let request, response;
    try {
      request = new Request(...arguments);
      if (
        request.method === "GET" &&
        !request.url.includes("?") &&
        !request.url.includes("#")
      ) {
        let cachedResponse = WeakCache.get(request.url);
        if (cachedResponse) {
          request[$response] = cachedResponse;
          if (cachedResponse instanceof Promise) {
            cachedResponse = await cachedResponse;
            if (isValidResponse(cachedResponse)) {
              WeakCache.set(request.url, cachedResponse.clone());
            } else {
              WeakCache.delete(request.url);
            }
          }
          try {
            response = cachedResponse.clone();
            response[$response] = cachedResponse;
          } catch {
            WeakCache.delete(request.url);
          }
          console.log("response from cache");
        } else {
          const presponse = globalThis[$fetch](...arguments);
          WeakCache.set(request.url, presponse);
          response = await presponse;
          if (response.status === 200 && !response.bodyUsed) {
            WeakCache.set(request.url, response.clone());
          } else {
            WeakCache.delete(request.url);
          }
        }
      }
      if (!instanceOf(response, Response)) {
        response = await globalThis[$fetch](...args);
      }
      return response;
    } catch (e) {
      WeakCache.delete(request.url);
      return new Response(
        Object.getOwnPropertyNames(e)
          .map((x) => `${x} : ${e[x]}`)
          .join(""),
        {
          status: 569,
          statusText: e.message,
        },
      );
    }
  };
})();

const parse = (x) => {
  try {
    return JSON.parse(x);
  } catch {
    return x;
  }
};

const { Readable } = require("stream");
const http = require("http");

const nocacheHeaders = {
  "Cache-Control": "no-cache",
  "Cache-Control-": "no-cache",
  "Cdn-Cache-Control": "no-cache",
  "Cloudflare-Cdn-Cache-Control": "no-cache",
  "Surrogate-Control": "no-cache",
  "Vercel-Cdn-Cache-Control": "no-cache",
};

async function tfetch() {
  try {
    const args = [...arguments].map((x) => x?.clone?.() ?? x);
    return await fetch(...args);
  } catch (e) {
    console.log(e, ...arguments);
    return new Response(e.stack, {
      status: 500,
      statusText: e.message,
    });
  }
}

const hostTarget = "www.google.com";
const globalReplaceHosts = ["www.google.com"];

http
  .createServer(
    {
      joinDuplicateHeaders: true,
      insecureHTTPParser: true,
    },
    onRequest,
  )
  .listen(3000);

async function onRequest(req, res) {
  try {
    const thisHost = req.headers.host;
    req.headers.host = hostTarget;
    req.headers.referer = hostTarget;
    if (req.headers.cookie) {
      req.headers["xx-cookie"] = req.headers.cookie;
    }

    /* start reading the body of the request*/
    let body;
    if (req.closed === false) {
      body = Readable.toWeb(req);
    }
    console.log("Body: ", body);
    const options = Object.assign(
      {
        method: req.method,
        headers: req.headers,
      },
      nocacheHeaders,
    );

    if (body && !req.method.match(/GET|HEAD/)) {
      (options.body = body), (options.duplex = "half");
    }
    const cloudHost = hostTarget;
    let request = new Request(`https://${cloudHost}${req.url}`, options);
    request.headers.forEach((value, key) =>
      request.headers.set(key, String(value).replace(thisHost, cloudHost)),
    );
    request.headers.set("xx-host-target", hostTarget);
    request.headers.delete("content-length");
    console.log("Fetch Request: ", request.headers.get("cookie"));

    let response = await tfetch(request);
    console.log("Fetch Response: ", response.headers.get("set-cookie"));
    let headers = new Headers();
    response.headers.forEach((value, key) =>
      headers.set(key, String(value).replace(cloudHost, thisHost)),
    );
    response = new Response(
      response.clone().body,
      Object.defineProperty(response.clone(), "headers", { value: headers }),
    );
    response.headers.forEach((value, key) => {
      res.setHeader(key, String(value).replace(cloudHost, thisHost));
    });
    if (response.headers.has("xx-set-cookie")) {
      res.setHeader("set-cookie", parse(response.headers.get("xx-set-cookie")));
    }
    new Headers(nocacheHeaders).forEach((value, key) =>
      res.setHeader(key, value),
    );
    res.removeHeader("content-length");
    res.removeHeader("content-encoding");
    console.log(res.getHeader("content-encoding"));
    const resBody = response.clone().body;
    if (/html/i.test(response.headers.get("content-type"))) {
      res.write(`<script>${injectScript}</script>`);
    }
    for await (const chunk of resBody ?? []) {
      res.write(chunk);
    }
    res.end();
  } catch (e) {
    console.log(e);
    try {
      res.end(e.message);
    } catch (e) {
      console.log(e);
    }
  }
}
