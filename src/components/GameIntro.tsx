export type SplashPhase = 'splash' | 'exiting' | 'done';

const SPLASH_MS = 400;

export function introExitMs(): number {
  return SPLASH_MS;
}

type Props = {
  phase: SplashPhase;
  onRegister: () => void;
};

export function GameIntro({ phase, onRegister }: Props) {
  if (phase === 'done') return null;

  const exiting = phase === 'exiting';

  return (
    <div
      className={[
        'fixed inset-0 z-30 flex flex-col items-center justify-center bg-bg',
        'transition-opacity ease-out',
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100',
      ].join(' ')}
      style={{ transitionDuration: `${SPLASH_MS}ms` }}
      aria-hidden={exiting}
    >
      <div
        className={[
          'flex flex-col items-center text-center px-6',
          'transition-[opacity,transform] ease-out',
          exiting
            ? 'opacity-0 scale-[0.97] -translate-y-[4vh]'
            : 'opacity-100 scale-100 translate-y-0',
        ].join(' ')}
        style={{ transitionDuration: `${SPLASH_MS}ms` }}
      >
        <h1 className="opengpt-wordmark m-0">OpenGPT</h1>
        <button
          type="button"
          onClick={onRegister}
          disabled={exiting}
          className={[
            'opengpt-register mt-8 px-6 py-[11px] rounded-full',
            'bg-title text-bg text-[15px] leading-none',
            'border-0 cursor-default select-none',
            'transition-opacity hover:opacity-85',
            exiting ? 'pointer-events-none' : '',
          ].join(' ')}
        >
          register (free account)
        </button>
      </div>
    </div>
  );
}
