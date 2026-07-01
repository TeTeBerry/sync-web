'use client';

import { useEffect, useRef, useState } from 'react';

type CountrySelectProps = {
  name: string;
  value: string;
  options: string[];
  placeholder: string;
};

export function CountrySelect({ name, value, options, placeholder }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = selected || placeholder;

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  function chooseCountry(nextValue: string) {
    setSelected(nextValue);
    setOpen(false);
  }

  return (
    <div className="country-select" ref={rootRef}>
      <input type="hidden" name={name} value={selected} />
      <button
        className="country-select__trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? 'country-select__value' : 'country-select__placeholder'}>
          {label}
        </span>
        <span className="country-select__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="country-select__menu" role="listbox">
          <button
            className={`country-select__option${selected === '' ? ' is-selected' : ''}`}
            type="button"
            role="option"
            aria-selected={selected === ''}
            onClick={() => chooseCountry('')}
          >
            <span>{placeholder}</span>
            <span className="country-select__option-dot" />
          </button>
          {options.map((option) => (
            <button
              className={`country-select__option${selected === option ? ' is-selected' : ''}`}
              type="button"
              role="option"
              aria-selected={selected === option}
              onClick={() => chooseCountry(option)}
              key={option}
            >
              <span>{option}</span>
              <span className="country-select__option-dot" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
