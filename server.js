const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const indexPath = path.join(__dirname, "index.html");

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*"
};

function send(response, statusCode, headers, body) {
  response.writeHead(statusCode, {
    ...corsHeaders,
    ...headers
  });
  response.end(body);
}

async function handleProxy(request, response, requestUrl) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, { "content-type": "text/plain; charset=utf-8" }, "Method Not Allowed");
    return;
  }

  const target = requestUrl.searchParams.get("url");

  if (!target) {
    send(response, 400, { "content-type": "text/plain; charset=utf-8" }, "Missing url parameter");
    return;
  }

  let targetUrl;

  try {
    targetUrl = new URL(target);
  } catch {
    send(response, 400, { "content-type": "text/plain; charset=utf-8" }, "Invalid url parameter");
    return;
  }

  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    send(response, 400, { "content-type": "text/plain; charset=utf-8" }, "Only http and https URLs are allowed");
    return;
  }

  try {
    const proxyResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        "user-agent": request.headers["user-agent"] || "ThePark-CorsProxy/1.0"
      }
    });

    const headers = {
      "content-type": proxyResponse.headers.get("content-type") || "application/octet-stream",
      "cache-control": "no-store"
    };

    if (request.method === "HEAD") {
      send(response, proxyResponse.status, headers, "");
      return;
    }

    const body = Buffer.from(await proxyResponse.arrayBuffer());
    send(response, proxyResponse.status, headers, body);
  } catch {
    send(response, 502, { "content-type": "text/plain; charset=utf-8" }, "Proxy request failed");
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") {
    send(response, 204, {}, "");
    return;
  }

  if (requestUrl.pathname === "/proxy") {
    await handleProxy(request, response, requestUrl);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, { "content-type": "text/plain; charset=utf-8" }, "Method Not Allowed");
    return;
  }

  fs.readFile(indexPath, (error, content) => {
    if (error) {
      send(response, 500, { "content-type": "text/plain; charset=utf-8" }, "Server Error");
      return;
    }

    const headers = {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    };

    if (request.method === "HEAD") {
      send(response, 200, headers, "");
      return;
    }

    send(response, 200, headers, content);
  });
});

server.listen(port);
