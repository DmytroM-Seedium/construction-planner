import { ReactNode, useEffect, useState } from "react";
import { runSyncOnce, subscribeSyncConnection } from "@/processes/sync/syncEngine";
import { useTaskStore } from "@/store/useTaskStore";

type Props = {
  children: ReactNode;
};

export const SyncBootstrap = ({ children }: Props) => {
  const [persistHydrated, setPersistHydrated] = useState(() =>
    useTaskStore.persist.hasHydrated(),
  );
  const userId = useTaskStore((s) => s.userId);

  useEffect(() => {
    if (persistHydrated) return;
    return useTaskStore.persist.onFinishHydration(() => setPersistHydrated(true));
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
