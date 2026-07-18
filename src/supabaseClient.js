import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dcpvtqayaapbbolfnqvj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjcHZ0cWF5YWFwYmJvbGZucXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjI4ODEsImV4cCI6MjA5OTkzODg4MX0.ee7z5wzYYRvSspow4cTzXDPGYdjXCZzSpgeLQoBN2S0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
