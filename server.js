const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const indexPath = path.join(__dirname, "index.html");

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
    response.end("Method Not Allowed");
    return;
  }

  fs.readFile(indexPath, (error, content) => {
    if (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Server Error");
      return;
    }

    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    response.end(content);
  });
});

server.listen(port);
