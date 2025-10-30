// /js/supabaseClient.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://chzofyepqjomxfekvoux.supabase.co';           // <-- PONÉ EL TUYO (https)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoem9meWVwcWpvbXhmZWt2b3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjQ2MjMsImV4cCI6MjA3MzAwMDYyM30.gldAo40K-YCPNdzgvDsqDpDtvYCTPn7KnVsww_RYFUw';                      // <-- PONÉ TU ANON KEY (no el service role)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: { "x-client-info": "codent-web/tienda" }
  }
});

//'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoem9meWVwcWpvbXhmZWt2b3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjQ2MjMsImV4cCI6MjA3MzAwMDYyM30.gldAo40K-YCPNdzgvDsqDpDtvYCTPn7KnVsww_RYFUw';
