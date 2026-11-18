import { createServer } from "node:http";
import next from "next";

const hostname = "kiemthe.bee";
const address = "127.0.0.2";
const port = 80;
const server = createServer();

const app = next({ dev: false, hostname, port, httpServer: server });
await app.prepare();
const handle = app.getRequestHandler();

server.on("request", (request, response) => {
  if (request.headers.host !== hostname && request.headers.host !== `${hostname}:${port}`) {
    response.writeHead(421).end();
    return;
  }

  // Next.js uses these headers when it constructs the URL for route handlers.
  request.headers["x-forwarded-proto"] = "http";
  request.headers["x-forwarded-host"] = hostname;
  request.headers["x-forwarded-port"] = String(port);
  request.headers["x-forwarded-for"] = request.socket.remoteAddress;
  void handle(request, response);
});

server.listen(port, address, () => {
  console.log(`Trang quan tri dang chay tai http://${hostname}`);
});
