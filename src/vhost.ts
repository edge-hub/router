import { EdgeRouter } from "./router";
import {
  VHostData,
  NoMatchHandler,
  ErrorHandler,
  RouterOptions,
} from "./types";
import { EdgeRequest } from "./request";
import { EdgeResponse } from "./response";

const ASTERISK_REGEXP = /\*/g;
const ASTERISK_REPLACE = "([^.]+)";
const END_ANCHORED_REGEXP = /(?:^|[^\\])(?:\\\\)*\$$/;
const ESCAPE_REGEXP = /([.+?^=!:${}()|[\]/\\])/g;
const ESCAPE_REPLACE = "\\$1";

interface HostHandler extends VHostData {
  router: EdgeRouter;
}

export class VHostRouter {
  private onNoMatch: NoMatchHandler | undefined;
  private onError: ErrorHandler | undefined;
  private routers: { pattern: RegExp; handler: EdgeRouter }[];

  constructor(options: Omit<RouterOptions, "onBeforeResponse">) {
    this.routers = [];
    this.onNoMatch = options.onNoMatch;
    this.onError = options.onError;
  }

  private isregexp(val: string | RegExp) {
    return Object.prototype.toString.call(val) === "[object RegExp]";
  }

  private parseHost(val: string | RegExp) {
    let source = !this.isregexp(val)
      ? String(val)
          .replace(ESCAPE_REGEXP, ESCAPE_REPLACE)
          .replace(ASTERISK_REGEXP, ASTERISK_REPLACE)
      : (val as RegExp).source;

    if (source[0] !== "^") {
      source = "^" + source;
    }

    if (!END_ANCHORED_REGEXP.test(source)) {
      source += "$";
    }

    return new RegExp(source, "i");
  }

  private vhostOf(host: string, pattern: RegExp) {
    const match = pattern.exec(host);
    if (!match) {
      return;
    }

    const params: string[] = [];
    params.length = match.length - 1;
    for (var i = 1; i < match.length; i++) {
      params[i - 1] = match[i];
    }

    return {
      host,
      params,
    };
  }

  private find(host: string) {
    const handlers: HostHandler[] = [];
    for (const r of this.routers) {
      const data = this.vhostOf(host, r.pattern);
      if (data) {
        handlers.push({
          ...data,
          router: r.handler,
        });
      }
    }
    return handlers;
  }

  public use(hostPattern: string | RegExp, router: EdgeRouter) {
    const pattern = this.parseHost(hostPattern);
    this.routers.push({ pattern, handler: router });
    return this;
  }

  public async onRequest(event: FetchEvent) {
    try {
      const { request } = event;
      const url = new URL(request.url);
      const host = url.host;
      const handlers = this.find(host);

      for (const handler of handlers) {
        const { router, ...data } = handler;
        const _response = await router.onRequest(event, { vhost: data });
        if (_response instanceof Response) {
          return _response;
        }
      }

      if (this.onNoMatch) {
        const req = new EdgeRequest(event);
        const res = new EdgeResponse(event);
        return this.onNoMatch(req, res);
      }
    } catch (error) {
      console.log(error.stack);
      if (this.onError) {
        const req = new EdgeRequest(event);
        const res = new EdgeResponse(event);
        return this.onError(error, req, res);
      }
    }
  }

  public listen({
    passThroughOnException = false,
  }: {
    passThroughOnException?: boolean;
  } = {}) {
    addEventListener("fetch", (event) => {
      if (passThroughOnException) {
        event.passThroughOnException();
        if (this.onError) {
          console.warn(
            `You enabled passThroughOnException and also have onError handler so onError handler will be used if any of your route handlers throw error instead of fallingback to origin response!`
          );
        }
      } else {
        if (!this.onError) {
          console.warn(
            `You did not passThroughOnException and also did not set onError handler so if any of your route handlers throw error it will be ignored and a generic worker error will be returned!`
          );
        }
      }

      // Why?
      // Because when passThroughOnException is set we want to ignore errors and return response from origin.
      // Incase of error or no match router does not send any response so worker will send response from origin as it is.
      // We can override this by specifying error and nomatch handlers.
      // @ts-ignore
      event.respondWith(this.onRequest(event));
    });
    return this;
  }
}
