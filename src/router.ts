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

export class EdgeRouter extends Trouter<RouteHandler> {
  private onNoMatch: NoMatchHandler | undefined;
  private onError: ErrorHandler | undefined;
  private onBeforeResponse: BeforeResponseHandler | undefined;

  constructor(options: RouterOptions) {
    super();
    this.onNoMatch = options.onNoMatch;
    this.onError = options.onError;
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

      if (this.onNoMatch) {
        return this.onNoMatch(req, res);
      }
    } catch (error) {
      console.log(error.stack);
      if (this.onError) {
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
