
-- Allow unauthenticated users to view communities (needed during signup)
DROP POLICY "Anyone can view communities" ON public.communities;
CREATE POLICY "Anyone can view communities" ON public.communities FOR SELECT USING (true);
