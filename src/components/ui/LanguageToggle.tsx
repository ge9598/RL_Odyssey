import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  const toggle = () => {
    i18n.changeLanguage(isZh ? 'en' : 'zh');
  };

  return (
    <button
      onClick={toggle}
      className="font-pixel text-xs px-3 py-1.5 rounded-sm cursor-pointer transition-all duration-150
        bg-gradient-to-b from-[#1e2448] to-[#161b3a]
        text-[#e2e8f0] border border-[rgba(0,212,255,0.25)]
        hover:border-[rgba(0,212,255,0.5)] hover:shadow-[0_0_10px_rgba(0,212,255,0.15)]"
      aria-label="Toggle language"
    >
      {isZh ? '🇺🇸 EN' : '🇨🇳 中文'}
    </button>
  );
}
