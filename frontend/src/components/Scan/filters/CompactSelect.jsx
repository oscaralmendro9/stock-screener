import { NativeSelect } from '@/ui/native-select';

/**
 * Compact dropdown select for categorical filters
 */
function CompactSelect({ label, value, options, onChange, placeholder = 'All' }) {
  const handleChange = (val) => {
    if (val === '') {
      onChange(null);
    } else {
      // Preserve original option value type (number vs string)
      const selectedOption = options.find(opt => String(opt.value) === String(val));
      onChange(selectedOption ? selectedOption.value : val);
    }
  };

  return (
    <NativeSelect label={label} value={value ?? ''} onChange={handleChange} className="tw min-w-20">
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export default CompactSelect;
