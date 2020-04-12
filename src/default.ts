import { EdgeRequest } from "./request";
import { EdgeResponse } from "./response";

export function onNoMatch() {
  return new Response(`404 - Resource not found`, { status: 404 });
}

export function onError(error: Error, req: EdgeRequest, res: EdgeResponse) {
  const acceptHeader = req.headers.get("Accept");
  if (acceptHeader && acceptHeader.includes("text/html")) {
    return res.status(500).send(error.message || error.toString());
  }
  return res
    .status(500)
    .raw(
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
      "application/json"
    )
    .end();
}
