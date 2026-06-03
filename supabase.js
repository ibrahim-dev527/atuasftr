// ============================================================
// supabase.js — Supabase Configuration
// ATUAS Trip Registration System
// Developed by Ibrahim Mohammed Lotsu | Ibratech
// ============================================================

const SUPABASE_URL  = 'https://xumvniehwttrkbpeeyxb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bXZuaWVod3R0cmticGVleXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDUzNTAsImV4cCI6MjA5NjAyMTM1MH0.sSp5BNy6xdDdYV4RnEe9wdy0-xUY90XBf_Lc-kXOHNc';

/* -------------------------------------------------------
   Supabase client is initialised AFTER the CDN loads.
   Both index.html and admin.html call this file AFTER
   the Supabase CDN <script> tag, so window.supabase is
   always available here.
------------------------------------------------------- */
const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/*
  REQUIRED TABLE  (run this SQL in your Supabase SQL editor)
  ----------------------------------------------------------
  CREATE TABLE trip_registrations (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name       text NOT NULL,
    index_number    text NOT NULL,
    contact_number  text NOT NULL,
    gender          text NOT NULL,
    availability    text NOT NULL,
    created_at      timestamptz DEFAULT now()
  );

  -- Enable Row-Level Security and allow anon inserts/selects
  ALTER TABLE trip_registrations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "anon_select" ON trip_registrations FOR SELECT USING (true);
  CREATE POLICY "anon_insert" ON trip_registrations FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon_delete" ON trip_registrations FOR DELETE USING (true);

  -- Enable Realtime
  ALTER PUBLICATION supabase_realtime ADD TABLE trip_registrations;
*/