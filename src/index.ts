import Trouter from "trouter";

import { Context } from "./context";

export type Handler = (context: Context) => Response | Promise<Response> | void;

export type ErrorHandler = (
  error: Error,
  context: Context
) => Response | Promise<Response>;

export type NoMatchHandler = (context: Context) => Response | Promise<Response>;

export type BeforeResponseHandler = (
  context: Context,
  response: Response
) => Response | Promise<Response> | void;

export interface RouterOptions {
  onError?: ErrorHandler;
  onNoMatch?: NoMatchHandler;
  onBeforeResponse?: BeforeResponseHandler;
}

function onNoMatch() {
  return new Response(`404 - Resource not found`, { status: 404 });
}

function onError(error: Error) {
  return new Response(error.message || error.toString(), { status: 500 });
}

export class EdgeRouter extends Trouter<Handler> {
  private onNoMatch: NoMatchHandler;
  private onError: ErrorHandler;
  private onBeforeResponse: BeforeResponseHandler | undefined;

  constructor(options: RouterOptions = { onNoMatch, onError }) {
    super();
    this.onNoMatch = options.onNoMatch || onNoMatch;
    this.onError = options.onError || onError;
    this.onBeforeResponse = options.onBeforeResponse;
  }

  public use(path: string | RegExp | Handler, ...handlers: Handler[]) {
    if (typeof path === "function") {
      handlers.unshift(path);
      super.use("/", ...handlers);
    } else {
      super.use(path, ...handlers);
    }
    return this;
  }

  public async onRequest(event: FetchEvent) {
    const { request } = event;
    const context = new Context(event);

    try {
      const { handlers, params } = this.find(
        request.method as Trouter.HTTPMethod,
        context.pathname
      );

      context.params = params;
      handlers.push(this.onNoMatch);

      for (const handler of handlers) {
        const response = await handler(context);
        if (response instanceof Response) {
          if (this.onBeforeResponse !== undefined) {
            const res = await this.onBeforeResponse(context, response);
            if (res instanceof Response) return res;
          }
          return response;
        }
      }

      return this.onNoMatch(context);
    } catch (error) {
      return this.onError(error, context);
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

export * from "./middlewares";
