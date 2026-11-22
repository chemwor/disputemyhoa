/* =========================
Performance-optimized JS initialization
Dynamic imports for code splitting - only loads modules when needed
=========================== */

// Critical modules - always loaded (small and essential for initial render)
import './js/common/common';
import './js/common/mobile-menu';
import './js/common/navigation-menu';
import './js/utils/theme-switcher';
import './js/utils/force-theme-switcher';

// Lazy load animation modules only when their elements exist
if (document.querySelector('.accordion')) {
  import('./js/animation/accordion');
}

if (document.querySelector('[data-customer-success]') || document.querySelector('.customer-success-stories')) {
  import('./js/animation/customer-success-stories');
}

if (document.querySelector('.glossary')) {
  import('./js/animation/glossary');
}

if (document.querySelector('[data-gradient-path]') || document.querySelector('.gradient-path')) {
  import('./js/animation/gradient-path');
}

// Header animation - load if header exists
if (document.querySelector('header') || document.querySelector('[data-header]')) {
  import('./js/animation/header');
}

// Marquee - load only on pages with marquee elements
if (document.querySelector('.marquee') || document.querySelector('[data-marquee]')) {
  import('./js/animation/marquee');
}

// Modal - load only when modal elements exist
if (document.querySelector('.modal-overlay') || document.querySelector('.modal-action')) {
  import('./js/animation/modal');
}

// Sidebar - load only when sidebar exists
if (document.querySelector('.sidebar') || document.querySelector('[data-sidebar]')) {
  import('./js/animation/sidebar');
}

// Slider - load only when slider exists
if (document.querySelector('.slider') || document.querySelector('[data-slider]')) {
  import('./js/animation/slider');
}

// SVG draw animation
if (document.querySelector('[data-svg-draw]') || document.querySelector('.svg-draw')) {
  import('./js/animation/svg-draw');
}

// Swiper - heavy library, only load when carousel/swiper elements exist
if (
  document.querySelector('.swiper') ||
  document.querySelector('.reviews-swiper') ||
  document.querySelector('.blog-article-swiper') ||
  document.querySelector('.social-proof-swiper')
) {
  import('./js/animation/swiper');
}

// Tab animations
if (document.querySelector('.tab') || document.querySelector('[data-tab]')) {
  import('./js/animation/tab');
}

if (document.querySelector('.tab-filter') || document.querySelector('[data-tab-filter]')) {
  import('./js/animation/tab-filter');
}

// Common utilities - load based on need
if (document.querySelector('[data-parallax]') || document.querySelector('.parallax-effect')) {
  import('./js/common/parallax-effect');
}

if (document.querySelector('.price-switcher') || document.querySelector('[data-price-switcher]')) {
  import('./js/common/price-switcher');
}

if (document.querySelector('.progress') || document.querySelector('[data-progress]')) {
  import('./js/common/progress');
}

// Reveal elements - common, load if any reveal elements exist
if (document.querySelector('[data-ns-animate]') || document.querySelector('[data-reveal]')) {
  import('./js/common/reveal-elements');
}

// Smooth scrolling - load for anchor links
if (document.querySelector('a[href^="#"]')) {
  import('./js/common/smooth-scrolling');
}

// Utility modules - load based on presence of elements
if (document.querySelector('[data-cookie]') || document.querySelector('.cookie-banner')) {
  import('./js/utils/cookie');
}

if (document.querySelector('[data-counter]') || document.querySelector('.counter')) {
  import('./js/utils/counter');
}

if (document.querySelector('.img-before-after-slider') || document.querySelector('[data-before-after]')) {
  import('./js/utils/img-before-after-slider');
}

// Leaflet map - heavy library, only load on pages with map
if (document.getElementById('map') || document.querySelector('.leaflet-map')) {
  import('./js/utils/leaflet');
}

// Blog functionality - only load on blog pages
if (
  window.location.pathname.includes('/blog') ||
  document.querySelector('.blog-list') ||
  document.querySelector('.blog-detail') ||
  document.querySelector('[data-blog]')
) {
  import('./js/services/blog-api');
  import('./js/pages/blog-list');
  import('./js/pages/blog-detail');
}
