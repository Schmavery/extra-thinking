import { useEffect, useState } from 'react';
import { isDevUnlocked, subscribeDevUnlock } from './devUnlock';

export function useDevUnlock(): boolean {
  const [unlocked, setUnlocked] = useState(isDevUnlocked);

  useEffect(() => {
    setUnlocked(isDevUnlocked());
    return subscribeDevUnlock(() => setUnlocked(isDevUnlocked()));
  }, []);

  return unlocked;
}
