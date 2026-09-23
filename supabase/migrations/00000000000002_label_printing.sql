-- Support for printed box labels: a "this side up" flag alongside the
-- existing fragile/heavy badges, and a household-level contact line for the
-- label's "if found, please contact" footer.

alter table containers add column this_side_up boolean not null default false;
alter table households add column contact_info text;

-- Contact info is a shared household setting (like the label itself, any
-- member should be able to set it) rather than owner-only, unlike the
-- household name/join code — so this runs as security definer and checks
-- membership instead of relying on the owner-only households update policy.
create or replace function update_household_contact(p_household_id uuid, p_contact_info text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_household_member(p_household_id) then
    raise exception 'Not a member of this household';
  end if;
  update households set contact_info = p_contact_info where id = p_household_id;
end;
$$;
