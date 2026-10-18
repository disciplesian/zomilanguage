export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  // Shared translation links (…/t/<id>) open the viewer everywhere else,
  // so only route them home on native cold starts if the route ever fails.
  if (path.startsWith('/t/')) return path;
  return '/';
}
