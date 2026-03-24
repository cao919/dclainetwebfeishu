import { createI18n } from 'vue-i18n';
import zhCN from './zh-CN';
import enUS from './en-US';

const i18n = createI18n({
  legacy: false, // 使用composition API模式
  locale: localStorage.getItem('language') || 'zh-CN', // 默认语言
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
});

export default i18n;
