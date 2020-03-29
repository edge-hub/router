import Trouter from "trouter";

export interface HandlerContext {
  url: string;
  hash: string;
  host: string;
  hostname: string;
  pathname: string;
  protocol: string;
  method: string;
  search: string;
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string | undefined>;
  responseHeaders: Record<string, string> | Headers;
  request: Request;
  event: FetchEvent;
  [key: string]: any;
}

export type Handler = (
  context: HandlerContext
) => Response | Promise<Response> | void;

export type ErrorHandler = (
  error: Error,
  context: HandlerContext
) => Response | Promise<Response>;

export type NoMatchHandler = (
  context: HandlerContext
) => Response | Promise<Response>;

export type BeforeResponseHandler = (
  context: HandlerContext,
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

  private instanceToJson(instance: any) {
    return [...instance].reduce((obj, item) => {
      const prop: { [key: string]: any } = {};
      const key = item[0] as string;
      prop[key] = item[1];
      return { ...obj, ...prop };
    }, {});
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

  public async onRequest(
    event: FetchEvent,
    context: { [key: string]: any } = {}
  ) {
    const { request } = event;
    context.request = request;
    context.event = event;

    const url = new URL(request.url);
    context.method = request.method;
    context.url = url.href;
    context.host = url.host;
    context.hash = url.hash;
    context.pathname = url.pathname;
    context.protocol = url.protocol.slice(0, -1);
    context.search = url.search;
    context.querystring = url.search.slice(1);
    context.query = this.instanceToJson(url.searchParams);

    try {
      const { handlers, params } = this.find(
        request.method as Trouter.HTTPMethod,
        url.pathname
      );

      context.params = params;
      handlers.push(this.onNoMatch);

      for (const handler of handlers) {
        const response = await handler(context as HandlerContext);
        if (response instanceof Response) {
          if (this.onBeforeResponse !== undefined) {
            const res = await this.onBeforeResponse(
              context as HandlerContext,
              response
            );
            if (res instanceof Response) return res;
          }
          return response;
        }
      }

      return this.onNoMatch(context as HandlerContext);
    } catch (error) {
      return this.onError(error, context as HandlerContext);
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
  }
}
