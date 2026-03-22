
-- Fix overly permissive INSERT policy on communities
DROP POLICY "Authenticated can create communities" ON public.communities;
CREATE POLICY "Authenticated can create communities" ON public.communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
