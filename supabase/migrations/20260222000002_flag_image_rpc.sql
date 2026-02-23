create or replace function flag_image(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update image
  set is_flagged = true, flagged_by = 'USER'
  where url = p_url;
end;
$$;

grant execute on function flag_image(text) to anon;
