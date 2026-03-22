# SeniorSphere

SeniorSphere is a community support platform for senior citizens, their family members, community moderators, and platform administrators. It combines social engagement, safety workflows, community operations, messaging, and multilingual accessibility in a single web application.

## What The Product Does

SeniorSphere helps seniors stay connected to their local community, request support, join events, exchange skills, and stay visible to trusted family members. It also gives moderators and administrators tools to manage community activity, announcements, moderation, and community creation.

## Core Features

### Authentication And Role-Based Access
- Email/password sign up and login
- Role-aware dashboards for `Senior`, `Family Member`, `Moderator`, and `Admin`
- Login-first routing with dashboard redirection after authentication
- Session persistence using Supabase Auth

### Community Management
- Join an existing community during sign up
- Request a new community if it does not exist
- Admin review flow for community creation requests
- Automatic moderator account creation for approved communities
- Admin tools to reassign moderators, create replacement moderators, and delete communities

### Senior Experience
- Personal dashboard with community stats
- Daily check-in workflow
- Community feed participation
- Event discovery and event joining
- Skills offering and skill requesting
- Help request creation
- Direct messaging
- Notifications and emergency contact support

### Family Experience
- Connect to seniors who allow family visibility
- View senior check-in status
- View help requests raised by or for the senior
- View events joined by the senior
- View skills requested by the senior
- Raise help requests on behalf of a senior
- Send reminders to seniors

### Moderator Experience
- Community-specific moderation dashboard
- Review and manage help requests
- Assign volunteers and resolve requests
- Post announcements
- Review flagged community content
- Remove inappropriate posts, events, and skills
- View community member count

### Admin Experience
- Platform-level dashboard
- Track total communities, total users, and pending requests
- Approve or reject new community requests
- View all communities and moderators
- Reassign moderators
- Create replacement moderators
- Delete communities and remove community-assigned accounts

### Communication And Engagement
- Community posts and announcements
- Direct messaging tied to skills, events, and help requests
- Notification system with unread tracking
- Browser notifications for realtime updates

### Safety And Moderation
- AI-backed moderation using Gemini through Supabase Edge Functions
- Fallback regex moderation when AI is unavailable
- Blocking or flagging of scam, OTP, bank PIN, abusive, dangerous medical, self-harm, and threatening content
- Moderator review workflow for flagged posts

### Accessibility And Inclusivity
- English and Telugu support
- In-app translation
- Read-aloud support with speech synthesis
- Voice input with speech recognition
- Senior-friendly UI with large controls and mobile support

### PWA Support
- Progressive Web App configuration
- Service worker and manifest generation
- Installable app behavior on supported devices

## Main Modules

- `Authentication`
- `Community Feed`
- `Help Requests`
- `Events`
- `Skills Exchange`
- `Direct Messages`
- `Notifications`
- `Profile And Emergency Contacts`
- `Family Monitoring`
- `Moderator Operations`
- `Admin Operations`
- `AI Moderation`

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Database
- Supabase Realtime
- Supabase Edge Functions
- Gemini API
- PWA via `vite-plugin-pwa`

## Local Development

```sh
npm install
npm run dev
```

Default local route:

```sh
http://localhost:8080/
```

If `8080` is already in use, Vite automatically falls back to the next available port.

## Documentation

- Full product documentation: [`docs/product-documentation.md`](/Users/user/senior-social-hub-main%202/docs/product-documentation.md)
- Role-wise documentation: [`docs/role-wise-documentation.md`](/Users/user/senior-social-hub-main%202/docs/role-wise-documentation.md)

