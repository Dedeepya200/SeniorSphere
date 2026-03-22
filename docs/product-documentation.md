# SeniorSphere Product Documentation

## 1. Product Summary

SeniorSphere is a role-based community platform designed to support senior citizens through community participation, safety tooling, assistance workflows, and family visibility. The product serves four user groups:

- Seniors
- Family Members
- Community Moderators
- Administrators

The platform combines social and operational features in one application:

- community feed
- help requests
- events
- skills exchange
- direct messaging
- notifications
- emergency contacts
- moderation
- family visibility

## 2. Product Goals

- Help seniors stay socially connected
- Make help-seeking and volunteering easier inside a local community
- Give family members visibility into senior wellbeing
- Give moderators operational tools to manage a community
- Give administrators platform-level controls for growth and safety

## 3. User Roles

### Senior
- joins a community
- checks in daily
- creates and reads posts
- joins events
- offers or requests skills
- raises help requests
- uses emergency contacts

### Family Member
- connects to seniors who allow access
- monitors check-in status
- reviews senior activity
- raises help on behalf of seniors
- sends reminders

### Moderator
- manages a specific community
- posts announcements
- assigns help volunteers
- resolves requests
- reviews flagged posts
- removes inappropriate or outdated content

### Admin
- oversees all communities
- approves new community requests
- creates and reassigns moderators
- deletes communities
- monitors platform totals

## 4. Functional Modules

### 4.1 Authentication And Session Management

Capabilities:
- email/password sign up
- email/password login
- Supabase session persistence
- role-based dashboard routing
- login-first application entry

Signup flow:
1. User selects role: senior or family member
2. User selects an existing community or requests a new one
3. Profile metadata is stored in Supabase Auth
4. Profile and role rows are created in the database

Login flow:
1. User signs in with email/password
2. Auth context loads user profile and roles
3. App resolves dashboard route based on role

### 4.2 Community Onboarding

Capabilities:
- list existing communities during signup
- request a missing community
- store request with name, city, area, notes
- admin approval workflow
- automatic moderator account creation for approved communities

Approval flow:
1. Community requests accumulate
2. Admin reviews pending requests
3. Admin approves a community
4. Community is created
5. Moderator account is created and assigned

### 4.3 Senior Dashboard

Capabilities:
- shows community stats
- shows recent notifications
- shows recent events
- shows recent help requests
- includes quick action shortcuts
- daily check-in button

Displayed metrics:
- members
- upcoming events
- pending help requests
- skills shared

### 4.4 Family Dashboard

Capabilities:
- connect to visible seniors
- browse connected seniors
- inspect a selected senior
- view last check-in
- view help requests
- view joined events
- view requested skills
- raise help on behalf
- send reminders

Connection conditions:
- senior must enable family visibility
- senior must have relationship setup compatible with family access workflow

### 4.5 Moderator Dashboard

Capabilities:
- community help queue view
- urgency filtering
- volunteer assignment
- request resolution
- announcements posting
- flagged content review
- event removal
- skill removal
- community member count display

Moderator data scope:
- restricted to the moderator’s community

### 4.6 Admin Dashboard

Capabilities:
- view total communities
- view total users
- view pending community requests
- approve or reject community requests
- view all communities and their moderators
- reassign moderators
- create replacement moderators
- copy moderator credentials
- delete communities

Community deletion behavior:
- removes the community
- removes community-scoped content
- deletes users assigned to that community

### 4.7 Community Feed

Capabilities:
- create posts
- view posts
- edit own posts
- remove posts
- flag posts
- moderator flagged-post review
- announcements display

Moderation behavior:
- posts are moderated before being accepted
- unsafe posts are blocked or flagged depending on the path

### 4.8 Help Requests

Capabilities:
- create help request
- choose category
- choose urgency
- add optional location
- submit on behalf of another person
- volunteer for help
- filter by status

Statuses:
- pending
- assigned
- resolved

### 4.9 Events

Capabilities:
- create community event
- support online and offline events
- join events
- view attendee counts
- edit events
- remove events

Event fields:
- title
- description
- date
- time
- location
- link

### 4.10 Skills Exchange

Capabilities:
- offer a skill
- request a skill
- join as learner
- comment on skills
- message the skill owner or requester
- support online and offline formats
- track learner count
- edit skills
- remove skills

Skill types:
- offer
- request

### 4.11 Direct Messaging

Capabilities:
- one-to-one conversations
- contextual chat threads
- unread counts
- message editing
- realtime updates

Contexts supported:
- skill
- help_request
- event

### 4.12 Notifications

Capabilities:
- in-app notifications
- realtime notification updates
- unread indicator
- browser notifications
- read-aloud support

Notification examples:
- someone joined your event
- someone offered help
- senior checked in
- someone joined your skill
- family reminder

### 4.13 Profile And Emergency Contacts

Capabilities:
- edit display name
- view role/community info
- add emergency contacts
- remove emergency contacts
- manage family visibility setting
- list connected family members
- sign out

### 4.14 Emergency Access

Capabilities:
- floating emergency button for seniors
- quick access to emergency contacts
- tap-to-call behavior

### 4.15 AI Moderation

Capabilities:
- Gemini-backed moderation through Supabase Edge Functions
- regex fallback moderation
- content moderation for:
  - community posts
  - help requests
  - direct messages

Categories checked:
- scams and payment fraud
- OTP / bank PIN requests
- dangerous medical advice
- threats and self-harm
- abusive or hateful content
- spam and promotion abuse

### 4.16 Realtime Features

Supabase Realtime is used for:
- help requests
- volunteers
- community posts
- events
- skills
- skill comments
- announcements
- notifications
- direct messages

### 4.17 Accessibility And Localization

Capabilities:
- language toggle between English and Telugu
- speech synthesis for read-aloud
- speech recognition for voice input
- translation button for user-generated content
- mobile-friendly responsive layout

### 4.18 PWA

Capabilities:
- manifest
- service worker
- installable app behavior
- asset precaching

## 5. Primary User Flows

### 5.1 Senior Sign Up And Join Community
1. Open login page
2. Switch to sign up
3. Choose `Senior Citizen`
4. Select existing community or request a new one
5. Create account
6. Log in
7. Land on senior dashboard

### 5.2 Family Connects To A Senior
1. Log in as family member
2. Open family dashboard
3. Search for a senior
4. Connect if the senior has family visibility enabled
5. Open the selected senior profile card
6. View check-in, help, events, and skill requests

### 5.3 Senior Raises A Help Request
1. Open help requests
2. Enter issue description
3. Set urgency and category
4. Submit request
5. Community members or moderators manage follow-up

### 5.4 Moderator Manages Community
1. Log in as moderator
2. Open moderator dashboard
3. Review pending requests
4. Assign volunteers
5. Resolve completed requests
6. Review flagged posts
7. Remove unsafe content if necessary

### 5.5 Admin Approves A New Community
1. Open admin dashboard
2. Review pending requests
3. Approve community
4. Moderator is created automatically
5. Community appears in all communities list

### 5.6 User Sends A Message
1. Start from event, skill, or help request context
2. Open messages thread
3. Type message
4. Moderation runs before send
5. Message is delivered if safe

## 6. Technical Architecture Summary

Frontend:
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query

Backend:
- Supabase Auth
- Supabase Postgres
- Supabase Realtime
- Supabase Edge Functions

AI Services:
- Gemini API for moderation
- Google translate endpoint used in translation function

## 7. Documentation References

- Project summary: [`README.md`](/Users/user/senior-social-hub-main%202/README.md)
- Role-wise guide: [`docs/role-wise-documentation.md`](/Users/user/senior-social-hub-main%202/docs/role-wise-documentation.md)

