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

  UPDATE public.profiles
  SET community_id = NULL,
      community = '',
      updated_at = now()
  WHERE community_id = community_record.id;

  IF community_record.moderator_id IS NOT NULL THEN
    UPDATE public.profiles
    SET community_id = NULL,
        community = '',
        updated_at = now()
    WHERE user_id = community_record.moderator_id;

    DELETE FROM public.user_roles
    WHERE user_id = community_record.moderator_id
      AND role = 'moderator';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (community_record.moderator_id, 'senior')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  UPDATE public.communities
  SET moderator_id = NULL
  WHERE id = community_record.id;

  DELETE FROM public.communities
  WHERE id = community_record.id;

  deleted_community_id := community_record.id;
  deleted_community_name := community_record.name;
  retired_moderator_email := moderator_email_value;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_community(uuid) TO authenticated;
