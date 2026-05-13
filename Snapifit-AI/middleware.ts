import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  // 支持的语言列表
  locales,
  // 默认语言
  defaultLocale,
  // 始终显示语言前缀，确保语言状态稳定
  localePrefix: 'always',
  // 语言检测策略
  localeDetection: true
});

export const config = {
  // 匹配所有路径，除了以下路径：
  // - api 路由
  // - _next 静态文件
  // - _vercel 部署文件
  // - 图片文件
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
