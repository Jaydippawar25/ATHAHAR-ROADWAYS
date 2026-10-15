import React, { useState, useRef, useEffect, useMemo, forwardRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * EditableCombobox Component
 * Allows users to either:
 * 1. Type any custom manual text directly into the input.
 * 2. Click the dropdown arrow or press down arrow to select from existing master options.
 */
export const EditableCombobox = forwardRef(
  (
    {
      name,
      value = '',
      onChange,
      options = [],
      placeholder = '',
      className = '',
      containerClassName = '',
      onKeyDown,
      disabled = false,
      required = false,
      uppercase = true,
      autoFocus = false,
      title = '',
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef(null);
    const internalInputRef = useRef(null);

    // Merge external ref with internalInputRef
    const setRefs = (el) => {
      internalInputRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        ref.current = el;
      }
    };

    // Normalize options into consistent { key, value, label } format
    const normalizedOptions = useMemo(() => {
      if (!options || !Array.isArray(options)) return [];
      const seen = new Set();
      const result = [];

      options.forEach((opt, idx) => {
        if (!opt) return;
        const val =
          typeof opt === 'string'
            ? opt
            : opt.name || opt.vehicleNo || opt.value || opt.label || '';
        if (val && !seen.has(String(val).toLowerCase())) {
          seen.add(String(val).toLowerCase());
          result.push({
            key: opt.id || val || idx,
            value: val,
            label: opt.label || val,
          });
        }
      });

      return result;
    }, [options]);

    // Filter options based on typed input
    const filteredOptions = useMemo(() => {
      const query = String(value ?? '').trim().toLowerCase();
      if (!query) return normalizedOptions;

      // Filter matches
      const matches = normalizedOptions.filter((opt) =>
        opt.value.toLowerCase().includes(query)
      );

      // If user typed something but matches are found, show matches; if query equals exactly one, still show all on open
      return matches.length > 0 ? matches : normalizedOptions;
    }, [normalizedOptions, value]);

    // Handle outside click to close dropdown
    useEffect(() => {
      const handleOutsideClick = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setIsOpen(false);
          setHighlightedIndex(-1);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('touchstart', handleOutsideClick);
      }
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
      };
    }, [isOpen]);

    // Propagate change
    const triggerChange = (newVal) => {
      const finalVal = uppercase ? String(newVal).toUpperCase() : newVal;
      if (onChange) {
        const syntheticEvent = {
          target: {
            name,
            value: finalVal,
          },
          currentTarget: {
            name,
            value: finalVal,
          },
        };
        onChange(syntheticEvent, finalVal);
      }
    };

    const handleSelectOption = (optVal) => {
      triggerChange(optVal);
      setIsOpen(false);
      setHighlightedIndex(-1);
      if (internalInputRef.current) {
        internalInputRef.current.focus();
      }
    };

    const handleInputChange = (e) => {
      const rawVal = e.target.value;
      triggerChange(rawVal);
      if (!isOpen) setIsOpen(true);
      setHighlightedIndex(0);
    };

    const handleInputKeyDown = (e) => {
      if (disabled) return;

      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          return;
        }

        if (e.key === 'Enter') {
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            e.preventDefault();
            handleSelectOption(filteredOptions[highlightedIndex].value);
            return;
          }
          // If no option highlighted, close dropdown and pass Enter to onKeyDown
          setIsOpen(false);
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
          return;
        }
      } else {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
          setHighlightedIndex(0);
          return;
        }
      }

      // Delegate to external onKeyDown (e.g. Enter to jump to next input field)
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    return (
      <div
        ref={containerRef}
        className={`relative flex-1 min-w-0 ${containerClassName}`}
      >
        <div className="relative flex items-center min-w-0">
          <input
            ref={setRefs}
            type="text"
            name={name}
            value={value || ''}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={() => {
              // Open dropdown on focus for easy discovery
              setIsOpen(true);
            }}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoFocus={autoFocus}
            title={title}
            autoComplete="off"
            className={`w-full pr-7 ${
              uppercase ? 'uppercase' : ''
            } ${className}`}
          />

          {/* Dropdown Toggle Chevron */}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (disabled) return;
              setIsOpen((prev) => !prev);
              if (internalInputRef.current) {
                internalInputRef.current.focus();
              }
            }}
            className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
            title="Toggle choices dropdown"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isOpen ? 'rotate-180 text-sky-600' : ''
              }`}
            />
          </button>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 z-50 mt-1 max-h-56 w-full min-w-[180px] overflow-y-auto rounded-lg bg-white border border-slate-300 shadow-xl py-1 text-xs">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  String(opt.value).trim().toLowerCase() ===
                  String(value || '').trim().toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.key || idx}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelectOption(opt.value)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted
                        ? 'bg-sky-100 text-sky-950 font-extrabold'
                        : isSelected
                        ? 'bg-sky-50 text-sky-800 font-bold'
                        : 'text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-sky-600 ml-2 shrink-0" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-2 text-slate-400 italic text-[11px]">
                No matching option (typing custom value)
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

EditableCombobox.displayName = 'EditableCombobox';
