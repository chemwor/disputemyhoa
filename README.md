# DisputeMyHOA - Multi-Page Vite Application

## Project Overview

This is a **Vite-based multi-page HTML application** using Tailwind CSS for styling. The project contains multiple HTML pages for different sections of the DisputeMyHOA service.

## 🚀 Quick Start

### Development Server
```bash
npm run dev
```
This starts the Vite development server with hot reloading on all network interfaces (0.0.0.0).

### Production Build
```bash
npm run build
```
This builds the project for production and runs post-build optimizations.

### Preview Production Build
```bash
npm run preview
```
This serves the production build locally for testing.

### Format Code
```bash
npm run format
```
This formats all code using Prettier.

## 📁 Project Structure

```
disputemyhoa/
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies and scripts
├── post-build.js           # Post-build optimization script
├── tailwind.config.js      # Tailwind CSS configuration
├── dist/                   # Production build output
├── assets/                 # Static assets
└── *.html                  # Individual HTML pages
```

## 🛠️ Technology Stack

- **Build Tool**: Vite 6.3.1
- **CSS Framework**: Tailwind CSS 4.1.4
- **HTML Injection**: vite-plugin-html-inject
- **Minification**: Terser
- **Code Formatting**: Prettier

## 📄 Available Pages

The project includes numerous HTML pages for different sections:
- Landing pages (ai-agency.html, ai-application.html, etc.)
- Service pages (app-development.html, digital-marketing.html, etc.)
- Legal pages (privacy-policy.html, terms-conditions.html, etc.)
- Case management (case.html, case-preview.html)

## ⚙️ Vite Configuration Features

### Multi-Page Setup
- Automatically discovers all `.html` files in the root directory
- Each HTML file becomes a separate entry point

### Custom Plugins
1. **jsToBottomNoModule**: Removes module attributes and moves scripts to bottom
2. **cssCrossOriginRemove**: Removes crossorigin attributes from stylesheets
3. **vendorMinifier**: Advanced minification of vendor scripts using Terser

### Build Optimizations
- CSS and JS minification disabled in Vite (handled by custom plugins)
- Assets organized in `/assets/` directory
- Relative base path for deployment flexibility

## 🌐 Development Access

When running `npm run dev`, the server starts on:
- **Local**: http://localhost:5173 (default Vite port)
- **Network**: Available on all network interfaces (0.0.0.0)

## 🔧 Common Issues & Solutions

### Issue: "ng serve" command not working
**Solution**: This is not an Angular project. Use `npm run dev` instead.

### Issue: Build not working as expected
**Solution**: 
1. Clear the `dist` folder: `rm -rf dist`
2. Run clean build: `npm run build:clean`

### Issue: Styles not loading
**Solution**: Check Tailwind CSS configuration and ensure CSS files are properly imported.

## 📦 Dependencies

### Production Dependencies
- `@tailwindcss/vite`: Tailwind CSS Vite integration
- `tailwindcss`: CSS framework
- `vite-plugin-html-inject`: HTML component injection

### Development Dependencies
- `vite`: Build tool and dev server
- `terser`: JavaScript minification
- `prettier`: Code formatting

## 🚀 Deployment

1. Build for production: `npm run build`
2. The `dist` folder contains all static files ready for deployment
3. Can be deployed to any static hosting service (Netlify, Vercel, GitHub Pages, etc.)

## 📝 Notes

- This project uses ES modules (`"type": "module"` in package.json)
- All HTML files in the root directory are automatically included as entry points
- The build process includes custom minification and optimization steps
- Hot reloading works for all HTML, CSS, and JS changes during development
