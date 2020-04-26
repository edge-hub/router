import { EdgeRouter } from "@edgehub/router";
import { VHostRouter } from "@edgehub/router/vhost";

const vhost = new VHostRouter();
const apiRouter = new EdgeRouter();
const cdnRouter = new EdgeRouter();

// API routes
apiRouter.get("/posts", (req, res) => {
  return res.send({ posts: { title: "About EdgeRouter" } });
});

apiRouter.post("/posts", async (req, res) => {
  const data = await req.body();
  if (!data) {
    return res.send(`Not data from POST req`);
  }
  // store data in db and send response
  return res.send(data);
});

// CDN routes
cdnRouter.all("*", (req, res) => {
  // Fetch image from CDN and modify on the fly to webp or resize ...etc
  res.send(`Some image`);
});

vhost.use("api.example.com", apiRouter);
vhost.use("cdn.example.com", cdnRouter);

vhost.listen({ passThroughOnException: true });
