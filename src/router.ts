import Trouter from "trouter";

import {
  RouteHandler,
  ErrorHandler,
  RouterOptions,
  NoMatchHandler,
  OnRequestOptions,
  BeforeResponseHandler,
} from "./types";
import { EdgeRequest } from "./request";
import { EdgeResponse } from "./response";
import { onNoMatch, onError } from "./default";

export class EdgeRouter extends Trouter<RouteHandler> {
  private onNoMatch: NoMatchHandler;
  private onError: ErrorHandler;
  private onBeforeResponse: BeforeResponseHandler | undefined;

  constructor(options: RouterOptions = { onNoMatch, onError }) {
    super();
    this.onNoMatch = options.onNoMatch || onNoMatch;
    this.onError = options.onError || onError;
    this.onBeforeResponse = options.onBeforeResponse;
  }

  public use(
    path: string | RegExp | RouteHandler,
    ...handlers: RouteHandler[]
  ) {
    if (typeof path === "function") {
      handlers.unshift(path);
      super.use("/", ...handlers);
    } else {
      super.use(path, ...handlers);
    }
    return this;
  }

  public async onRequest(event: FetchEvent, ctx?: OnRequestOptions) {
    const { request } = event;
    const req = new EdgeRequest(event);
    const res = new EdgeResponse(event);

    if (ctx && ctx.vhost) {
      req.vhost = ctx.vhost;
    }

    try {
      const { handlers, params } = this.find(
        request.method as Trouter.HTTPMethod,
        req.pathname
      );
      req.params = params;
      handlers.push(this.onNoMatch);

      for (const handler of handlers) {
        const _response = await handler(req, res);
        if (_response instanceof Response) {
          if (this.onBeforeResponse !== undefined) {
            res._response = _response;
            const _res = await this.onBeforeResponse(req, res);
            if (_res instanceof Response) return _res;
          }
          return _response;
        }
      }

      return this.onNoMatch(req, res);
    } catch (error) {
      console.log(error.stack);
      return this.onError(error, req, res);
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
      }
      event.respondWith(this.onRequest(event));
    });
    return this;
  }
}
