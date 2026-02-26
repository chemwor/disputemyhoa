/**
 * Dynamic Blog List
 * Fetches and renders blog posts from the API
 */

import { fetchBlogPosts, formatDate, formatDatetime } from '../services/blog-api.js';

console.log('Blog list module loaded');

// Default placeholder image for posts without images
const DEFAULT_IMAGE = './images/ns-img-443.png';

// SVG icons for date and time
const CALENDAR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <g clip-path="url(#clip0_blog_date)">
    <path d="M14.1641 2.49992H17.4974C17.7184 2.49992 17.9304 2.58772 18.0866 2.744C18.2429 2.90028 18.3307 3.11224 18.3307 3.33325V16.6666C18.3307 16.8876 18.2429 17.0996 18.0866 17.2558C17.9304 17.4121 17.7184 17.4999 17.4974 17.4999H2.4974C2.27638 17.4999 2.06442 17.4121 1.90814 17.2558C1.75186 17.0996 1.66406 16.8876 1.66406 16.6666V3.33325C1.66406 3.11224 1.75186 2.90028 1.90814 2.744C2.06442 2.58772 2.27638 2.49992 2.4974 2.49992H5.83073V0.833252H7.4974V2.49992H12.4974V0.833252H14.1641V2.49992ZM16.6641 9.16658H3.33073V15.8332H16.6641V9.16658ZM12.4974 4.16658H7.4974V5.83325H5.83073V4.16658H3.33073V7.49992H16.6641V4.16658H14.1641V5.83325H12.4974V4.16658ZM4.9974 10.8333H6.66406V12.4999H4.9974V10.8333ZM9.16406 10.8333H10.8307V12.4999H9.16406V10.8333ZM13.3307 10.8333H14.9974V12.4999H13.3307V10.8333Z" class="fill-secondary dark:fill-stroke-8" />
  </g>
  <defs><clipPath id="clip0_blog_date"><rect width="20" height="20" fill="white" /></clipPath></defs>
</svg>`;

const CLOCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <g clip-path="url(#clip0_blog_time)">
    <path d="M14.6813 4.97325L15.8921 3.76242L17.0705 4.94075L15.8596 6.15158C17.0561 7.64922 17.6337 9.54815 17.4739 11.4584C17.314 13.3686 16.4288 15.1451 15.0001 16.423C13.5713 17.701 11.7074 18.3833 9.7913 18.33C7.87515 18.2766 6.05215 17.4916 4.6967 16.1362C3.34125 14.7807 2.55625 12.9577 2.50291 11.0416C2.44957 9.12545 3.13193 7.2616 4.40987 5.83284C5.68781 4.40409 7.46432 3.51888 9.37453 3.35902C11.2847 3.19916 13.1837 3.77678 14.6813 4.97325ZM9.99964 16.6666C10.7657 16.6666 11.5242 16.5157 12.232 16.2225C12.9397 15.9294 13.5828 15.4997 14.1244 14.958C14.6661 14.4164 15.0958 13.7733 15.3889 13.0656C15.6821 12.3578 15.833 11.5993 15.833 10.8333C15.833 10.0672 15.6821 9.30866 15.3889 8.60093C15.0958 7.8932 14.6661 7.25014 14.1244 6.70846C13.5828 6.16679 12.9397 5.73711 12.232 5.44395C11.5242 5.1508 10.7657 4.99992 9.99964 4.99992C8.45255 4.99992 6.96881 5.6145 5.87485 6.70846C4.78089 7.80242 4.16631 9.28615 4.16631 10.8333C4.16631 12.3803 4.78089 13.8641 5.87485 14.958C6.96881 16.052 8.45255 16.6666 9.99964 16.6666ZM9.16631 6.66658H10.833V11.6666H9.16631V6.66658ZM6.66631 0.833252H13.333V2.49992H6.66631V0.833252Z" class="fill-secondary dark:fill-stroke-8" />
  </g>
  <defs><clipPath id="clip0_blog_time"><rect width="20" height="20" fill="white" /></clipPath></defs>
</svg>`;

/**
 * Create a blog card HTML element
 * @param {Object} post - Blog post data
 * @param {number} index - Index for animation delay
 * @returns {string} - HTML string
 */
function createBlogCard(post, index) {
  const delay = 0.2 + (index % 2) * 0.2;
  const imageUrl = post.image_url || DEFAULT_IMAGE;
  const category = post.category || 'HOA News';
  const categoryDisplay = category.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return `
    <article data-ns-animate data-delay="${delay}" class="group">
      <div
        class="bg-background-1 dark:bg-background-5 rounded-[20px] overflow-hidden relative scale-100 hover:scale-[102%] transition-transform duration-500 hover:transition-transform hover:duration-500"
      >
        <figure
          class="xl:min-h-[310px] xl:max-h-[310px] rounded-b-[20px] overflow-hidden max-w-full"
        >
          <img
            src="${imageUrl}"
            alt="${post.image_alt || post.title}"
            loading="lazy"
            class="w-full h-full object-cover object-center"
          />
        </figure>
        <div class="p-4 md:p-6 lg:p-8 space-y-4 rounded-b-[20px]">
          <span class="badge badge-cyan" aria-label="Article category">${categoryDisplay}</span>

          <div class="flex items-center gap-4">
            <time
              class="flex items-center gap-2 text-tagline-2 font-medium text-secondary/60 dark:text-accent/60"
              datetime="${formatDatetime(post.published_at)}"
            >
              ${CALENDAR_ICON}
              ${formatDate(post.published_at)}
            </time>

            <div aria-hidden="true" class="w-px inline-block h-3 bg-stroke-2 dark:bg-stroke-6"></div>

            <time
              class="flex items-center gap-2 text-tagline-2 font-medium text-secondary/60 dark:text-accent/60"
              datetime="PT${post.read_time_minutes || 5}M"
            >
              ${CLOCK_ICON}
              ${post.read_time_minutes || 5} min
            </time>
          </div>

          <h3 class="font-normal sm:text-heading-5 text-tagline-1 line-clamp-2">
            <a
              href="./blog/post.html?slug=${post.slug}"
              aria-label="Read full article about ${post.title}"
            >
              ${post.title}
            </a>
          </h3>

          <p class="text-tagline-2 font-normal text-secondary/60 dark:text-accent/60 line-clamp-2">
            ${post.excerpt || ''}
          </p>

          <div class="mt-8">
            <a
              href="./blog/post.html?slug=${post.slug}"
              class="group/btn-v2 flex items-center gap-x-2 transition-colors duration-500 btn-md-v2 btn-v2-white hover:btn-primary-v2 text-tagline-1"
            >
              <span>Read now</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7.3125 4.5L11.8125 9L7.3125 13.5" class="stroke-secondary dark:stroke-accent group-hover/btn-v2:stroke-accent" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </article>
  `;
}

/**
 * Create loading skeleton cards
 * @param {number} count - Number of skeleton cards
 * @returns {string} - HTML string
 */
function createSkeletonCards(count = 6) {
  return Array(count)
    .fill(0)
    .map(
      () => `
    <article class="group animate-pulse">
      <div class="bg-background-1 dark:bg-background-5 rounded-[20px] overflow-hidden">
        <div class="xl:min-h-[310px] xl:max-h-[310px] bg-gray-200 dark:bg-gray-700"></div>
        <div class="p-4 md:p-6 lg:p-8 space-y-4">
          <div class="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div class="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div class="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div class="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-full mt-8"></div>
        </div>
      </div>
    </article>
  `
    )
    .join('');
}

/**
 * Create error message HTML
 * @param {string} message - Error message
 * @returns {string} - HTML string
 */
function createErrorMessage(message) {
  return `
    <div class="col-span-full text-center py-12">
      <p class="text-secondary/60 dark:text-accent/60 text-lg">${message}</p>
      <button onclick="window.loadBlogPosts()" class="btn btn-primary btn-md mt-4">
        Try Again
      </button>
    </div>
  `;
}

/**
 * Create pagination HTML
 * @param {Object} pagination - Pagination data
 * @returns {string} - HTML string
 */
function createPagination(pagination) {
  if (!pagination || pagination.total <= pagination.limit) {
    return '';
  }

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  let html = '<ul data-ns-animate data-delay="0.6" class="flex items-center justify-center mt-14 gap-2">';

  // Previous button
  if (currentPage > 1) {
    html += `
      <li class="group">
        <button
          onclick="window.loadBlogPosts(${(currentPage - 2) * pagination.limit})"
          class="flex w-10 h-10 items-center justify-center border border-stroke-3 dark:border-stroke-7 rounded-full hover:bg-primary-500 duration-300 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
            <path d="M12.5 6H1.5M1.5 6L6 1.5M1.5 6L6 10.5" class="stroke-secondary dark:stroke-accent group-hover:stroke-white duration-300" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </li>
    `;
  }

  // Page numbers
  for (let i = 1; i <= Math.min(totalPages, 5); i++) {
    const isActive = i === currentPage;
    html += `
      <li class="group ${isActive ? 'page-active' : ''}">
        <button
          onclick="window.loadBlogPosts(${(i - 1) * pagination.limit})"
          class="flex w-10 h-10 items-center text-tagline-2 font-medium justify-center rounded-full dark:text-accent hover:bg-primary-500 duration-300 hover:text-accent group-[.page-active]:bg-primary-500 group-[.page-active]:text-accent dark:group-[.page-active]:text-accent"
        >
          ${i}
        </button>
      </li>
    `;
  }

  // Next button
  if (pagination.has_more) {
    html += `
      <li class="group">
        <button
          onclick="window.loadBlogPosts(${currentPage * pagination.limit})"
          class="flex w-10 h-10 items-center justify-center border border-stroke-3 dark:border-stroke-7 rounded-full hover:bg-primary-500 duration-300 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
            <path d="M1.5 6H12.5M12.5 6L8 1.5M12.5 6L8 10.5" class="stroke-secondary dark:stroke-accent group-hover:stroke-white duration-300" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </li>
    `;
  }

  html += '</ul>';
  return html;
}

/**
 * Initialize blog list
 * @param {string} containerId - Container element ID
 * @param {Object} options - Options
 */
async function initBlogList(containerId = 'blog-posts-container', options = {}) {
  console.log('initBlogList called with:', containerId, options);

  const container = document.getElementById(containerId);
  const paginationContainer = document.getElementById('blog-pagination');

  if (!container) {
    console.warn('Blog posts container not found');
    return;
  }

  console.log('Container found, showing loading state...');
  // Show loading state
  container.innerHTML = createSkeletonCards(options.limit || 10);

  try {
    console.log('Fetching blog posts from API...');
    const data = await fetchBlogPosts({
      limit: options.limit || 10,
      offset: options.offset || 0,
      category: options.category || '',
    });

    console.log('API response:', data);

    if (!data.posts || data.posts.length === 0) {
      console.log('No posts found');
      container.innerHTML = createErrorMessage('No blog posts found.');
      return;
    }

    console.log(`Rendering ${data.posts.length} blog posts...`);
    // Render blog cards
    container.innerHTML = data.posts.map((post, index) => createBlogCard(post, index)).join('');

    // Render pagination
    if (paginationContainer) {
      paginationContainer.innerHTML = createPagination(data.pagination);
    }

    // Re-initialize animations if available
    if (window.revealElements) {
      window.revealElements();
    }

    console.log('Blog posts rendered successfully');
  } catch (error) {
    console.error('Error loading blog posts:', error);
    container.innerHTML = createErrorMessage('Failed to load blog posts. Please try again later.');
  }
}

// Global function for pagination
window.loadBlogPosts = function (offset = 0) {
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get('category') || '';
  initBlogList('blog-posts-container', { offset, category });
};

// Auto-initialize function
function autoInit() {
  const container = document.getElementById('blog-posts-container');
  if (container) {
    console.log('Blog list container found, initializing...');
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category') || '';
    const offset = parseInt(urlParams.get('offset') || '0', 10);
    initBlogList('blog-posts-container', { category, offset });
  }
}

// Try multiple initialization strategies
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  // DOM already loaded, initialize immediately
  autoInit();
}

// Also expose globally for manual initialization
window.initBlogList = initBlogList;

export { initBlogList, createBlogCard };
