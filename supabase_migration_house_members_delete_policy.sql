-- Run this once in the Supabase SQL editor for the wellome project.
--
-- house_members has RLS enabled but no delete policy was ever added, so
-- both "Leave house" and "Remove member" in SettingsPage currently do
-- nothing -- the delete matches zero rows under RLS's default-deny with no
-- matching policy. This adds one: a user can always remove their own
-- membership (leave), and the house owner can remove anyone's.

create policy "members can leave, owner can remove"
  on house_members for delete
  using (
    user_id = auth.uid()
    or house_id in (select id from houses where created_by = auth.uid())
  );
