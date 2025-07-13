(() => {
  (() => {
    const xhr = XMLHttpRequest.prototype;
    const _open = xhr.open;
    xhr.open = function open() {
      try {
        arguments[1] &&= (() => {
          const url = new URL(arguments[1]);
          if (url.host !== location.host) {
            url.searchParams.set("xx-original-host", url.host);
            url.host = location.host;
          }
          return String(url);
        })();
      } catch (e) {
        console.warn(this, e, ...arguments);
      }
      return _open.apply(this, arguments);
    };
  })();
  (() => {
    const instanceOf = (x, y) => {
      try {
        return x instanceof y;
      } catch {
        return false;
      }
    };
    const isString = (x) =>
      typeof x === "string" ||
      instanceOf(x, String) ||
      x?.constructor?.name === "String";
    const isURL = (x) => instanceOf(x, URL) || x?.constructor?.name === "URL";
    const isStringURL = (x) => isString(x) || isURL(x);
    const hasURLString = (x) => isStringURL(x?.url);
    const _fetch = globalThis.fetch;
    globalThis.fetch = async function fetch(...args) {
      try {
        args = args.map((x) => {
          try {
            if (isStringURL(x)) {
              x = new URL(String(x));
              if (url.host !== location.host) {
                x.searchParams.set("xx-original-host", x.host);
                x.host = location.host;
              }
              return String(x);
            } else if (hasURLString(x)) {
              x.url = new URL(String(x.url));
              if (url.host !== location.host) {
                x.url.searchParams.set("xx-original-host", x.url.host);
                x.url.host = location.host;
              }
            }
          } catch (e) {
            console.warn(e, x);
          }
          return x;
        });
        return await _fetch.apply(this, args);
      } catch (e) {
        console.warn(e, ...args);
        return new Response(
          Reflect.ownKeys(e).map((key) =>
            `${String(key)} : ${String(e[key])}`.join("\n"),
          ),
          {
            status: 469,
            statusText: e.message,
          },
        );
      }
    };
  })();

  (() => {
    globalThis.Request = (() => {
      const _Request = globalThis.Request;
      return class Request extends _Request {
        constructor(...args) {
          args = args.map((x) => {
            try {
              if (isStringURL(x)) {
                x = new URL(String(x));
                if (url.host !== location.host) {
                  x.searchParams.set("xx-original-host", x.host);
                  x.host = location.host;
                }
                return String(x);
              } else if (hasURLString(x)) {
                x.url = new URL(String(x.url));
                if (url.host !== location.host) {
                  x.url.searchParams.set("xx-original-host", x.url.host);
                  x.url.host = location.host;
                }
              }
            } catch (e) {
              console.warn(e, x);
            }
            return x;
          });
          return super(...args);
        }
      };
    })();
  })();
})();
