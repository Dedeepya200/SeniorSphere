CREATE OR REPLACE FUNCTION public.assign_requesters_to_community_internal(
  _community_id uuid,
  _community_name text,
  _city text,
  _area text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p
  SET
    community_id = _community_id,
    community = _community_name,
    updated_at = now()
  FROM auth.users u
  WHERE u.id = p.user_id
    AND (
      p.community_id IS NULL
      OR p.community = ''
      OR p.community IS NULL
    )
    AND lower(trim(coalesce(u.raw_user_meta_data->>'requested_community_name', ''))) = lower(trim(_community_name))
    AND lower(trim(coalesce(u.raw_user_meta_data->>'requested_community_city', ''))) = lower(trim(_city))
    AND lower(trim(coalesce(u.raw_user_meta_data->>'requested_community_area', ''))) = lower(trim(_area));
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_community_request(_request_id uuid)
RETURNS TABLE (
  community_id uuid,
  moderator_user_id uuid,
  moderator_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.community_requests%ROWTYPE;
  created_community_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve community requests';
  END IF;

  SELECT *
  INTO request_row
  FROM public.community_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF request_row.id IS NULL THEN
    RAISE EXCEPTION 'Community request not found';
  END IF;

  IF request_row.request_count < 5 THEN
    RAISE EXCEPTION 'Community request is not eligible for approval';
  END IF;

  INSERT INTO public.communities (
    name,
    city,
    area,
    created_by,
    member_count
  )
  VALUES (
    request_row.name,
    request_row.city,
    request_row.area,
    auth.uid(),
    1
  )
  RETURNING id INTO created_community_id;

  PERFORM public.assign_requesters_to_community_internal(
    created_community_id,
    request_row.name,
    request_row.city,
    request_row.area
  );

  SELECT created_community_id, internal_result.moderator_user_id, internal_result.moderator_email
  INTO community_id, moderator_user_id, moderator_email
  FROM public.create_moderator_for_community_internal(created_community_id) AS internal_result;

  DELETE FROM public.community_requests
  WHERE id = request_row.id;

  RETURN NEXT;
END;
$$;

DO $$
DECLARE
  community_row record;
BEGIN
  FOR community_row IN
    SELECT c.id, c.name, c.city, c.area
    FROM public.communities c
  LOOP
    PERFORM public.assign_requesters_to_community_internal(
      community_row.id,
      community_row.name,
      coalesce(community_row.city, ''),
      coalesce(community_row.area, '')
    );
  END LOOP;
END;
$$;
