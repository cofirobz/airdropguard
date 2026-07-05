import { SOCIAL_LINKS } from '../lib/socialLinks';
import { cn } from '../lib/utils';

type SocialLinksStripProps = {
  variant?: 'icons' | 'pills' | 'tags';
  className?: string;
  itemClassName?: string;
  label?: string;
};

export default function SocialLinksStrip({
  variant = 'pills',
  className,
  itemClassName,
  label,
}: SocialLinksStripProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)} aria-label="AirdropGuard social links">
      {label ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/75">{label}</span>
      ) : null}

      {SOCIAL_LINKS.map(({ href, label: socialLabel, Icon }) => {
        const isDiscord = socialLabel === 'Discord';

        if (variant === 'icons') {
          return (
            <a
              key={socialLabel}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow AirdropGuard on ${socialLabel}`}
              className={cn(
                'glass flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-gray-500 transition-colors',
                isDiscord
                  ? 'border-indigo-400/35 bg-indigo-500/15 text-indigo-200 hover:border-indigo-300 hover:text-white'
                  : 'hover:border-white/30 hover:text-white',
                itemClassName
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </a>
          );
        }

        if (variant === 'tags') {
          return (
            <a
              key={socialLabel}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit AirdropGuard on ${socialLabel}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-gray-400 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white',
                isDiscord ? 'border-indigo-400/35 bg-indigo-500/10 text-indigo-100 hover:border-indigo-300' : '',
                itemClassName
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{socialLabel}</span>
            </a>
          );
        }

        return (
          <a
            key={socialLabel}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Follow AirdropGuard on ${socialLabel}`}
            className={cn(
              'inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-500/[0.08] px-3 py-1.5 text-[11px] font-semibold text-cyan-100/90 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-cyan-300/45 hover:bg-cyan-400/15 hover:text-white',
              isDiscord ? 'border-indigo-300/40 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/28' : '',
              itemClassName
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{socialLabel}</span>
            {isDiscord ? <span aria-hidden="true">+</span> : null}
          </a>
        );
      })}
    </div>
  );
}
