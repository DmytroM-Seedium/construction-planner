import { useEffect, useState } from "react";
import type { RxQuery } from "rxdb";

export const useRxQuery = <T>(queryFactory: () => Promise<RxQuery<T[]>>) => {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    queryFactory().then((query) => {
      unsubscribe = query.$.subscribe((result) => {
        if (isMounted) {
          setData((result ?? []) as T[]);
        }
      }).unsubscribe;
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [queryFactory]);

  return data;
};

