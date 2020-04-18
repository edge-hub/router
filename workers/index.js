import { EdgeRouter, workersSite } from "@edgehub/router";

const worker = new EdgeRouter({
  onNoMatch: (_req, res) => {
    return res.status(404).send(`Resource not found! <a href="/">Go Back</a>`);
  },
});

worker.use(workersSite());

worker.listen({ passThroughOnException: true });
