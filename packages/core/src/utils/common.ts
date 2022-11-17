export function normalizeRoute(path: string, method = "GET") {
  method = method.toUpperCase();
  return `[${method}] ${path}`;
}
