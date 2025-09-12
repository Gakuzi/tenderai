import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Исключаем server-side файлы из обработки Vite
      optimizeDeps: {
        exclude: [
          'prisma',
          '@prisma/client',
          'bcryptjs',
          'jsonwebtoken',
          'nodemailer',
          'telegram',
          'whatsapp-web.js',
          'playwright',
          'puppeteer'
        ]
      },
      // Не обрабатываем server-side файлы
      build: {
        rollupOptions: {
          external: [
            /.*\.cjs$/,
            /prisma\/.*/,
            /services\/integrations\/.*/,
            /api\/.*/,
            /.*-server\..*/,
            /test-.*/,
            /check-.*/
          ]
        }
      }
    };
});
