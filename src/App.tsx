import { useEffect } from 'react';
import { useRoute } from './lib/router';
import { useSession } from './lib/useSessions';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { GameScreen } from './screens/GameScreen';
import { ToastHost, toast } from './components/ui';

export default function App() {
  const { route, go, replace } = useRoute();
  const session = useSession(route.name === 'game' ? route.id : null);
  const missing = route.name === 'game' && session === null;

  // A stale bookmark or a game deleted in another tab should not dead-end.
  useEffect(() => {
    if (!missing) return;
    replace({ name: 'home' });
    toast('That game is no longer saved on this device.');
  }, [missing, replace]);

  return (
    <div className="app">
      {route.name === 'home' ? (
        <HomeScreen
          onNew={() => go({ name: 'setup' })}
          onOpen={(id) => go({ name: 'game', id })}
        />
      ) : null}

      {route.name === 'setup' ? (
        <SetupScreen
          onCancel={() => go({ name: 'home' })}
          onStarted={(id) => replace({ name: 'game', id })}
        />
      ) : null}

      {route.name === 'game' && session ? (
        <GameScreen
          session={session}
          onBack={() => go({ name: 'home' })}
          onOpen={(id) => replace({ name: 'game', id })}
        />
      ) : null}

      <ToastHost />
    </div>
  );
}
