import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { minify } from 'terser';
import { defineConfig } from 'vite';
import injectHTML from 'vite-plugin-html-inject';
import viteImagemin from 'vite-plugin-imagemin';

const getHtmlEntries = () => {
  const pagesDir = path.resolve(__dirname, '');
  const entries = {};

  // Get root HTML files
  const files = fs.readdirSync(pagesDir);
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  htmlFiles.forEach((file) => {
    const name = path.basename(file, '.html');
    entries[name] = path.resolve(pagesDir, file);
  });

  // Get blog subdirectory HTML files
  const blogDir = path.resolve(__dirname, 'blog');
  if (fs.existsSync(blogDir)) {
    const blogFiles = fs.readdirSync(blogDir);
    const blogHtmlFiles = blogFiles.filter((file) => file.endsWith('.html'));
    blogHtmlFiles.forEach((file) => {
      const name = `blog/${path.basename(file, '.html')}`;
      entries[name] = path.resolve(blogDir, file);
    });
  }

  return entries;
};

const jsToBottomNoModule = () => {
  return {
    name: 'no-attribute',
    transformIndexHtml(html) {
      html = html.replace(`type="module" crossorigin`, '');

      // Add null check before accessing match results
      const scriptMatch = html.match(/<script[^>]*>(.*?)<\/script[^>]*>/);
      if (!scriptMatch) {
        // If no script tag is found, return the html as-is
        console.warn('Warning: No script tag found in HTML during jsToBottomNoModule transformation');
        return html;
      }

      let scriptTag = scriptMatch[0];
      html = html.replace(scriptTag, '');

      // Check if the SCRIPT placeholder exists before trying to replace it
      if (html.includes('<!-- SCRIPT -->')) {
        html = html.replace('<!-- SCRIPT -->', scriptTag);
      } else {
        // If no placeholder, append the script tag before the closing body tag
        html = html.replace('</body>', scriptTag + '\n</body>');
      }

      return html;
    },
  };
};

const cssCrossOriginRemove = () => {
  return {
    name: 'css-cross-origin-remove',
    transformIndexHtml(html) {
      return html.replace(
        /(<link[^>]*rel=["']stylesheet["'][^>]*?)\s+crossorigin(?:=["'][^"']*["'])?/g,
        '$1'
      );
    },
  };
};

const vendorMinifier = () => {
  return {
    name: 'vendor-minifier',
    async generateBundle(options, bundle) {
      // Minify vendor scripts after build
      const vendorDir = path.resolve(__dirname, 'dist/vendor');

      if (fs.existsSync(vendorDir)) {
        const vendorFiles = fs.readdirSync(vendorDir);

        for (const file of vendorFiles) {
          if (file.endsWith('.js')) {
            const filePath = path.join(vendorDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            try {
              // Use Terser for advanced minification
              const minified = await minify(content, {
                compress: {
                  drop_console: false, // Keep console logs for debugging
                  drop_debugger: true,
                  pure_funcs: [], // Don't remove console.log calls for debugging
                  passes: 2,
                },
                mangle: {
                  toplevel: false, // Don't mangle top-level names to avoid breaking
                },
                format: {
                  comments: /@license|@preserve|@format|@version/i, // Preserve license comments
                },
                sourceMap: false,
              });

              // Write minified content back
              fs.writeFileSync(filePath, minified.code);

              // Calculate size reduction
              const originalSize = content.length;
              const minifiedSize = minified.code.length;
              const reduction = (((originalSize - minifiedSize) / originalSize) * 100).toFixed(1);

              console.log(`✅ Minified vendor script: ${file} (${reduction}% smaller)`);
            } catch (error) {
              console.warn(`⚠️ Failed to minify ${file}:`, error.message);
              // Fallback to basic minification
              const basicMinified = content
                .replace(/\/\/(?!.*@license|.*@preserve|.*@format|.*@version).*$/gm, '')
                .replace(/\/\*[\s\S]*?\*\/(?!.*@license|.*@preserve|.*@format|.*@version)/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
                .replace(/\s+$/gm, '')
                .replace(/^\s*[\r\n]/gm, '')
                .trim();

              fs.writeFileSync(filePath, basicMinified);
              console.log(`✅ Basic minified vendor script: ${file}`);
            }
          }
        }
      }
    },
  };
};

export default defineConfig({
  plugins: [
    tailwindcss(),
    injectHTML({
      tagName: 'Component',
    }),
    jsToBottomNoModule(),
    cssCrossOriginRemove(),
    vendorMinifier(),
    // Image optimization - generates optimized images during build
    viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false,
      },
      optipng: {
        optimizationLevel: 7,
      },
      mozjpeg: {
        quality: 80,
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4,
      },
      webp: {
        quality: 80,
      },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: getHtmlEntries(),
      output: {
        entryFileNames: 'assets/main.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          return `assets/${assetInfo.name || '[name].[ext]'}`;
        },
        // Manual chunk splitting for better caching and smaller initial bundle
        manualChunks: (id) => {
          // Vendor chunks - separate heavy libraries
          if (id.includes('node_modules/swiper')) {
            return 'vendor-swiper';
          }
          if (id.includes('node_modules/gsap') || id.includes('gsap')) {
            return 'vendor-gsap';
          }
          // Animation modules chunk
          if (id.includes('/js/animation/')) {
            return 'animations';
          }
          // Blog functionality chunk
          if (id.includes('/js/pages/blog') || id.includes('/js/services/blog')) {
            return 'blog';
          }
        },
      },
    },
    minify: 'terser',
    modulePreload: false,
    cssMinify: true,
    assetsDir: 'assets',
  },
  server: {
    open: true,
    proxy: {
      '/api': {
        target: 'https://dmhoa-246713e0bd92.herokuapp.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  base: './',
});
