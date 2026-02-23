/**
 * Dynamic Blog Detail Page
 * Fetches and renders a single blog post from the API
 */

import { fetchBlogPost, formatDate, formatDatetime, parseMarkdown } from '../services/blog-api.js';

// Default placeholder image
const DEFAULT_IMAGE = './images/ns-img-492.png';
const DEFAULT_AVATAR = './images/ns-avatar-6.png';

/**
 * Get slug from URL
 * Supports both /blog/slug.html and /blog-post/slug formats
 * @returns {string|null} - The blog post slug
 */
function getSlugFromUrl() {
  const path = window.location.pathname;

  // Match /blog/slug.html pattern
  const htmlMatch = path.match(/\/blog\/([^/]+)\.html$/);
  if (htmlMatch) {
    return htmlMatch[1];
  }

  // Match /blog-post/slug pattern
  const apiMatch = path.match(/\/blog-post\/([^/]+)$/);
  if (apiMatch) {
    return apiMatch[1];
  }

  // Match /blog-slug.html pattern (legacy)
  const legacyMatch = path.match(/\/blog-([^/]+)\.html$/);
  if (legacyMatch) {
    return legacyMatch[1];
  }

  // Check for slug in data attribute
  const container = document.getElementById('blog-post-container');
  if (container && container.dataset.slug) {
    return container.dataset.slug;
  }

  return null;
}

/**
 * Create blog post header HTML
 * @param {Object} post - Blog post data
 * @returns {string} - HTML string
 */
function createPostHeader(post) {
  const imageUrl = post.image_url || DEFAULT_IMAGE;

  return `
    <div class="space-y-3 max-w-[1209px] mx-auto">
      <h2 data-ns-animate data-delay="0.1" class="max-w-[884px]">
        ${post.title}
      </h2>
      <div class="flex items-center gap-3">
        <figure
          data-ns-animate
          data-delay="0.2"
          class="size-12 rounded-full overflow-hidden bg-[#ECEAED]"
        >
          <img
            src="${DEFAULT_AVATAR}"
            class="object-center object-cover"
            alt="${post.author || 'DisputeMyHOA Team'}'s avatar"
            width="48"
            height="48"
            loading="lazy"
          />
        </figure>
        <div>
          <h3 data-ns-animate data-delay="0.3" class="text-tagline-1 font-medium">${post.author || 'DisputeMyHOA Team'}</h3>
          <time
            datetime="${formatDatetime(post.published_at)}"
            data-ns-animate
            data-delay="0.4"
            class="text-tagline-2 flex items-center gap-2 font-normal text-secondary/60 dark:text-accent/60"
          >
            ${formatDate(post.published_at)} <span>&#8226;</span> ${post.read_time_minutes || 5} min read
          </time>
        </div>
      </div>
    </div>
    <figure
      data-ns-animate
      data-delay="0.4"
      class="max-w-full rounded-lg md:rounded-4xl my-10 md:my-[70px] overflow-hidden"
    >
      <img
        src="${imageUrl}"
        class="w-full h-full object-cover object-center"
        alt="${post.image_alt || post.title}"
      />
    </figure>
  `;
}

/**
 * Create blog post content HTML
 * @param {Object} post - Blog post data
 * @returns {string} - HTML string
 */
function createPostContent(post) {
  const content = parseMarkdown(post.content);

  return `
    <article class="details-body">
      ${content}
    </article>
  `;
}

/**
 * Create share buttons HTML
 * @param {Object} post - Blog post data
 * @returns {string} - HTML string
 */
function createShareButtons(post) {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(post.title);

  return `
    <div data-ns-animate data-delay="0.2" class="space-y-4 max-w-[950px] mx-auto mt-[70px]">
      <h5 class="text-heading-6">Share this post</h5>
      <ul class="flex items-center gap-2.5">
        <li class="group/social-link border border-secondary/10 dark:border-stroke-7 inline-flex items-center justify-center p-2.5 rounded-full transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-lg hover:bg-primary-500 hover:border-primary-500">
          <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M18.75 10.0535C18.75 5.19145 14.8325 1.25 10 1.25C5.16751 1.25 1.25 5.19145 1.25 10.0535C1.25 14.4475 4.44973 18.0896 8.63281 18.75V12.5982H6.41113V10.0535H8.63281V8.11396C8.63281 5.90759 9.93916 4.68886 11.9378 4.68886C12.8948 4.68886 13.8965 4.8608 13.8965 4.8608V7.02728H12.7932C11.7063 7.02728 11.3672 7.70594 11.3672 8.40282V10.0535H13.7939L13.406 12.5982H11.3672V18.75C15.5503 18.0896 18.75 14.4475 18.75 10.0535Z" class="fill-secondary dark:fill-accent group-hover/social-link:fill-accent transition-all duration-300 ease-in-out" />
            </svg>
          </a>
        </li>
        <li class="group/social-link border border-secondary/10 dark:border-stroke-7 inline-flex items-center justify-center p-2.5 rounded-full transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-lg hover:bg-primary-500 hover:border-primary-500">
          <a href="https://twitter.com/intent/tweet?url=${url}&text=${title}" target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15.75 1.875H18.6562L12.4062 9.0625L19.6875 18.125H14.0312L9.5 12.3125L4.3125 18.125H1.40625L8.0625 10.5L1.0625 1.875H6.875L10.9688 7.1875L15.75 1.875ZM14.75 16.5H16.3125L6.0625 3.5H4.375L14.75 16.5Z" class="fill-secondary dark:fill-accent group-hover/social-link:fill-accent transition-all duration-300 ease-in-out" />
            </svg>
          </a>
        </li>
        <li class="group/social-link border border-secondary/10 dark:border-stroke-7 inline-flex items-center justify-center p-2.5 rounded-full transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-lg hover:bg-primary-500 hover:border-primary-500">
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10.0007 1C6.35854 1 3.07729 3.19375 1.6851 6.55469C0.292911 9.91562 1.06166 13.7875 3.6351 16.3609C6.20854 18.9344 10.0804 19.7031 13.4413 18.3109C16.807 16.9234 19.0007 13.6422 19.0007 10C19.0007 5.03125 14.9695 1 10.0007 1ZM7.3851 14.7391H5.42104V8.41094H7.3851V14.7391ZM6.40072 7.54844C5.93666 7.54844 5.51947 7.27187 5.34135 6.84531C5.16322 6.41875 5.25697 5.92656 5.5851 5.59844C5.90854 5.27031 6.40072 5.17188 6.82729 5.34531C7.25385 5.51875 7.5351 5.93594 7.53979 6.39531C7.53979 7.03281 7.03354 7.54375 6.40072 7.54844ZM14.7398 14.7391H12.7757V11.6594C12.7757 10.9234 12.7617 9.98594 11.7538 9.98594C10.746 9.98594 10.5679 10.7828 10.5679 11.6078V14.7391H8.61322V8.41094H10.4976V9.27344H10.5257C10.7882 8.77656 11.4257 8.25156 12.382 8.25156C14.3695 8.25156 14.7351 9.55937 14.7351 11.2609V14.7391H14.7398Z" class="fill-secondary dark:fill-accent group-hover/social-link:fill-accent transition-all duration-300 ease-in-out" />
            </svg>
          </a>
        </li>
      </ul>
    </div>
  `;
}

/**
 * Create tags section HTML
 * @param {Object} post - Blog post data
 * @returns {string} - HTML string
 */
function createTagsSection(post) {
  if (!post.tags || post.tags.length === 0) {
    return '';
  }

  const tagLinks = post.tags
    .map(
      (tag) => `
    <a href="./blog.html?category=${encodeURIComponent(tag)}" class="badge badge-cyan hover:bg-primary-500 hover:text-accent transition-colors">
      ${tag}
    </a>
  `
    )
    .join('');

  return `
    <div data-ns-animate data-delay="0.2" class="space-y-4 max-w-[950px] mx-auto mt-8">
      <h5 class="text-heading-6">Tags</h5>
      <div class="flex flex-wrap gap-2">
        ${tagLinks}
      </div>
    </div>
  `;
}

/**
 * Create loading skeleton
 * @returns {string} - HTML string
 */
function createLoadingSkeleton() {
  return `
    <div class="animate-pulse">
      <div class="space-y-3 max-w-[1209px] mx-auto">
        <div class="h-12 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div class="flex items-center gap-3">
          <div class="size-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          </div>
        </div>
      </div>
      <div class="h-[400px] bg-gray-200 dark:bg-gray-700 rounded-4xl my-10 md:my-[70px]"></div>
      <article class="details-body space-y-4">
        <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </article>
    </div>
  `;
}

/**
 * Create error message
 * @param {string} message - Error message
 * @returns {string} - HTML string
 */
function createErrorMessage(message) {
  return `
    <div class="text-center py-20">
      <h2 class="text-heading-3 mb-4">Blog Post Not Found</h2>
      <p class="text-secondary/60 dark:text-accent/60 text-lg mb-8">${message}</p>
      <a href="./blog.html" class="btn btn-primary btn-md">
        Back to Blog
      </a>
    </div>
  `;
}

/**
 * Update page meta tags
 * @param {Object} post - Blog post data
 */
function updateMetaTags(post) {
  // Update title
  document.title = `${post.seo_title || post.title} | DisputeMyHOA`;

  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', post.seo_description || post.excerpt || '');
  }

  // Update Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', post.seo_title || post.title);
  }

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    ogDescription.setAttribute('content', post.seo_description || post.excerpt || '');
  }

  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage && post.image_url) {
    ogImage.setAttribute('content', post.image_url);
  }
}

/**
 * Initialize blog detail page
 * @param {string} containerId - Container element ID
 */
async function initBlogDetail(containerId = 'blog-post-container') {
  const container = document.getElementById(containerId);

  if (!container) {
    console.warn('Blog post container not found');
    return;
  }

  const slug = getSlugFromUrl();

  if (!slug) {
    container.innerHTML = createErrorMessage('Invalid blog post URL.');
    return;
  }

  // Show loading state
  container.innerHTML = createLoadingSkeleton();

  try {
    const post = await fetchBlogPost(slug);

    // Update meta tags
    updateMetaTags(post);

    // Render blog post
    container.innerHTML = `
      ${createPostHeader(post)}
      ${createPostContent(post)}
      ${createTagsSection(post)}
      ${createShareButtons(post)}
    `;

    // Re-initialize animations if available
    if (window.revealElements) {
      window.revealElements();
    }
  } catch (error) {
    console.error('Error loading blog post:', error);

    if (error.message === 'Blog post not found') {
      container.innerHTML = createErrorMessage('The blog post you are looking for does not exist.');
    } else {
      container.innerHTML = createErrorMessage('Failed to load blog post. Please try again later.');
    }
  }
}

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('blog-post-container');
  if (container) {
    initBlogDetail('blog-post-container');
  }
});

export { initBlogDetail, getSlugFromUrl };
