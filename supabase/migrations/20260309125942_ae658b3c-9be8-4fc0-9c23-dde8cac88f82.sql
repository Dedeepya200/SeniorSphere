-- Update the family_connections insert policy to require allow_family_view = true
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS allow_family_view BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Family members can create connections" ON public.family_connections;

CREATE POLICY "Family members can create connections"
ON public.family_connections
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = family_user_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = family_connections.senior_user_id
    AND profiles.allow_family_view = true
  )
);
