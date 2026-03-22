CREATE OR REPLACE FUNCTION public.get_senior_call_contacts(_senior_user_id UUID)
RETURNS TABLE (
  id UUID,
  contact_name TEXT,
  phone TEXT,
  relationship TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ec.id,
    ec.contact_name,
    ec.phone,
    ec.relationship
  FROM public.emergency_contacts ec
  JOIN public.profiles p
    ON p.user_id = ec.user_id
  WHERE ec.user_id = _senior_user_id
    AND (
      auth.uid() = _senior_user_id
      OR (
        EXISTS (
          SELECT 1
          FROM public.family_connections fc
          WHERE fc.family_user_id = auth.uid()
            AND fc.senior_user_id = _senior_user_id
        )
        AND COALESCE(p.allow_family_view, false) = true
        AND public.family_member_email_matches_emergency_contact(_senior_user_id)
      )
    )
  ORDER BY ec.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_senior_call_contacts(UUID) TO authenticated;
