ALTER TABLE public.communities
DROP CONSTRAINT IF EXISTS communities_created_by_fkey,
ADD CONSTRAINT communities_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users(id)
ON DELETE SET NULL;

ALTER TABLE public.help_requests
DROP CONSTRAINT IF EXISTS help_requests_user_id_fkey,
ADD CONSTRAINT help_requests_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE,
DROP CONSTRAINT IF EXISTS help_requests_assigned_volunteer_id_fkey,
ADD CONSTRAINT help_requests_assigned_volunteer_id_fkey
FOREIGN KEY (assigned_volunteer_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

ALTER TABLE public.help_volunteers
DROP CONSTRAINT IF EXISTS help_volunteers_user_id_fkey,
ADD CONSTRAINT help_volunteers_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE public.announcements
DROP CONSTRAINT IF EXISTS announcements_author_id_fkey,
ADD CONSTRAINT announcements_author_id_fkey
FOREIGN KEY (author_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE public.community_posts
DROP CONSTRAINT IF EXISTS community_posts_user_id_fkey,
ADD CONSTRAINT community_posts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_host_id_fkey,
ADD CONSTRAINT events_host_id_fkey
FOREIGN KEY (host_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
