'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mail, ChevronDown, Check, Globe } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

export interface SmartEmailInputProps {
  id?: string;
  value: string;
  onChange: (fullEmail: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  showQuickChips?: boolean;
}

export interface EmailDomainOption {
  domain: string;
  label: string;
  popular?: boolean;
}

export const POPULAR_DOMAINS: EmailDomainOption[] = [
  { domain: '@gmail.com', label: 'Gmail', popular: true },
  { domain: '@yahoo.com', label: 'Yahoo', popular: true },
  { domain: '@outlook.com', label: 'Outlook', popular: true },
  { domain: '@icloud.com', label: 'iCloud', popular: true },
  { domain: '@hotmail.com', label: 'Hotmail', popular: true },
  { domain: '@live.com', label: 'Live', popular: false },
  { domain: '@proton.me', label: 'Proton', popular: true },
  { domain: '@protonmail.com', label: 'ProtonMail', popular: false },
  { domain: '@zoho.com', label: 'Zoho', popular: false },
  { domain: '@yandex.com', label: 'Yandex', popular: false },
  { domain: '@mail.com', label: 'Mail.com', popular: false },
  { domain: '@aol.com', label: 'AOL', popular: false },
  { domain: '@gmx.com', label: 'GMX', popular: false },
];

export function SmartEmailInput({
  id = 'smart-email',
  value,
  onChange,
  placeholder = 'username',
  required = true,
  disabled = false,
  autoFocus = false,
  className = '',
}: SmartEmailInputProps) {
  const { language, mounted } = useLocale();
  const isAr = mounted && language === 'ar';

  const [username, setUsername] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('@gmail.com');
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [customDomainText, setCustomDomainText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with external `value` prop
  useEffect(() => {
    if (!value) {
      if (username !== '') setUsername('');
      return;
    }

    if (value.includes('@')) {
      const parts = value.split('@');
      const prefix = parts[0] || '';
      const domainWithAt = `@${parts.slice(1).join('@')}`;

      setUsername(prefix);

      const matchedDomain = POPULAR_DOMAINS.find(
        (d) => d.domain.toLowerCase() === domainWithAt.toLowerCase()
      );

      if (matchedDomain) {
        setSelectedDomain(matchedDomain.domain);
        setIsCustomDomain(false);
      } else {
        setIsCustomDomain(true);
        setCustomDomainText(domainWithAt.replace(/^@/, ''));
        setSelectedDomain('custom');
      }
    } else {
      setUsername(value);
    }
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Emit updated full email to parent
  const emitFullEmail = (newUsername: string, newDomain: string, isCustom: boolean, customText: string) => {
    const cleanUser = newUsername.trim();
    if (!cleanUser) {
      onChange('');
      return;
    }

    if (isCustom) {
      const cleanCustom = customText.trim().replace(/^@/, '');
      onChange(cleanCustom ? `${cleanUser}@${cleanCustom}` : cleanUser);
    } else {
      onChange(`${cleanUser}${newDomain}`);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;

    // Handle intelligent pasting or typing of full email address
    if (inputVal.includes('@')) {
      const parts = inputVal.split('@');
      const cleanPrefix = parts[0];
      const pastedDomain = `@${parts.slice(1).join('@').toLowerCase()}`;

      const matchedDomain = POPULAR_DOMAINS.find(
        (d) => d.domain.toLowerCase() === pastedDomain
      );

      if (matchedDomain) {
        setUsername(cleanPrefix);
        setSelectedDomain(matchedDomain.domain);
        setIsCustomDomain(false);
        emitFullEmail(cleanPrefix, matchedDomain.domain, false, '');
        return;
      } else if (parts[1]) {
        // Custom domain pasted
        const customPart = parts.slice(1).join('@');
        setUsername(cleanPrefix);
        setIsCustomDomain(true);
        setCustomDomainText(customPart);
        setSelectedDomain('custom');
        emitFullEmail(cleanPrefix, 'custom', true, customPart);
        return;
      }
    }

    setUsername(inputVal);
    emitFullEmail(inputVal, selectedDomain, isCustomDomain, customDomainText);
  };

  const handleSelectDomain = (domain: string) => {
    if (domain === 'custom') {
      setIsCustomDomain(true);
      setSelectedDomain('custom');
      setIsOpen(false);
      emitFullEmail(username, 'custom', true, customDomainText);
    } else {
      setIsCustomDomain(false);
      setSelectedDomain(domain);
      setIsOpen(false);
      emitFullEmail(username, domain, false, '');
    }
  };

  const handleCustomDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanCustom = e.target.value.replace(/^@/, '');
    setCustomDomainText(cleanCustom);
    emitFullEmail(username, 'custom', true, cleanCustom);
  };

  const toggleDropdown = () => {
    // Dismiss any active soft keyboard on mobile/tablet before opening the dropdown
    if (inputRef.current) {
      inputRef.current.blur();
    }
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={`w-full select-none ${className}`}>
      {/* ── Input Container (Local-part + Smart Domain Dropdown Pill) ── */}
      <div
        className="relative flex items-center w-full bg-[#FFFDF9] border-2 border-black rounded-xl shadow-[2.5px_2.5px_0px_0px_#000] focus-within:shadow-[3.5px_3.5px_0px_0px_#000] transition-all"
        dir="ltr"
      >
        {/* Email Icon */}
        <span className="ps-3.5 pe-1.5 flex items-center text-black pointer-events-none shrink-0">
          <Mail className="w-4 h-4 stroke-[2.5]" />
        </span>

        {/* Username / Local-part Input */}
        <input
          id={id}
          ref={inputRef}
          type="text"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="username email"
          value={username}
          onChange={handleUsernameChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          className="flex-1 min-w-0 py-3 px-2 bg-transparent text-sm font-bold text-black placeholder-neutral-400 outline-none text-left tracking-wide"
        />

        {/* Custom Domain Input (If custom is active) */}
        {isCustomDomain ? (
          <div className="flex items-center pe-2 shrink-0">
            <span className="text-black font-black text-sm px-1">@</span>
            <input
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={customDomainText}
              onChange={handleCustomDomainChange}
              placeholder="domain.com"
              className="w-28 sm:w-36 py-1 px-2 bg-neutral-100 border border-black rounded-lg text-xs font-black text-black outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setIsCustomDomain(false);
                setSelectedDomain('@gmail.com');
                emitFullEmail(username, '@gmail.com', false, '');
              }}
              className="ms-1 px-1.5 py-0.5 text-[10px] font-black bg-neutral-200 hover:bg-neutral-300 rounded border border-black text-black cursor-pointer"
              title={isAr ? 'إلغاء النطاق المخصص' : 'Reset domain'}
            >
              ✕
            </button>
          </div>
        ) : (
          /* Smart Domain Dropdown Trigger */
          <div className="relative shrink-0 pe-2" ref={dropdownRef}>
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                toggleDropdown();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FFE600] hover:bg-[#ffe100] active:scale-95 border-2 border-black rounded-lg text-xs font-black text-black transition-all cursor-pointer shadow-[1.5px_1.5px_0px_0px_#000]"
              aria-expanded={isOpen}
              aria-label="Select email domain"
            >
              <span>{selectedDomain}</span>
              <ChevronDown className={`w-3.5 h-3.5 stroke-[3] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover (No inputs inside -> No virtual keyboard popups) */}
            {isOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 max-h-64 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] z-50 overflow-hidden flex flex-col animate-scale-in"
                dir="ltr"
              >
                {/* Domain list */}
                <div className="overflow-y-auto p-1.5 space-y-1 divide-y divide-neutral-100 max-h-60">
                  {POPULAR_DOMAINS.map((item) => {
                    const isSelected = !isCustomDomain && selectedDomain === item.domain;
                    return (
                      <button
                        key={item.domain}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectDomain(item.domain)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-black rounded-xl transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-[#06D6A0] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                            : 'hover:bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{item.domain}</span>
                          <span className="text-[10px] font-bold text-neutral-500">({item.label})</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-black shrink-0" />}
                      </button>
                    );
                  })}

                  {/* Custom Domain Option */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectDomain('custom')}
                    className="w-full flex items-center justify-between px-3 py-2 mt-1 text-xs font-black rounded-xl hover:bg-neutral-100 text-neutral-800 transition-colors cursor-pointer text-left border-t border-black/10 pt-2"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-neutral-600" />
                      <span>{isAr ? 'نطاق مخصص (Custom)' : 'Custom Domain...'}</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
