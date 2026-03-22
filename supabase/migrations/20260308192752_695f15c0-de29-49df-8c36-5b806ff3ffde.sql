
-- Communities table
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  city text,
  area text,
  latitude double precision,
  longitude double precision,
  created_by uuid REFERENCES auth.users(id),
  member_count int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view communities" ON public.communities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create communities" ON public.communities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Creator can update community" ON public.communities FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- Add community_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES public.communities(id);

-- Help requests table (real data)
CREATE TABLE public.help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  on_behalf_of_name text,
  community_id uuid REFERENCES public.communities(id),
  category text NOT NULL DEFAULT 'General',
  description text NOT NULL,
  urgency text NOT NULL DEFAULT 'medium',
  location text,
  status text NOT NULL DEFAULT 'pending',
  assigned_volunteer_id uuid REFERENCES auth.users(id),
  assigned_volunteer_name text,
  author_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View help requests" ON public.help_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create help requests" ON public.help_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update help requests" ON public.help_requests FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
);

-- Volunteers for help requests
CREATE TABLE public.help_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  help_request_id uuid REFERENCES public.help_requests(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  display_name text,
  skills text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(help_request_id, user_id)
);
ALTER TABLE public.help_volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View volunteers" ON public.help_volunteers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Volunteer for help" ON public.help_volunteers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own volunteer" ON public.help_volunteers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Announcements by moderators
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id),
  author_id uuid REFERENCES auth.users(id) NOT NULL,
  author_name text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Moderators create announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
);

-- Community posts (for content moderation)
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  author_name text,
  type text DEFAULT 'post',
  content text NOT NULL,
  flagged boolean DEFAULT false,
  flag_reason text,
  removed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View posts" ON public.community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create posts" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update posts" ON public.community_posts FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
);

-- Events table (real data, moderator can remove)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id),
  host_id uuid REFERENCES auth.users(id) NOT NULL,
  host_name text,
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  event_time text,
  location text,
  attendee_count int DEFAULT 0,
  removed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Update events" ON public.events FOR UPDATE TO authenticated USING (
  auth.uid() = host_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
);

-- Seed communities
INSERT INTO public.communities (name, city, area, latitude, longitude) VALUES
  ('Sunrise Community', 'Hyderabad', 'Ameerpet', 17.4375, 78.4483),
  ('Lake View Residency', 'Hyderabad', 'Jubilee Hills', 17.4325, 78.4073),
  ('Green Meadows', 'Bangalore', 'Koramangala', 12.9352, 77.6245),
  ('Sai Enclave', 'Pune', 'Kothrud', 18.5074, 73.8077),
  ('Harmony Heights', 'Chennai', 'T. Nagar', 13.0418, 80.2341),
  ('Silver Oaks', 'Mumbai', 'Andheri', 19.1197, 72.8464);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.help_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.help_volunteers;
