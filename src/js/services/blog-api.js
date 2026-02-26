/**
 * Blog API Service
 * Handles fetching blog posts from the backend API
 */

// API base URL - uses config if available, otherwise defaults to production
function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.SUPABASE_CONFIG?.url) {
    return window.SUPABASE_CONFIG.url;
  }
  return 'https://dmhoa-246713e0bd92.herokuapp.com';
}

const API_BASE_URL = getApiBaseUrl();

/**
 * Fetch list of published blog posts
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of posts to fetch (1-50, default 10)
 * @param {number} options.offset - Pagination offset (default 0)
 * @param {string} options.category - Optional category filter
 * @returns {Promise<{posts: Array, pagination: Object}>}
 */
export async function fetchBlogPosts({ limit = 10, offset = 0, category = '' } = {}) {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });

    if (category) {
      params.append('category', category);
    }

    const response = await fetch(`${API_BASE_URL}/api/blog-posts?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch blog posts: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    throw error;
  }
}

/**
 * Fetch a single blog post by slug
 * @param {string} slug - The blog post slug
 * @returns {Promise<Object>} - The blog post data
 */
export async function fetchBlogPost(slug) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blog-post/${slug}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Blog post not found');
      }
      throw new Error(`Failed to fetch blog post: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching blog post:', error);
    throw error;
  }
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date (e.g., "15.01.2026")
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Format date for datetime attribute
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date (e.g., "2026-01-15")
 */
export function formatDatetime(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Parse markdown content to HTML
 * Basic markdown parser for blog content
 * @param {string} markdown - Markdown content
 * @returns {string} - HTML content
 */
export function parseMarkdown(markdown) {
  if (!markdown) return '';

  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h4 data-ns-animate data-delay="0.2">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 data-ns-animate data-delay="0.2">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h3 data-ns-animate data-delay="0.1">$1</h3>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Unordered lists
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li data-ns-animate data-delay="0.1">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/gim, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.*)$/gim, '<li data-ns-animate data-delay="0.1">$1</li>');

  // Paragraphs - wrap text blocks in p tags
  html = html.replace(/^(?!<[hulo]|<li)(.*\S.*)$/gim, '<p data-ns-animate data-delay="0.2">$1</p>');

  // Line breaks
  html = html.replace(/\n\n+/g, '\n');

  return html;
}

// Export to window for non-module usage
window.BlogAPI = {
  fetchBlogPosts,
  fetchBlogPost,
  formatDate,
  formatDatetime,
  parseMarkdown,
};
