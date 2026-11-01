import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatConfidence } from '../../utils/formatUtils';

function hasTranslation(translatedText, originalText) {
  if (!translatedText || !originalText) return false;
  return translatedText.trim() !== originalText.trim();
}

function displayLanguageCode(sourceLanguage) {
  if (!sourceLanguage) return null;
  const trimmed = sourceLanguage.trim();
  if (!trimmed) return null;
  // BCP-47 primary-subtag check so 'en', 'EN-US', and 'en-GB' all suppress
  // the chip — external translation providers may emit region tags.
  if (trimmed.split('-')[0].toLowerCase() === 'en') return null;
  return trimmed.toUpperCase();
}

function confidenceChipColor(confidence) {
  if (confidence === null || confidence === undefined) return 'default';
  if (confidence >= 0.9) return 'success';
  if (confidence >= 0.7) return 'default';
  return 'warning';
}

const CONFIDENCE_TONE = { success: 'border-gain/50 text-gain', warning: 'border-warning/50 text-warning', default: 'border-border text-muted-foreground' };
const TEXT_SIZE = { body1: 'text-base', body2: 'text-sm', caption: 'text-[11px]' };

/**
 * Render text that may be a translation of a non-English source, with a
 * language chip, confidence badge, and an expandable "Show original"
 * disclosure. English sources (source_language absent or 'en') render
 * as plain text so the common case stays visually quiet. `textClassName`
 * styles the text lines, `className` the wrapper.
 */
export default function TranslatedText({
  originalText,
  translatedText,
  sourceLanguage,
  translationMetadata,
  variant = 'body2',
  textClassName,
  className,
}) {
  const [expanded, setExpanded] = useState(false);
  const languageCode = displayLanguageCode(sourceLanguage);
  const hasTranslatedVariant = hasTranslation(translatedText, originalText);
  const isTranslated = Boolean(languageCode && hasTranslatedVariant);

  const primaryText = isTranslated ? translatedText : originalText;
  const fallback = primaryText || originalText || '';
  const textClass = cn(TEXT_SIZE[variant] || 'text-sm', textClassName);

  if (!languageCode) {
    return (
      <p className={textClass} title={originalText || undefined}>
        {fallback || '-'}
      </p>
    );
  }

  const confidenceLabel = formatConfidence(translationMetadata?.confidence);
  const providerLabel = translationMetadata?.provider;
  const targetLanguage = translationMetadata?.target_language;

  const chipTooltip = [
    `Source language: ${languageCode}`,
    targetLanguage ? `Translated to: ${targetLanguage.toUpperCase()}` : null,
    providerLabel ? `Provider: ${providerLabel}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={cn('tw', className)}>
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <span title={chipTooltip} className="inline-flex h-[18px] items-center rounded-full border border-border px-1.5 text-[11px] font-semibold">
          {languageCode}
        </span>
        {confidenceLabel && (
          <span
            title="Translation confidence"
            className={cn('inline-flex h-[18px] items-center rounded-full border px-1.5 text-[11px] tabular-nums', CONFIDENCE_TONE[confidenceChipColor(translationMetadata?.confidence)])}
          >
            {confidenceLabel}
          </span>
        )}
        {isTranslated && originalText && (
          <button
            type="button"
            title={expanded ? 'Hide original' : 'Show original'}
            onClick={(event) => {
              // Guard against callers rendering TranslatedText inside a <Link>
              // where the default/bubbled click would trigger navigation.
              event.preventDefault();
              event.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            aria-label={expanded ? 'Hide original text' : 'Show original text'}
            aria-expanded={expanded}
            className="grid size-6 cursor-pointer place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {expanded ? <ChevronUp aria-hidden="true" className="size-3.5" /> : <ChevronDown aria-hidden="true" className="size-3.5" />}
          </button>
        )}
      </div>
      <p className={textClass}>
        {fallback || '-'}
      </p>
      {isTranslated && originalText && expanded && (
        <div className="mt-1.5 border-t border-border pt-1.5 italic">
          <p className="mb-0.5 text-[11px] text-muted-foreground">
            Original ({languageCode})
          </p>
          <p className={cn(textClass, 'text-muted-foreground')}>
            {originalText}
          </p>
        </div>
      )}
    </div>
  );
}
