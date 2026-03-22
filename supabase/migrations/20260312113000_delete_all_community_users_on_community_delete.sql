CREATE OR REPLACE FUNCTION public.admin_delete_community(_community_id uuid)
RETURNS TABLE (
  deleted_community_id uuid,
  deleted_community_name text,
  retired_moderator_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  community_record public.communities%ROWTYPE;
  moderator_email_value text;
  community_user_ids uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete communities';
  END IF;

  SELECT *
  INTO community_record
  FROM public.communities
  WHERE id = _community_id
  FOR UPDATE;

  IF community_record.id IS NULL THEN
    RAISE EXCEPTION 'Community not found';
  END IF;

  SELECT email
  INTO moderator_email_value
  FROM auth.users
  WHERE id = community_record.moderator_id;

  SELECT array_agg(p.user_id)
  INTO community_user_ids
  FROM public.profiles p
  WHERE p.community_id = community_record.id;

  DELETE FROM public.announcements
  WHERE community_id = community_record.id;

  DELETE FROM public.community_posts
  WHERE community_id = community_record.id;

  DELETE FROM public.events
  WHERE community_id = community_record.id;

  DELETE FROM public.skills
  WHERE community_id = community_record.id;

  DELETE FROM public.help_requests
  WHERE community_id = community_record.id;

  UPDATE public.communities
  SET moderator_id = NULL
  WHERE id = community_record.id;

  IF community_user_ids IS NOT NULL AND array_length(community_user_ids, 1) > 0 THEN
    DELETE FROM auth.users
    WHERE id = ANY(community_user_ids);
  END IF;

  DELETE FROM public.communities
  WHERE id = community_record.id;

  deleted_community_id := community_record.id;
  deleted_community_name := community_record.name;
  retired_moderator_email := moderator_email_value;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_community(uuid) TO authenticated;
