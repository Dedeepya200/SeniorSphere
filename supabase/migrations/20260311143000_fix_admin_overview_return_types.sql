CREATE OR REPLACE FUNCTION public.get_admin_community_overview()
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  area text,
  member_count bigint,
  moderator_id uuid,
  moderator_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view community overview';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.city,
    c.area,
    COALESCE(member_stats.member_count, 0) AS member_count,
    c.moderator_id,
    moderator_user.email::text AS moderator_email
  FROM public.communities c
  LEFT JOIN (
    SELECT p.community_id, count(*)::bigint AS member_count
    FROM public.profiles p
    WHERE p.community_id IS NOT NULL
    GROUP BY p.community_id
  ) AS member_stats
    ON member_stats.community_id = c.id
  LEFT JOIN auth.users AS moderator_user
    ON moderator_user.id = c.moderator_id
  ORDER BY c.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_moderator_directory()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  community_id uuid,
  community_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view moderators';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    p.display_name,
    p.community_id,
    p.community
  FROM auth.users u
  JOIN public.user_roles ur
    ON ur.user_id = u.id
   AND ur.role = 'moderator'
  LEFT JOIN public.profiles p
    ON p.user_id = u.id
  ORDER BY COALESCE(p.display_name, u.email::text);
END;
$$;
