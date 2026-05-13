import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locale || 'zh';

  try {
    return {
      locale: validLocale,
      messages: (await import(`../messages/${validLocale}.json`)).default
    };
  } catch (error) {
    // 如果找不到翻译文件，使用中文作为默认
    return {
      locale: 'zh',
      messages: (await import(`../messages/zh.json`)).default
    };
  }
});
