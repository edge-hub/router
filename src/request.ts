import cookie from "cookie";

import { Context } from "./context";
import { VHostData } from "./types";

export class EdgeRequest extends Context {
  public _originalRequest: Request;
  public _event: FetchEvent;
  public vhost?: VHostData;
  public url: string;
  public hash: string;
  public host: string;
  public hostname: string;
  public pathname: string;
  public protocol: string;
  public subdomains: string[];
  public method: string;
  public search: string;
  public querystring: string;
  public query: Record<string, string | string[] | undefined>;
  public params: Record<string, string | undefined> = {};
  public cookies: Record<string, string | undefined> = {};
  public headers: Headers;
  public header: (name: string) => string | null;
  public body: () => Promise<Record<string, any> | void>;
  constructor(event: FetchEvent) {
    super(event);
    const { request } = event;
    const url = new URL(request.url);
    this._event = event;
    this._originalRequest = request;
    this.method = request.method;
    this.url = url.href;
    this.hostname = url.hostname;
    this.host = url.hostname;
    this.subdomains = url.hostname.split(".").reverse().slice(2);
    this.hash = url.hash;
    this.pathname = url.pathname;
    this.protocol = url.protocol.slice(0, -1);
    this.search = url.search;
    this.querystring = url.search.slice(1);
    this.query = this._instanceToJson(url.searchParams);
    this.cookies = cookie.parse(request.headers.get("cookie") || "");
    this.headers = request.headers;
    this.header = this._header(request.headers);
    this.body = this._getBodyParserHelper(request.clone());
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
  private _header(headers: Headers) {
    return (name: string) => {
      return headers.get(name);
    };
  }
}
