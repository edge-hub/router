import cookie from "cookie";

type Body =
  | Blob
  | BufferSource
  | FormData
  | URLSearchParams
  | ReadableStream<Uint8Array>
  | string;

class RouterResponse {
  private responseHeaders: Headers | string[][] | Record<string, string> = {};
  private responseCookies: Record<
    string,
    { value: string; options: Record<string, string> }
  > = {};
  private code?: number;
  private statusText?: string;
  private responseBody?: Body | null;
  private responseType?: string;
  raw(data: any, type?: string) {
    this.responseBody = data;
    if (type) {
      this.responseHeaders = {
        ...this.responseHeaders,
        "Content-Type": type,
      };
    }
    return this;
  }
  text(data: string) {
    this.responseBody = data;
    return this;
  }
  json(data: object) {
    this.responseBody = JSON.stringify(data);
    this.responseHeaders = {
      ...this.responseHeaders,
      "Content-Type": `application/json`,
    };
    return this;
  }
  status(code: number, statusText?: string) {
    this.code = code;
    this.statusText = statusText;
    return this;
  }
  setHeader(key: string, value: string | string[]) {
    this.responseHeaders = {
      ...this.responseHeaders,
      [key]: Array.isArray(value) ? value.join(",") : value,
    };
    return this;
  }
  setCookie(key: string, value: string, options = {}) {
    this.responseCookies = {
      ...this.responseCookies,
      [key]: { value, options },
    };
    return this;
  }
  redirect(url: string, status?: number) {
    return Response.redirect(url, status);
  }
  sendStatus(status: number) {
    const headers = this._getResponseHeaders();
    return new Response(null, { status, headers });
  }
  end(
    data: {
      body?: Body | null;
      status?: number;
      statusText?: string;
      headers?: Headers | string[][] | Record<string, string>;
    } = {}
  ) {
    const {
      headers: endHeaders = {},
      status = this.code,
      statusText = this.statusText,
      body = this.responseBody,
    } = data;
    this.responseHeaders = {
      ...this.responseHeaders,
      ...endHeaders,
    };
    const headers = this._getResponseHeaders();
    return new Response(body, { status, headers, statusText });
  }
  private _getResponseHeaders() {
    const cookieHeader = Object.keys(this.responseCookies).reduce(
      (p: string, key: string) => {
        const { value, options } = this.responseCookies[key];
        return `${p}${cookie.serialize(key, value, options)}`;
      },
      ``
    );
    return {
      ...(this.responseType ? { "Content-Type": this.responseType } : {}),
      ...this.responseHeaders,
      "Set-Cookie": cookieHeader,
    };
  }
}

export class Context extends RouterResponse {
  public url: string;
  public hash: string;
  public host: string;
  public pathname: string;
  public protocol: string;
  public method: string;
  public search: string;
  public querystring: string;
  public query: Record<string, string | string[] | undefined>;
  public params: Record<string, string | undefined> = {};
  public cookies: Record<string, string | undefined> = {};
  public request: Request;
  public event: FetchEvent;
  public requestBody: () => Promise<Body | void>;
  constructor(event: FetchEvent) {
    super();
    const { request } = event;
    this.request = request;
    this.event = event;
    const url = new URL(request.url);
    this.method = request.method;
    this.url = url.href;
    this.host = url.host;
    this.hash = url.hash;
    this.pathname = url.pathname;
    this.protocol = url.protocol.slice(0, -1);
    this.search = url.search;
    this.querystring = url.search.slice(1);
    this.query = this._instanceToJson(url.searchParams);
    this.cookies = cookie.parse(this.request.headers.get("cookie") || "");
    this.requestBody = this._getBodyParserHelper(request.clone());
  }
  private _getBodyParserHelper(request: Request) {
    return async () => {
      const parsableMethods = ["post", "put"];
      if (!parsableMethods.includes(request.method.toLowerCase())) {
        return;
      }
      const contentType = request.headers.get("content-type");
      if (contentType === "application/json") {
        return await request.json();
      }
      if (contentType === "application/x-www-form-urlencoded") {
        const formData = await request.formData();
        return this._instanceToJson(formData);
      }
    };
  }
  private _instanceToJson(instance: any) {
    return [...instance].reduce((obj, item) => {
      const key = item[0] as string;
      if (obj[key]) {
        obj[key] = Array.isArray(obj[key])
          ? [...obj[key], item[1]]
          : [obj[key], item[1]];
        return obj;
      }

      const prop: { [key: string]: any } = {};
      prop[key] = item[1];
      return { ...obj, ...prop };
    }, {});
  }
}
