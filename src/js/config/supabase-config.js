// Backend Configuration for Frontend
// Note: These are PUBLIC keys, safe to expose in frontend
const SUPABASE_CONFIG = {
  url: 'https://dmhoa-246713e0bd92.herokuapp.com',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHdya2hudHl1dHBua2x4c3Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MDY3NTQsImV4cCI6MjA4MjA4Mjc1NH0.dFkoPjA60c9MH6C_YWYChehG3nKHHK3VKmKj0w722SU'
};

// Export for use in other files
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
