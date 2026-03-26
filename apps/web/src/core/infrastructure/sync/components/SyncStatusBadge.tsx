import { useEffect, useState } from "react";
import { useSyncStatusStore } from "@/store/useSyncStatusStore";

export const SyncStatusBadge = () => {
  const { isSyncing, lastSuccessAt, lastError, serverReachable } = useSyncStatusStore();
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!online || serverReachable === false) {
    return (
      <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
        Offline
      </span>
    );
  }
  if (isSyncing) {
    return (
      <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900">
        Syncing…
      </span>
    );
  }
  if (lastError) {
    return (
      <span
        className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900"
        title={lastError}
      >
        Sync issue
      </span>
    );
  }
  return (
    <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
      Synced
      {lastSuccessAt ? ` · ${new Date(lastSuccessAt).toLocaleTimeString()}` : ""}
    </span>
  );
};

