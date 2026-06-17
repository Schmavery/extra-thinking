import { useEffect } from 'react';
import { UI } from '../game/data';
import { registerDevUnlockClick } from '../lib/devUnlock';
import { useIntroHeaderStream } from '../lib/useIntroHeaderStream';
import { GameTitle } from './GameTitle';

const SPIN_FRAMES = UI.spinFrames;
const TITLE_TEXT = 'extra thinking';

type Props = {
  phaseLabel: string;
  /** Stream title then subtitle; otherwise render static header. */
  streaming: boolean;
  onStreamComplete?: () => void;
  /** Tailwind margin below subtitle (desktop uses mb-6). */
  subtitleClassName?: string;
};

export function IntroHeader({
  phaseLabel,
  streaming,
  onStreamComplete,
  subtitleClassName = 'text-dimmer text-[12px] mb-6',
}: Props) {
  const stream = useIntroHeaderStream(TITLE_TEXT, phaseLabel, streaming);

  useEffect(() => {
    if (!streaming || !stream.done) return;
    onStreamComplete?.();
  }, [streaming, stream.done, onStreamComplete]);

  if (!streaming) {
    return (
      <>
        <GameTitle />
        <div className={subtitleClassName}>{phaseLabel}</div>
      </>
    );
  }

  const handleSecretClick = () => {
    registerDevUnlockClick();
  };

  const spinnerChar = SPIN_FRAMES[stream.spinTick % SPIN_FRAMES.length];

  const showSubtitle =
    stream.phase === 'subtitle' || stream.phase === 'done' || stream.subtitleText.length > 0;

  return (
    <>
      <div
        className="text-title mb-[2px] tracking-[0.04em] flex items-center gap-[0.35em] select-none min-h-[1.65em]"
        onClick={handleSecretClick}
      >
        {stream.phase === 'spinner' ? (
          <span className="text-dim">{spinnerChar}</span>
        ) : (
          <>
            {stream.prefixVisible && <span className="text-dim">&gt;</span>}
            <span>{stream.titleText}</span>
          </>
        )}
      </div>
      {showSubtitle && <div className={subtitleClassName}>{stream.subtitleText}</div>}
    </>
  );
}
