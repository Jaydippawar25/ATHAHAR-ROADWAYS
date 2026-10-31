import React, { useState, useRef, useEffect, useMemo, forwardRef } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const FIELD_TO_MASTER_CATEGORY = {
  transporterName: 'transporters',
  transporter: 'transporters',
  fromStation: 'stations',
  originStation: 'stations',
  from: 'stations',
  destinationStation: 'stations',
  station: 'stations',
  ctTo: 'stations',
  vehicleNo: 'vehicles',
  vehicle: 'vehicles',
  driverName: 'drivers',
  driver: 'drivers',
  ownerName: 'owners',
  vehicleOwner: 'owners',
  owner: 'owners',
  consignorName: 'consignors',
  consignor: 'consignors',
  consigneeName: 'consignees',
  consignee: 'consignees',
  deliveryPersonName: 'deliveryPersons',
  deliveryPerson: 'deliveryPersons',
};

/**
 * EditableCombobox Component
 * Allows users to either:
 * 1. Type any custom manual text directly into the input.
 * 2. Click the dropdown arrow or press down arrow to select from existing master options.
 * 3. Automatically persists custom manually filled values into Master directory
 *    so they show up in dropdown options for subsequent entries.
 */
export const EditableCombobox = forwardRef(
  (
    {
      inputRef,
      name,
      value = '',
      onChange,
      onBlur,
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
      masterCategory,
      autoSaveMaster = true,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef(null);
    const internalInputRef = useRef(null);

    // Safely retrieve AppContext
    let appCtx = null;
    try {
      appCtx = useApp();
    } catch (e) {
      // Gracefully handle if mounted outside AppProvider
    }

    const resolvedCategory = masterCategory || (name ? FIELD_TO_MASTER_CATEGORY[name] : null);

    // Merge external ref and inputRef prop with internalInputRef
    const setRefs = (el) => {
      internalInputRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        ref.current = el;
      }
      if (typeof inputRef === 'function') {
        inputRef(el);
      } else if (inputRef) {
        inputRef.current = el;
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
            : opt.name || opt.vehicleNo || opt.ownerName || opt.value || opt.label || '';
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

      // If matches are found, show matches; else fallback to all options
      return matches.length > 0 ? matches : [];
    }, [normalizedOptions, value]);

    // Check if the current value is a new custom master item
    const trimmedValue = String(value || '').trim();
    const hasExactMatch = useMemo(() => {
      if (!trimmedValue) return false;
      return normalizedOptions.some(
        (opt) => opt.value.trim().toLowerCase() === trimmedValue.toLowerCase()
      );
    }, [normalizedOptions, trimmedValue]);

    const isCustomValue = Boolean(
      trimmedValue.length >= 2 && !hasExactMatch && resolvedCategory
    );

    // Auto-save value into Master directory
    const handleAutoSave = (valToSave = value) => {
      if (!autoSaveMaster || !resolvedCategory || !appCtx?.handleEnsureMasterItem) return;
      const clean = String(valToSave || '').trim();
      if (!clean || clean === '...' || clean === '-' || clean.length < 2) return;

      const exists = normalizedOptions.some(
        (opt) => opt.value.trim().toLowerCase() === clean.toLowerCase()
      );
      if (!exists) {
        appCtx.handleEnsureMasterItem(resolvedCategory, clean);
      }
    };

    // Handle outside click to close dropdown & auto-save
    useEffect(() => {
      const handleOutsideClick = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          if (isOpen) {
            handleAutoSave();
            setIsOpen(false);
            setHighlightedIndex(-1);
          }
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, value, resolvedCategory]);

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
      setHighlightedIndex(-1);
    };

    const handleInputBlur = (e) => {
      if (value && String(value).trim()) {
        handleAutoSave(value);
      }
      if (onBlur) {
        onBlur(e);
      }
    };

    const handleInputKeyDown = (e) => {
      if (disabled) return;

      if (e.key === 'ArrowDown') {
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
          setHighlightedIndex(0);
          return;
        } else {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          return;
        }
      }

      if (e.key === 'ArrowUp') {
        if (isOpen) {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          return;
        }
      }

      if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
          return;
        }
      }

      // Enter or forward Tab key navigation
      if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          triggerChange(filteredOptions[highlightedIndex].value);
        } else if (value && String(value).trim()) {
          handleAutoSave(value);
        }
        setIsOpen(false);
        setHighlightedIndex(-1);
        if (onKeyDown) {
          onKeyDown(e);
        }
        return;
      }

      // Shift+Tab backward navigation
      if (e.key === 'Tab' && e.shiftKey) {
        if (value && String(value).trim()) {
          handleAutoSave(value);
        }
        setIsOpen(false);
        setHighlightedIndex(-1);
        if (onKeyDown) {
          onKeyDown(e);
        }
        return;
      }

      // Delegate to external onKeyDown
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
            onBlur={handleInputBlur}
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
          <div className="absolute left-0 z-50 mt-1 max-h-56 w-full min-w-[200px] overflow-y-auto rounded-xl bg-white border border-slate-300 shadow-xl py-1 text-xs">
            {/* Actionable Save Banner if typing a new custom master */}
            {isCustomValue && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur before click executes
                  handleAutoSave(trimmedValue);
                  setIsOpen(false);
                  if (internalInputRef.current) {
                    internalInputRef.current.focus();
                  }
                }}
                className="px-3 py-2 flex items-center justify-between cursor-pointer bg-orange-50 hover:bg-orange-100 text-orange-900 border-b border-orange-200 transition-colors"
                title={`Click or press Enter to add "${uppercase ? trimmedValue.toUpperCase() : trimmedValue}" to Master records`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Plus className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span className="font-bold text-xs truncate">
                    Save &ldquo;{uppercase ? trimmedValue.toUpperCase() : trimmedValue}&rdquo; to Masters
                  </span>
                </div>
                <span className="text-[9px] font-black tracking-wider uppercase bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded shrink-0 ml-1">
                  NEW MASTER
                </span>
              </div>
            )}

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
            ) : isCustomValue ? (
              <div className="px-3 py-2 text-slate-500 font-medium text-[11px] bg-slate-50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>
                  Press <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-700">Enter</kbd> or <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-700">Tab</kbd> to save to Masters
                </span>
              </div>
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
