import { registerDevUnlockClick } from '../lib/devUnlock';

export function GameTitle() {
  const handleSecretClick = () => {
    registerDevUnlockClick();
  };

  return (
    <div
      className="text-title mb-[2px] tracking-[0.04em] flex items-center gap-[0.35em] select-none"
      onClick={handleSecretClick}
    >
      <span className="text-dim">&gt;</span>
      <span>extra thinking</span>
    </div>
  );
}
