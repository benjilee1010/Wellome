-- Run this once in the Supabase SQL editor for the wellome project.
--
-- RulesPage used to read votes_approve/votes_reject into JS, edit the
-- arrays, and write the whole row back. If two housemates voted at close
-- to the same time, the second write could overwrite the first's vote
-- (classic read-modify-write race -- the same class of bug that caused
-- duplicate chores). These functions do the read-modify-write as a single
-- atomic statement inside Postgres, using `for update` to serialize
-- concurrent calls on the same rule.
--
-- Both run as SECURITY INVOKER (the default), so the existing RLS policies
-- on house_rules still apply to the calling user.

create or replace function cast_rule_vote(
  p_rule_id uuid, p_user_id uuid, p_approve boolean, p_member_count int
) returns void
language plpgsql
as $$
declare
  v_approve uuid[];
  v_reject uuid[];
  v_threshold int;
begin
  select votes_approve, votes_reject into v_approve, v_reject
    from house_rules where id = p_rule_id for update;

  v_approve := array_remove(coalesce(v_approve, '{}'), p_user_id);
  v_reject := array_remove(coalesce(v_reject, '{}'), p_user_id);
  if p_approve then
    v_approve := array_append(v_approve, p_user_id);
  else
    v_reject := array_append(v_reject, p_user_id);
  end if;

  v_threshold := ceil(p_member_count * 0.75);
  update house_rules set
    votes_approve = v_approve,
    votes_reject = v_reject,
    status = case
      when cardinality(v_approve) >= v_threshold then 'approved'
      when cardinality(v_reject) > p_member_count - v_threshold then 'rejected'
      else 'pending'
    end
  where id = p_rule_id;
end;
$$;

create or replace function cast_rule_removal_vote(
  p_rule_id uuid, p_user_id uuid, p_member_count int
) returns void
language plpgsql
as $$
declare
  v_approve uuid[];
  v_reject uuid[];
begin
  select votes_approve, votes_reject into v_approve, v_reject
    from house_rules where id = p_rule_id for update;

  v_approve := array_remove(coalesce(v_approve, '{}'), p_user_id);
  v_reject := array_append(array_remove(coalesce(v_reject, '{}'), p_user_id), p_user_id);

  if cardinality(v_reject) >= p_member_count then
    delete from house_rules where id = p_rule_id;
  else
    update house_rules set votes_approve = v_approve, votes_reject = v_reject where id = p_rule_id;
  end if;
end;
$$;

grant execute on function cast_rule_vote(uuid, uuid, boolean, int) to authenticated;
grant execute on function cast_rule_removal_vote(uuid, uuid, int) to authenticated;
