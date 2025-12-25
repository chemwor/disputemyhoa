// Supabase Configuration for Frontend
// Note: These are PUBLIC keys, safe to expose in frontend
const SUPABASE_CONFIG = {
  url: 'https://yvdwrkhntyutpnklxsvz.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE' // Replace with your actual anon key from Supabase dashboard
};

// Export for use in other files
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
