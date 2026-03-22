CREATE OR REPLACE FUNCTION public.assign_community_moderator_internal(
  _community_id uuid,
  _moderator_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  community_name text;
  previous_moderator_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _moderator_user_id
      AND role = 'moderator'
  ) THEN
    RAISE EXCEPTION 'User % is not a moderator', _moderator_user_id;
  END IF;

  SELECT name
  INTO community_name
  FROM public.communities
  WHERE id = _community_id;

  IF community_name IS NULL THEN
    RAISE EXCEPTION 'Community % not found', _community_id;
  END IF;

  SELECT moderator_id
  INTO previous_moderator_id
  FROM public.communities
  WHERE id = _community_id;

  UPDATE public.communities
  SET moderator_id = _moderator_user_id
  WHERE id = _community_id;

  IF previous_moderator_id IS NOT NULL AND previous_moderator_id <> _moderator_user_id THEN
    UPDATE public.profiles
    SET community_id = NULL,
        community = '',
        updated_at = now()
    WHERE user_id = previous_moderator_id;
  END IF;

  UPDATE public.profiles
  SET community_id = _community_id,
      community = community_name,
      updated_at = now()
  WHERE user_id = _moderator_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE (
  total_communities bigint,
  total_users bigint,
  pending_requests bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view dashboard stats';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*)::bigint FROM public.communities),
    (SELECT count(*)::bigint FROM public.profiles),
    (SELECT count(*)::bigint FROM public.community_requests);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_community_requests()
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  area text,
  request_count integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view community requests';
  END IF;

  RETURN QUERY
  SELECT
    cr.id,
    cr.name,
    cr.city,
    cr.area,
    cr.request_count,
    cr.created_at
  FROM public.community_requests cr
  ORDER BY cr.request_count DESC, cr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_community_requests() TO authenticated;
