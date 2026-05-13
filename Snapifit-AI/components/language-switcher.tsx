'use client';

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/hooks/use-i18n';
import { usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n';

const languageNames = {
  zh: '中文',
  en: 'English',
} as const;

export function LanguageSwitcher() {
  const pathname = usePathname();

  // 直接从路径中提取当前语言，确保准确性
  const getCurrentLocale = (): Locale => {
    for (const loc of locales) {
      if (pathname.startsWith(`/${loc}`)) {
        return loc;
      }
    }
    return 'zh'; // 默认语言
  };

  const locale = getCurrentLocale();

  // 使用 useI18n 钩子的 changeLocale 功能
  const { changeLocale } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => changeLocale(lang)}
            className={locale === lang ? 'bg-accent' : ''}
          >
            {languageNames[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
