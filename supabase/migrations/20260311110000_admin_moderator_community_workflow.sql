CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS moderator_id uuid;

ALTER TABLE public.communities
DROP CONSTRAINT IF EXISTS communities_moderator_id_fkey;

ALTER TABLE public.communities
ADD CONSTRAINT communities_moderator_id_fkey
FOREIGN KEY (moderator_id)
REFERENCES auth.users(id)
ON DELETE RESTRICT;

ALTER TABLE public.communities
DROP CONSTRAINT IF EXISTS communities_moderator_id_key;

ALTER TABLE public.communities
ADD CONSTRAINT communities_moderator_id_key UNIQUE (moderator_id);

CREATE TABLE IF NOT EXISTS public.community_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text NOT NULL,
  area text NOT NULL,
  additional_notes text,
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_requests_name_city_area_key UNIQUE (name, city, area)
);

ALTER TABLE public.community_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own default role" ON public.user_roles;
CREATE POLICY "Users can insert own default role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('senior', 'family_member')
  );

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can create communities" ON public.communities;
DROP POLICY IF EXISTS "Creator can update community" ON public.communities;

CREATE POLICY "Admins create communities" ON public.communities
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update communities" ON public.communities
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete communities" ON public.communities
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view community requests" ON public.community_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own community requests" ON public.community_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = requested_by);

CREATE POLICY "Authenticated users create community requests" ON public.community_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Admins update community requests" ON public.community_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete community requests" ON public.community_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.generate_moderator_slug(_community_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
BEGIN
  cleaned := lower(trim(coalesce(_community_name, 'community')));
  cleaned := regexp_replace(cleaned, '\b(community|residency|residence|apartments|apartment|seniors|senior)\b', '', 'gi');
  cleaned := regexp_replace(cleaned, '[^a-z0-9]+', '', 'g');

  IF cleaned = '' THEN
    cleaned := 'community';
  END IF;

  RETURN cleaned;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_moderator_email(_community_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text := public.generate_moderator_slug(_community_name);
  candidate text;
  suffix integer := 0;
BEGIN
  LOOP
    candidate := CASE
      WHEN suffix = 0 THEN base_slug || '.moderator@seniorsphere.com'
      ELSE base_slug || suffix::text || '.moderator@seniorsphere.com'
    END;

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM auth.users
      WHERE lower(email) = lower(candidate)
    );

    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_community_request_internal(
  _requested_by uuid,
  _name text,
  _city text,
  _area text,
  _additional_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_name text := trim(coalesce(_name, ''));
  normalized_city text := trim(coalesce(_city, ''));
  normalized_area text := trim(coalesce(_area, ''));
  request_id uuid;
BEGIN
  IF normalized_name = '' OR normalized_city = '' OR normalized_area = '' THEN
    RAISE EXCEPTION 'Community request requires name, city, and area';
  END IF;

  INSERT INTO public.community_requests (
    requested_by,
    name,
    city,
    area,
    additional_notes
  )
  VALUES (
    _requested_by,
    normalized_name,
    normalized_city,
    normalized_area,
    NULLIF(trim(coalesce(_additional_notes, '')), '')
  )
  ON CONFLICT (name, city, area)
  DO UPDATE
  SET request_count = public.community_requests.request_count + 1,
      additional_notes = COALESCE(
        NULLIF(trim(coalesce(EXCLUDED.additional_notes, '')), ''),
        public.community_requests.additional_notes
      )
  RETURNING id INTO request_id;

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_auth_user_internal(
  _email text,
  _password text,
  _display_name text,
  _role public.app_role,
  _community_id uuid DEFAULT NULL,
  _community_name text DEFAULT NULL,
  _is_admin_created boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  normalized_email text := lower(trim(_email));
BEGIN
  IF normalized_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = normalized_email
  ) THEN
    RAISE EXCEPTION 'User with email % already exists', normalized_email;
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    normalized_email,
    extensions.crypt(_password, extensions.gen_salt('bf')),
    now(),
    now(),
    '',
    now(),
    '',
    NULL,
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'display_name', coalesce(nullif(trim(_display_name), ''), normalized_email),
      'role', _role,
      'community', _community_name,
      'community_id', _community_id,
      'is_admin_created', _is_admin_created
    ),
    now(),
    now()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', normalized_email
    ),
    'email',
    normalized_email,
    now(),
    now(),
    now()
  );

  RETURN new_user_id;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.create_moderator_for_community_internal(
  _community_id uuid,
  _email text DEFAULT NULL,
  _password text DEFAULT 'moderator@123'
)
RETURNS TABLE (moderator_user_id uuid, moderator_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  community_record public.communities%ROWTYPE;
  generated_email text;
  new_user_id uuid;
BEGIN
  SELECT *
  INTO community_record
  FROM public.communities
  WHERE id = _community_id
  FOR UPDATE;

  IF community_record.id IS NULL THEN
    RAISE EXCEPTION 'Community % not found', _community_id;
  END IF;

  IF community_record.moderator_id IS NOT NULL THEN
    RAISE EXCEPTION 'Community % already has a moderator', _community_id;
  END IF;

  generated_email := COALESCE(NULLIF(trim(coalesce(_email, '')), ''), public.generate_unique_moderator_email(community_record.name));

  new_user_id := public.create_auth_user_internal(
    generated_email,
    _password,
    community_record.name || ' Moderator',
    'moderator',
    community_record.id,
    community_record.name,
    true
  );

  PERFORM public.assign_community_moderator_internal(community_record.id, new_user_id);

  moderator_user_id := new_user_id;
  moderator_email := generated_email;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_moderator_for_community(
  _community_id uuid,
  _email text DEFAULT NULL,
  _password text DEFAULT 'moderator@123'
)
RETURNS TABLE (moderator_user_id uuid, moderator_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create moderators';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.create_moderator_for_community_internal(_community_id, _email, _password);
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

  SELECT created_community_id, internal_result.moderator_user_id, internal_result.moderator_email
  INTO community_id, moderator_user_id, moderator_email
  FROM public.create_moderator_for_community_internal(created_community_id) AS internal_result;

  DELETE FROM public.community_requests
  WHERE id = request_row.id;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_community_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject community requests';
  END IF;

  DELETE FROM public.community_requests
  WHERE id = _request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reassign_community_moderator(
  _community_id uuid,
  _moderator_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reassign moderators';
  END IF;

  PERFORM public.assign_community_moderator_internal(_community_id, _moderator_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_replace_community_moderator(
  _community_id uuid,
  _password text DEFAULT 'moderator@123'
)
RETURNS TABLE (moderator_user_id uuid, moderator_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  community_record public.communities%ROWTYPE;
  generated_email text;
  new_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create replacement moderators';
  END IF;

  SELECT *
  INTO community_record
  FROM public.communities
  WHERE id = _community_id
  FOR UPDATE;

  IF community_record.id IS NULL THEN
    RAISE EXCEPTION 'Community not found';
  END IF;

  generated_email := public.generate_unique_moderator_email(community_record.name);

  new_user_id := public.create_auth_user_internal(
    generated_email,
    _password,
    community_record.name || ' Moderator',
    'moderator',
    community_record.id,
    community_record.name,
    true
  );

  PERFORM public.assign_community_moderator_internal(community_record.id, new_user_id);

  moderator_user_id := new_user_id;
  moderator_email := generated_email;
  RETURN NEXT;
END;
$$;

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
    moderator_user.email AS moderator_email
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
    u.email,
    p.display_name,
    p.community_id,
    p.community
  FROM auth.users u
  JOIN public.user_roles ur
    ON ur.user_id = u.id
   AND ur.role = 'moderator'
  LEFT JOIN public.profiles p
    ON p.user_id = u.id
  ORDER BY COALESCE(p.display_name, u.email);
END;
$$;

REVOKE ALL ON FUNCTION public.create_auth_user_internal(text, text, text, public.app_role, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_moderator_for_community_internal(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_community_moderator_internal(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_moderator_for_community(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_community_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_replace_community_moderator(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_community_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_community_moderator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_community_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_community_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_moderator_directory() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.app_role := 'senior';
  requested_community_name text := NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'community', '')), '');
  requested_community_id uuid := NULL;
  requested_request_name text := NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'requested_community_name', '')), '');
  requested_request_city text := NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'requested_community_city', '')), '');
  requested_request_area text := NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'requested_community_area', '')), '');
  request_notes text := NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'requested_community_notes', '')), '');
BEGIN
  IF NEW.raw_user_meta_data->>'community_id' IS NOT NULL AND trim(NEW.raw_user_meta_data->>'community_id') <> '' THEN
    requested_community_id := (NEW.raw_user_meta_data->>'community_id')::uuid;
  END IF;

  IF NEW.raw_user_meta_data->>'role' = 'family_member' THEN
    requested_role := 'family_member';
  ELSIF (NEW.raw_user_meta_data->>'role') IN ('moderator', 'admin')
    AND COALESCE((NEW.raw_user_meta_data->>'is_admin_created')::boolean, false) THEN
    requested_role := (NEW.raw_user_meta_data->>'role')::public.app_role;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, community, community_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(requested_community_name, ''),
    requested_community_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role);

  IF requested_request_name IS NOT NULL
    AND requested_request_city IS NOT NULL
    AND requested_request_area IS NOT NULL THEN
    PERFORM public.upsert_community_request_internal(
      NEW.id,
      requested_request_name,
      requested_request_city,
      requested_request_area,
      request_notes
    );
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  admin_user_id uuid;
  community_row record;
BEGIN
  SELECT id
  INTO admin_user_id
  FROM auth.users
  WHERE lower(email) = 'admin@seniorsphere.com';

  IF admin_user_id IS NULL THEN
    admin_user_id := public.create_auth_user_internal(
      'admin@seniorsphere.com',
      'admin@123',
      'SeniorSphere Admin',
      'admin',
      NULL,
      NULL,
      true
    );
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.profiles (user_id, display_name, community, community_id)
    VALUES (admin_user_id, 'SeniorSphere Admin', '', NULL)
    ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name;
  END IF;

  FOR community_row IN
    SELECT id, name
    FROM public.communities
    WHERE moderator_id IS NULL
    ORDER BY created_at, name
  LOOP
    PERFORM public.create_moderator_for_community_internal(community_row.id);
  END LOOP;
END;
$$;

ALTER TABLE public.communities
ALTER COLUMN moderator_id SET NOT NULL;
