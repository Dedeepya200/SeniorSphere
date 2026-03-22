
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS type text DEFAULT 'offer' NOT NULL;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS location text DEFAULT null;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT true;

CREATE TABLE public.skill_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.skill_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read skill comments" ON public.skill_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON public.skill_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.skill_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_comments;
