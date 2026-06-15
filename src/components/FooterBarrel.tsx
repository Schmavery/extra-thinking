const PREFIX = 'built with irony using';
const TOOL = 'cursor';

export function FooterBarrel() {
  return (
    <div className="pt-3 pb-5 text-footer text-[11px] italic flex-shrink-0 flex justify-center items-center gap-[0.35em]">
      <span>{PREFIX}</span>
      <span>{TOOL}</span>
    </div>
  );
}
