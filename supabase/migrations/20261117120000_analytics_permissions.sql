-- Analytics table permissions — fix + hardening (2026-11-17)
--
-- Found in the pre-exhibition audit:
--  * The visitor-geo Edge Function writes visitor_locations as service_role,
--    but service_role had no privileges on that table, so every IP-fallback
--    write failed with "permission denied for table visitor_locations".
--  * anon (any site visitor) held TRUNCATE on the analytics tables. TRUNCATE
--    bypasses row-level security, so one request could empty a table.
--  * anon could UPDATE visitor_locations rows that weren't its own.
--
-- What each role needs after this:
--  * anon          INSERT only. The site never reads, updates or deletes;
--                  src/lib/geo.js does a single plain INSERT per visitor.
--  * authenticated SELECT (the /admin dashboard) + INSERT (the site still
--                  tracks if an admin browses it while signed in).
--  * service_role  SELECT/INSERT/UPDATE on visitor_locations (visitor-geo
--                  upserts by visitor_id).
--
-- Grants and revokes only: no table, column, row or policy is dropped or
-- changed, and no data is touched. Safe to run more than once.

begin;

grant select, insert, update on table public.visitor_locations to service_role;

revoke truncate, delete, update, references, trigger on table
  public.floor_plan_events,
  public.unit_selection_events,
  public.visitor_page_views,
  public.website_heatmap_events,
  public.visitor_locations
from anon, authenticated;

commit;
