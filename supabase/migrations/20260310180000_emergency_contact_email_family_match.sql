ALTER TABLE public.emergency_contacts
ADD COLUMN email TEXT;

CREATE INDEX IF NOT EXISTS emergency_contacts_user_email_idx
ON public.emergency_contacts (user_id, lower(email))
WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.family_member_email_matches_emergency_contact(_senior_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.emergency_contacts
    WHERE user_id = _senior_user_id
      AND email IS NOT NULL
      AND lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
  )
$$;

DROP POLICY IF EXISTS "Family members can create connections" ON public.family_connections;

CREATE POLICY "Family members can create connections"
ON public.family_connections
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = family_user_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = family_connections.senior_user_id
      AND profiles.allow_family_view = true
  )
  AND public.family_member_email_matches_emergency_contact(family_connections.senior_user_id)
);
