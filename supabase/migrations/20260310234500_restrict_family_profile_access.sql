DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles are viewable by eligible users"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR NOT public.has_role(auth.uid(), 'family_member')
  OR (
    public.has_role(auth.uid(), 'family_member')
    AND (
      NOT public.has_role(user_id, 'senior')
      OR (
        COALESCE(allow_family_view, false) = true
        AND public.family_member_email_matches_emergency_contact(user_id)
      )
    )
  )
);
