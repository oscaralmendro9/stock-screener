import { Button } from '@/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/ui/sheet';
import { cn } from '@/lib/cn';
import AddToWatchlistMenu from '../../components/common/AddToWatchlistMenu';
import { explanationMap, formatSocialScore, socialStateLabel } from './socialSignalPresentation';

const words = (value) => String(value || '').replaceAll('_', ' ');
const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const stateReasons = (value) => Array.isArray(value)
  ? value
  : String(value || '').split(',').filter(Boolean);
const PILL = 'inline-flex h-6 items-center rounded-full border border-border px-2 text-[11px] whitespace-nowrap';
const LINK = 'text-accent no-underline hover:underline';

export default function SocialEvidenceDrawer({
  open, onClose, selected, query, onOpenChart, onOpenTheme, onScan,
}) {
  const data = query?.data;
  const item = data?.item || selected;
  const explanation = explanationMap(item);
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <SheetContent side="right" aria-label="Social evidence" aria-describedby={undefined} className="p-4 sm:w-[520px]">
        <div className="flex items-center justify-between">
          <div>
            <SheetTitle className="text-lg font-semibold">{item?.canonical_symbol || 'Evidence'}</SheetTitle>
            <p className="text-[11px] text-muted-foreground">
              {item?.market || 'Global'} · {socialStateLabel(item?.state)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        <div className="my-3 flex flex-wrap gap-2 tabular-nums">
          <span className={PILL}>{`Queue ${formatSocialScore(item?.queue_score)}`}</span>
          <span className={PILL}>{`Social ${formatSocialScore(item?.social_score)}`}</span>
          <span className={PILL}>{`Confirmation ${formatSocialScore(item?.confirmation_score)}`}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onOpenChart}>Open chart & setup</Button>
          <Button variant="secondary" size="sm" onClick={onScan}>Send visible to Scan</Button>
          {explanation.theme_id ? <Button variant="ghost" size="sm" onClick={() => onOpenTheme(explanation.theme_id)}>Open theme</Button> : null}
          {item?.canonical_symbol && item?.market ? <AddToWatchlistMenu symbols={item.canonical_symbol} /> : null}
        </div>
        <hr className="my-4 border-border" />
        <h3 className="text-sm font-semibold">Why it surfaced</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {stateReasons(explanation.state_reasons).map((reason) => (
            <span key={reason} className={PILL}>{words(reason)}</span>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground tabular-nums">
          Acceleration {formatSocialScore(explanation.acceleration)}
        </p>
        <ComponentMath title="Social components" components={explanation.social_components} />
        <ComponentMath title="Confirmation components" components={explanation.confirmation_components} />
        {query?.isLoading ? (
          <span role="progressbar" aria-label="Loading evidence" className="mt-6 inline-block size-8 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
        ) : null}
        {query?.isError ? <p role="alert" className="mt-4 text-sm text-loss">Evidence could not be loaded.</p> : null}
        {data?.related_listings?.length ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Related listings</h3>
            <p className="text-sm">
              {data.related_listings.map((row) => `${row.market}:${row.canonical_symbol}`).join(' · ')}
            </p>
          </div>
        ) : null}
        {data?.available && Array.isArray(data.claims) ? <ClaimList claims={data.claims} /> : null}
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Source posts</h3>
          {(data?.posts || []).slice(0, 3).map((post) => (
            <PaperPost key={post.post_id} post={post} />
          ))}
          {data?.available && !data.posts?.length ? (
            <p className="text-sm text-muted-foreground">No post excerpts in this window.</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ComponentMath({ title, components }) {
  const entries = Object.entries(components || {});
  if (!entries.length) return null;
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {entries.map(([name, component]) => (
        <div key={name} className="flex justify-between gap-4 text-sm">
          <span>{words(name)}</span>
          <span className="text-muted-foreground tabular-nums">
            {formatSocialScore(component?.value)} · {component?.available_weight ?? 0}/{component?.total_weight ?? 0} weight
          </span>
        </div>
      ))}
    </div>
  );
}

const supportChip = {
  supported: { label: 'Supported', tone: 'border-gain/60 text-gain' },
  uncertain: { label: 'Uncertain', tone: 'border-warning/60 text-warning' },
  unsupported: { label: 'Unsupported', tone: 'border-border text-muted-foreground' },
};

// Attachment-backed excerpts quote the attachment, not the poster.
const attachmentLabel = { article: 'linked article', image: 'shared image' };

function ClaimList({ claims }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">What X is claiming</h3>
      {claims.length ? (
        <ul aria-label="Extracted claims" className="m-0 list-none p-0">
          {claims.map((claim) => {
            const chip = supportChip[claim.support] || supportChip.unsupported;
            return (
              <li key={`${claim.post_id}:${claim.theme}:${claim.excerpt}`} className="border-b border-border py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold">{claim.theme} · {claim.relationship}</span>
                  <span className={cn('inline-flex h-5 items-center rounded-full border px-2 text-[11px]', chip.tone)}>{chip.label}</span>
                </div>
                <p className="my-1 text-sm">“{claim.excerpt}”</p>
                <p className="text-[11px] text-muted-foreground">
                  {claim.source_url ? (
                    <>
                      From a{' '}
                      <a href={claim.source_url} target="_blank" rel="noreferrer" className={LINK}>
                        {attachmentLabel[claim.source] || 'attachment'}
                      </a>
                      {' shared by '}
                    </>
                  ) : null}
                  <a href={claim.url} target="_blank" rel="noreferrer" className={LINK}>@{claim.author_handle}</a>
                  {' · '}{new Date(claim.created_at).toLocaleString()}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No company claims extracted in this window.</p>
      )}
    </div>
  );
}

function PaperPost({ post }) {
  return (
    <div className="border-b border-border py-3">
      <p className="text-[11px] text-muted-foreground">
        @{post.author_handle} · {new Date(post.created_at).toLocaleString()}
      </p>
      <p className="my-1.5 text-sm whitespace-pre-wrap">{post.excerpt}</p>
      <div className="flex flex-wrap items-center gap-1">
        {post.post_kind && post.stance ? (
          <span
            title="Model hint, not verified"
            aria-label={`Model hint, not verified: ${post.post_kind}, ${post.stance}`}
            className={PILL}
          >
            {`${capitalize(post.post_kind)} · ${capitalize(post.stance)}`}
          </span>
        ) : null}
        {(post.source_names || []).map((name) => <span key={name} className={PILL}>{name}</span>)}
        <span className="text-[11px] tabular-nums">{post.engagement?.likes ?? 0} likes</span>
        <a href={post.url} target="_blank" rel="noreferrer" className={cn(LINK, 'text-sm')}>Open on X</a>
      </div>
    </div>
  );
}
