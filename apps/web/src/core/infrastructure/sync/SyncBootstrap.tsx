import { ReactNode, useEffect, useState } from "react";
import { runSyncOnce, subscribeSyncConnection } from "@/core/infrastructure/sync/syncEngine";
import { useAuthStore } from "@/features/auth/store/auth.store";

type Props = {
  children: ReactNode;
};

export const SyncBootstrap = ({ children }: Props) => {
  const [persistHydrated, setPersistHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated(),
  );
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    if (persistHydrated) return;
    return useAuthStore.persist.onFinishHydration(() => setPersistHydrated(true));
  }, [persistHydrated]);

  useEffect(() => {
    return subscribeSyncConnection();
  }, []);

  useEffect(() => {
    if (!persistHydrated || !userId) return;
    runSyncOnce().catch(() => undefined);
  }, [persistHydrated, userId]);

  return <>{children}</>;
};

