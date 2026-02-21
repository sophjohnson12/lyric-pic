create or replace function flag_lyric(lyric_id int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update lyric
  set is_flagged = true, flagged_by = 'USER'
  where id = lyric_id;
end;
$$;

grant execute on function flag_lyric(int) to anon;
