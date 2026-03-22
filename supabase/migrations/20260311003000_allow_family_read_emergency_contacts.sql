CREATE POLICY "Connected family can read senior emergency contacts"
ON public.emergency_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_connections fc
    JOIN public.profiles p ON p.user_id = fc.senior_user_id
    WHERE fc.family_user_id = auth.uid()
      AND fc.senior_user_id = emergency_contacts.user_id
      AND COALESCE(p.allow_family_view, false) = true
      AND public.family_member_email_matches_emergency_contact(fc.senior_user_id)
  )
);
