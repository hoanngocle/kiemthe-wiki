const localHosts = ["127.0.0.1", "localhost", "[::1]", "kiemthe.bee"];

export function localRequest(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  return localHosts.includes(url.hostname)
    && host !== null
    && localHosts.some((name) => host === name || host.startsWith(`${name}:`))
    && (!origin || origin === `${url.protocol}//${host}`)
    && !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? "");
}
