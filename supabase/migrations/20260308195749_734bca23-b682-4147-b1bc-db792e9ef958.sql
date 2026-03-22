
-- Create skills table
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  teacher_name TEXT,
  community_id UUID REFERENCES public.communities(id),
  learner_count INTEGER DEFAULT 0,
  removed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- RLS policies for skills
CREATE POLICY "Anyone authenticated can read skills" ON public.skills
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own skills" ON public.skills
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills" ON public.skills
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Moderators can update any skill (for removal)
CREATE POLICY "Moderators can update any skill" ON public.skills
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- Create event_attendees table for tracking joins
CREATE TABLE public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read attendees" ON public.event_attendees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert themselves as attendees" ON public.event_attendees
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create skill_learners table
CREATE TABLE public.skill_learners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill_id, user_id)
);

ALTER TABLE public.skill_learners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read learners" ON public.skill_learners
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert themselves as learners" ON public.skill_learners
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime for skills
ALTER PUBLICATION supabase_realtime ADD TABLE public.skills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendees;
