const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://qjfnytssuyhtkxdgszdg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZm55dHNzdXlodGt4ZGdzemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI3MjYsImV4cCI6MjA5NjM4ODcyNn0.ZWgVN7ucLKalBvMpmM8gH_ICpI4j0xide_tk0FvOMTE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from("audit_log").select("*");
  console.log("Error:", error);
  console.log("Data length:", data ? data.length : null);
}
run();
