import { useState, useEffect, useRef } from 'react';

/**
 * Compact min/max number input for filtering
 * Two small text fields with a dash separator
 */
function CompactRangeInput({
  label,
  minValue,
  maxValue,
  onChange,
  step = 1,
  minLimit,
  maxLimit,
  prefix = '',
  suffix = '',
  minOnly = false,
}) {
  const [localMin, setLocalMin] = useState(minValue ?? '');
  const [localMax, setLocalMax] = useState(maxValue ?? '');
  const debounceTimeoutRef = useRef();

  // Sync local state with props
  useEffect(() => {
    setLocalMin(minValue ?? '');
    setLocalMax(maxValue ?? '');
  }, [minValue, maxValue]);

  useEffect(() => () => {
    clearTimeout(debounceTimeoutRef.current);
  }, []);

  // Debounced onChange handler
  const debouncedOnChange = (min, max) => {
    clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      const parsedMin = min === '' ? null : parseFloat(min);
      const parsedMax = max === '' ? null : parseFloat(max);
      // Convert NaN to null to prevent invalid filter values
      const validMin = (parsedMin !== null && !Number.isNaN(parsedMin)) ? parsedMin : null;
      const validMax = (parsedMax !== null && !Number.isNaN(parsedMax)) ? parsedMax : null;
      onChange({ min: validMin, max: validMax });
    }, 300);
  };

  const handleMinChange = (e) => {
    const value = e.target.value;
    setLocalMin(value);
    debouncedOnChange(value, localMax);
  };

  const handleMaxChange = (e) => {
    const value = e.target.value;
    setLocalMax(value);
    debouncedOnChange(localMin, value);
  };

  const field = (props, width, adornStart, adornEnd) => (
    <span className="relative flex h-11 items-center rounded-md border border-border bg-surface focus-within:ring-2 focus-within:ring-ring md:h-7" style={{ width }}>
      {adornStart && <span className="pl-1.5 text-[11px] text-muted-foreground">{adornStart}</span>}
      <input
        type="number"
        step={step}
        min={minLimit}
        max={maxLimit}
        className="h-full w-full min-w-0 appearance-none bg-transparent px-1.5 font-[inherit] text-xs text-foreground tabular-nums outline-none [-moz-appearance:textfield] placeholder:text-muted-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...props}
      />
      {adornEnd && <span className="pr-1.5 text-[11px] text-muted-foreground">{adornEnd}</span>}
    </span>
  );

  return (
    <div role="group" aria-label={label} className="tw min-w-25">
      <span className="mb-1 block text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {field(
          { value: localMin, onChange: handleMinChange, placeholder: minOnly ? '≥' : 'Min', 'aria-label': minOnly ? `${label} minimum` : `${label} min` },
          minOnly ? 70 : 55,
          prefix,
          minOnly ? suffix : '',
        )}
        {!minOnly && (
          <>
            <span className="text-[11px] text-muted-foreground">-</span>
            {field(
              { value: localMax, onChange: handleMaxChange, placeholder: 'Max', 'aria-label': `${label} max` },
              55,
              '',
              suffix,
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CompactRangeInput;
