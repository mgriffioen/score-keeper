import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'setup' }
  | { name: 'game'; id: string };

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path === '/new') return { name: 'setup' };
  const game = /^\/g\/([^/]+)$/.exec(path);
  if (game) return { name: 'game', id: decodeURIComponent(game[1]) };
  return { name: 'home' };
}

export function toHash(route: Route): string {
  if (route.name === 'setup') return '#/new';
  if (route.name === 'game') return `#/g/${encodeURIComponent(route.id)}`;
  return '#/';
}

/**
 * Hash routing keeps the phone's back button and gesture working without
 * pulling in a router, and the app still runs from a file:// URL.
 */
export function useRoute(): {
  route: Route;
  go: (route: Route) => void;
  replace: (route: Route) => void;
  back: () => void;
} {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const go = useCallback((next: Route) => {
    window.location.hash = toHash(next);
  }, []);

  const replace = useCallback((next: Route) => {
    window.history.replaceState(null, '', toHash(next));
    setRoute(next);
  }, []);

  const back = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else window.location.hash = '#/';
  }, []);

  return { route, go, replace, back };
}
