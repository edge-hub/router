import "@cloudflare/workers-types";
import * as Trouter from "trouter";

interface HandlerContext {
  url: string;
  hash: string;
  host: string;
  hostname: string;
  pathname: string;
  protocol: string;
  search: string;
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string | undefined>;
  [key: string]: any;
}

export interface Handler {
  (event: FetchEvent, context: HandlerContext):
    | Response
    | Promise<Response>
    | undefined;
}

interface RouterOptions {
  notFoundHandler?: Handler;
}

export class EdgeRouter extends Trouter<Handler> {
  private notFoundHandler: Handler | undefined;

  constructor(options: RouterOptions) {
    super();
    this.notFoundHandler = options.notFoundHandler;
  }

  private instanceToJson(instance: any) {
    return [...instance].reduce((obj, item) => {
      const prop: { [key: string]: any } = {};
      const key = item[0] as string;
      prop[key] = item[1];
      return { ...obj, ...prop };
    }, {});
  }

  public use(path: string | RegExp, ...handlers: any[]) {
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
    const url = new URL(request.url);
    const { handlers, params } = this.find(
      request.method as Trouter.HTTPMethod,
      url.pathname
    );

    context.params = params;
    context.url = url.href;
    context.host = url.host;
    context.hash = url.hash;
    context.pathname = url.pathname;
    context.protocol = url.protocol.slice(0, -1);
    context.search = url.search;
    context.querystring = url.search.slice(1);
    context.query = this.instanceToJson(url.searchParams);

    for (const handler of handlers) {
      // @ts-ignore
      const response = await handler(event, context);
      if (response instanceof Response) {
        return response;
      }
    }

    if (this.notFoundHandler) {
      // @ts-ignore
      let response = this.notFoundHandler(event, context);
      if (response instanceof Response) {
        return response;
      }
    }
  }

  public listen() {
    addEventListener("fetch", async (event: FetchEvent) => {
      const response = await this.onRequest(event);
      if (response instanceof Response) {
        event.respondWith(response);
      }
    });
  }
}
