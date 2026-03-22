import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Language = "en" | "te";

const translations: Record<Language, Record<string, string>> = {
  en: {
    // App
    "app.name": "SeniorSphere",
    "app.tagline": "Connect with your community",
    "app.loading": "Loading...",

    // Roles
    "role.senior": "Senior Citizen",
    "role.family_member": "Family Member",
    "role.moderator": "Community Moderator",
    "role.admin": "Administrator",
    "role.badge.moderator": "Moderator",
    "role.badge.family": "Family",
    "role.badge.admin": "Admin",

    // Nav
    "nav.home": "Home",
    "nav.dashboard": "Dashboard",
    "nav.community": "Community",
    "nav.events": "Events",
    "nav.skills": "Skills",
    "nav.help": "Help",
    "nav.messages": "Messages",
    "nav.helpRequests": "Help Requests",
    "nav.profile": "Profile",
    "nav.logout": "Log Out",

    // Dashboard
    "dashboard.hello": "Hello",
    "dashboard.whatToDo": "What would you like to do today?",
    "dashboard.checkin": "Daily Check-in",
    "dashboard.checkedIn": "✓ Checked in today!",
    "dashboard.communityStats": "Community Stats",
    "dashboard.members": "Members",
    "dashboard.upcomingEvents": "Upcoming Events",
    "dashboard.helpRequests": "Help Requests",
    "dashboard.skillsShared": "Skills Shared",
    "dashboard.quickActions": "Quick Actions",
    "dashboard.createEvent": "Create Event",
    "dashboard.createEventDesc": "Organize a walk or meetup",
    "dashboard.shareSkill": "Share Skill",
    "dashboard.shareSkillDesc": "Teach something you know",
    "dashboard.askHelp": "Ask for Help",
    "dashboard.askHelpDesc": "Request assistance",
    "dashboard.createPost": "Create Post",
    "dashboard.createPostDesc": "Share with the community",
    "dashboard.viewEvents": "View Events",

    // Events
    "events.title": "Events",
    "events.create": "Create",
    "events.noEvents": "No events yet",
    "events.noEventsDesc": "Create the first event for your community!",
    "events.createEvent": "Create Event",
    "events.eventTitle": "Event Title",
    "events.description": "Description",
    "events.date": "Date",
    "events.time": "Time (optional)",
    "events.location": "Location",
    "events.cancel": "Cancel",
    "events.joined": "Joined",
    "events.join": "Join",
    "events.by": "By",
    "events.attendees": "attendees",
    "events.remove": "Remove",

    // Skills
    "skills.title": "Skills Exchange",
    "skills.offer": "Offer Skill",
    "skills.noSkills": "No skills shared yet",
    "skills.noSkillsDesc": "Be the first to share a skill!",
    "skills.offerSkill": "Offer a Skill",
    "skills.skillTitle": "Skill Title",
    "skills.description": "Description",
    "skills.cancel": "Cancel",
    "skills.learning": "Learning",
    "skills.learnThis": "Learn This",
    "skills.taughtBy": "Taught by",
    "skills.learners": "learners",
    "skills.remove": "Remove",

    // Help
    "help.title": "Help Requests",
    "help.create": "Request Help",
    "help.noRequests": "No help requests",
    "help.noRequestsDesc": "Everyone seems to be doing well!",
    "help.createRequest": "Request Help",
    "help.whatHelp": "What do you need help with?",
    "help.category": "Category",
    "help.urgency": "Urgency",
    "help.locationOpt": "Location (optional)",
    "help.cancel": "Cancel",
    "help.volunteer": "Volunteer",
    "help.volunteered": "Volunteered",
    "help.volunteers": "volunteers",
    "help.pending": "Pending",
    "help.assigned": "Assigned",
    "help.completed": "Completed",
    "help.urgencyLow": "Low",
    "help.urgencyMedium": "Medium",
    "help.urgencyHigh": "High",
    "help.catGeneral": "General",
    "help.catMedical": "Medical",
    "help.catTransport": "Transport",
    "help.catGroceries": "Groceries",
    "help.catTechnology": "Technology",

    // Community
    "community.title": "Community",
    "community.activity": "Activity",
    "community.flagged": "Flagged",
    "community.showAll": "Show All",
    "community.shareSomething": "Share something with your community...",
    "community.aiModeration": "🤖 AI moderation active",
    "community.post": "Post",
    "community.posting": "Posting...",
    "community.noPosts": "No posts yet",
    "community.noPostsDesc": "Be the first to share something!",
    "community.noFlagged": "No flagged posts",
    "community.healthy": "Community is healthy! 🎉",
    "community.report": "Report",
    "community.dismissFlag": "✓ Dismiss Flag",
    "community.remove": "Remove",

    // Profile
    "profile.title": "Profile",
    "profile.editProfile": "Edit Profile",
    "profile.save": "Save",
    "profile.cancel": "Cancel",
    "profile.emergencyContact": "Emergency Contact",
    "profile.contactName": "Contact name",
    "profile.phone": "Phone number",
    "profile.emailOptional": "Email for family member connection",
    "profile.relationship": "Relationship",
    "profile.saveContact": "Save Contact",
    "profile.familyMembers": "Family Members",
    "profile.connectedFamily": "Connected family member",
    "profile.inviteDesc": "Share the invite link below with your family member. They must sign up as \"Family Member\" using the same email saved in your emergency contact.",
    "profile.copyInvite": "Copy Invite Link",
    "profile.moderatorInfo": "Moderator Info",
    "profile.community": "Community",
    "profile.role": "Role",
    "profile.familyInfo": "Family Info",
    "profile.familyInfoDesc": "Your profile details are synced with your connected senior.",
    "profile.settings": "Settings",
    "profile.noCommunity": "No community",

    // Login
    "login.fullName": "Full Name",
    "login.email": "Email",
    "login.password": "Password",
    "login.iAm": "I am a:",
    "login.joinCommunity": "Join a Community",
    "login.communitySelectHelp": "Choose an existing community or request a new one if yours is missing.",
    "login.selectCommunity": "Select a community",
    "login.requestNewCommunity": "Request New Community",
    "login.communityName": "Community name (e.g. Sunrise Residency)",
    "login.city": "City",
    "login.area": "Area / Locality",
    "login.additionalNotes": "Additional notes (optional)",
    "login.communityRequestHelp": "Your request will be counted with matching requests from the same area. Admin approval starts at 5 requests.",
    "login.signUp": "Sign Up",
    "login.logIn": "Log In",
    "login.pleaseWait": "Please wait...",
    "login.alreadyAccount": "Already have an account?",
    "login.noAccount": "Don't have an account?",
    "login.seniorDesc": "I'm a senior looking to connect",
    "login.familyDesc": "I want to monitor a loved one",
    "login.moderatorDesc": "I help manage the community",

    // Emergency
    "emergency.title": "Emergency Contact",
    "emergency.callNow": "Call Now",
    "emergency.cancel": "Cancel",
    "emergency.familyDoctor": "Family Doctor",
    "emergency.loading": "Loading...",
    "emergency.noContact": "No emergency contact",
    "emergency.addContact": "Add a contact in Profile",

    // Language
    "lang.switch": "తెలుగు",

    // Notifications
    "notifications.title": "Notifications",
    "notifications.markAllRead": "Mark all read",
    "notifications.noNotifications": "No notifications yet",

    // Speech
    "speech.readAloud": "Read aloud",
    "speech.stop": "Stop",
    "speech.voiceInput": "Voice input",
    "speech.listening": "Listening...",

    // Common
    "common.edit": "Edit",
    "common.save": "Save",
    "common.saved": "Saved!",
    "common.cancel": "Cancel",
  },
  te: {
    // App
    "app.name": "సీనియర్‌స్ఫియర్",
    "app.tagline": "మీ సమాజంతో కనెక్ట్ అవ్వండి",
    "app.loading": "లోడ్ అవుతోంది...",

    // Roles
    "role.senior": "సీనియర్ సిటిజన్",
    "role.family_member": "కుటుంబ సభ్యుడు",
    "role.moderator": "కమ్యూనిటీ మోడరేటర్",
    "role.admin": "అడ్మినిస్ట్రేటర్",
    "role.badge.moderator": "మోడరేటర్",
    "role.badge.family": "కుటుంబం",
    "role.badge.admin": "అడ్మిన్",

    // Nav
    "nav.home": "హోమ్",
    "nav.dashboard": "డాష్‌బోర్డ్",
    "nav.community": "సమాజం",
    "nav.events": "ఈవెంట్‌లు",
    "nav.skills": "నైపుణ్యాలు",
    "nav.help": "సహాయం",
    "nav.messages": "సందేశాలు",
    "nav.helpRequests": "సహాయ అభ్యర్థనలు",
    "nav.profile": "ప్రొఫైల్",
    "nav.logout": "లాగ్ అవుట్",

    // Dashboard
    "dashboard.hello": "నమస్కారం",
    "dashboard.whatToDo": "ఈ రోజు మీరు ఏమి చేయాలనుకుంటున్నారు?",
    "dashboard.checkin": "రోజువారీ చెక్-ఇన్",
    "dashboard.checkedIn": "✓ ఈ రోజు చెక్-ఇన్ అయింది!",
    "dashboard.communityStats": "సమాజ గణాంకాలు",
    "dashboard.members": "సభ్యులు",
    "dashboard.upcomingEvents": "రాబోయే ఈవెంట్‌లు",
    "dashboard.helpRequests": "సహాయ అభ్యర్థనలు",
    "dashboard.skillsShared": "పంచుకున్న నైపుణ్యాలు",
    "dashboard.quickActions": "త్వరిత చర్యలు",
    "dashboard.createEvent": "ఈవెంట్ సృష్టించు",
    "dashboard.createEventDesc": "నడక లేదా సమావేశం ఏర్పాటు చేయండి",
    "dashboard.shareSkill": "నైపుణ్యం పంచు",
    "dashboard.shareSkillDesc": "మీకు తెలిసినది నేర్పించండి",
    "dashboard.askHelp": "సహాయం అడగండి",
    "dashboard.askHelpDesc": "సహాయం కోసం అభ్యర్థించండి",
    "dashboard.createPost": "పోస్ట్ చేయండి",
    "dashboard.createPostDesc": "సమాజంతో పంచుకోండి",
    "dashboard.viewEvents": "ఈవెంట్‌లు చూడండి",

    // Events
    "events.title": "ఈవెంట్‌లు",
    "events.create": "సృష్టించు",
    "events.noEvents": "ఇంకా ఈవెంట్‌లు లేవు",
    "events.noEventsDesc": "మీ సమాజం కోసం మొదటి ఈవెంట్ సృష్టించండి!",
    "events.createEvent": "ఈవెంట్ సృష్టించు",
    "events.eventTitle": "ఈవెంట్ శీర్షిక",
    "events.description": "వివరణ",
    "events.date": "తేదీ",
    "events.time": "సమయం (ఐచ్ఛికం)",
    "events.location": "ప్రదేశం",
    "events.cancel": "రద్దు",
    "events.joined": "చేరారు",
    "events.join": "చేరండి",
    "events.by": "ద్వారా",
    "events.attendees": "హాజరైనవారు",
    "events.remove": "తొలగించు",

    // Skills
    "skills.title": "నైపుణ్యాల మార్పిడి",
    "skills.offer": "నైపుణ్యం అందించు",
    "skills.noSkills": "ఇంకా నైపుణ్యాలు పంచలేదు",
    "skills.noSkillsDesc": "మొదట నైపుణ్యం పంచండి!",
    "skills.offerSkill": "నైపుణ్యం అందించు",
    "skills.skillTitle": "నైపుణ్యం శీర్షిక",
    "skills.description": "వివరణ",
    "skills.cancel": "రద్దు",
    "skills.learning": "నేర్చుకుంటున్నాను",
    "skills.learnThis": "ఇది నేర్చుకో",
    "skills.taughtBy": "నేర్పించేవారు",
    "skills.learners": "నేర్చుకునేవారు",
    "skills.remove": "తొలగించు",

    // Help
    "help.title": "సహాయ అభ్యర్థనలు",
    "help.create": "సహాయం అభ్యర్థించు",
    "help.noRequests": "సహాయ అభ్యర్థనలు లేవు",
    "help.noRequestsDesc": "అందరూ బాగున్నట్లు ఉంది!",
    "help.createRequest": "సహాయం అభ్యర్థించు",
    "help.whatHelp": "మీకు ఏ సహాయం కావాలి?",
    "help.category": "వర్గం",
    "help.urgency": "అత్యవసరత",
    "help.locationOpt": "ప్రదేశం (ఐచ్ఛికం)",
    "help.cancel": "రద్దు",
    "help.volunteer": "వాలంటీర్",
    "help.volunteered": "వాలంటీర్ అయ్యారు",
    "help.volunteers": "వాలంటీర్లు",
    "help.pending": "పెండింగ్",
    "help.assigned": "కేటాయించారు",
    "help.completed": "పూర్తయింది",
    "help.urgencyLow": "తక్కువ",
    "help.urgencyMedium": "మధ్యస్థం",
    "help.urgencyHigh": "అధికం",
    "help.catGeneral": "సాధారణం",
    "help.catMedical": "వైద్యం",
    "help.catTransport": "రవాణా",
    "help.catGroceries": "కిరాణా",
    "help.catTechnology": "సాంకేతికం",

    // Community
    "community.title": "సమాజం",
    "community.activity": "కార్యకలాపం",
    "community.flagged": "ఫ్లాగ్ చేయబడింది",
    "community.showAll": "అన్నీ చూపు",
    "community.shareSomething": "మీ సమాజంతో ఏదైనా పంచుకోండి...",
    "community.aiModeration": "🤖 AI మోడరేషన్ యాక్టివ్",
    "community.post": "పోస్ట్",
    "community.posting": "పోస్ట్ చేస్తోంది...",
    "community.noPosts": "ఇంకా పోస్ట్‌లు లేవు",
    "community.noPostsDesc": "మొదట ఏదైనా పంచుకోండి!",
    "community.noFlagged": "ఫ్లాగ్ చేసిన పోస్ట్‌లు లేవు",
    "community.healthy": "సమాజం ఆరోగ్యంగా ఉంది! 🎉",
    "community.report": "రిపోర్ట్",
    "community.dismissFlag": "✓ ఫ్లాగ్ తొలగించు",
    "community.remove": "తొలగించు",

    // Profile
    "profile.title": "ప్రొఫైల్",
    "profile.editProfile": "ప్రొఫైల్ మార్చు",
    "profile.save": "సేవ్ చేయి",
    "profile.cancel": "రద్దు",
    "profile.emergencyContact": "అత్యవసర సంప్రదింపు",
    "profile.contactName": "సంప్రదింపు పేరు",
    "profile.phone": "ఫోన్ నంబర్",
    "profile.emailOptional": "కుటుంబ సభ్యుల కనెక్షన్ కోసం ఇమెయిల్",
    "profile.relationship": "సంబంధం",
    "profile.saveContact": "సంప్రదింపు సేవ్ చేయి",
    "profile.familyMembers": "కుటుంబ సభ్యులు",
    "profile.connectedFamily": "కనెక్ట్ అయిన కుటుంబ సభ్యుడు",
    "profile.inviteDesc": "దిగువ ఆహ్వాన లింక్‌ను మీ కుటుంబ సభ్యుడితో పంచుకోండి. వారు మీ అత్యవసర సంప్రదింపులో సేవ్ చేసిన అదే ఇమెయిల్‌తో \"కుటుంబ సభ్యుడు\"గా సైన్ అప్ చేయాలి.",
    "profile.copyInvite": "ఆహ్వాన లింక్ కాపీ చేయి",
    "profile.moderatorInfo": "మోడరేటర్ సమాచారం",
    "profile.community": "సమాజం",
    "profile.role": "పాత్ర",
    "profile.familyInfo": "కుటుంబ సమాచారం",
    "profile.familyInfoDesc": "మీ ప్రొఫైల్ వివరాలు మీ కనెక్ట్ అయిన సీనియర్‌తో సమకాలీకరించబడ్డాయి.",
    "profile.settings": "సెట్టింగ్‌లు",
    "profile.noCommunity": "సమాజం లేదు",

    // Login
    "login.fullName": "పూర్తి పేరు",
    "login.email": "ఇమెయిల్",
    "login.password": "పాస్‌వర్డ్",
    "login.iAm": "నేను:",
    "login.joinCommunity": "సమాజంలో చేరండి",
    "login.communitySelectHelp": "ఉన్న సమాజాన్ని ఎంచుకోండి లేదా మీదిది లేకపోతే కొత్త సమాజాన్ని అభ్యర్థించండి.",
    "login.selectCommunity": "సమాజాన్ని ఎంచుకోండి",
    "login.requestNewCommunity": "కొత్త సమాజాన్ని అభ్యర్థించు",
    "login.communityName": "సమాజ పేరు (ఉదా. సన్‌రైజ్ రెసిడెన్సీ)",
    "login.city": "నగరం",
    "login.area": "ప్రాంతం / లోకాలిటీ",
    "login.additionalNotes": "అదనపు గమనికలు (ఐచ్ఛికం)",
    "login.communityRequestHelp": "అదే ప్రాంతం నుండి వచ్చిన సరిపోలే అభ్యర్థనలతో ఇది లెక్కించబడుతుంది. 5 అభ్యర్థనల తర్వాత అడ్మిన్ ఆమోదం మొదలవుతుంది.",
    "login.signUp": "సైన్ అప్",
    "login.logIn": "లాగిన్",
    "login.pleaseWait": "దయచేసి వేచి ఉండండి...",
    "login.alreadyAccount": "ఇప్పటికే ఖాతా ఉందా?",
    "login.noAccount": "ఖాతా లేదా?",
    "login.seniorDesc": "నేను కనెక్ట్ అవ్వాలనుకునే సీనియర్‌ని",
    "login.familyDesc": "నేను ప్రియమైన వారిని చూసుకోవాలనుకుంటున్నాను",
    "login.moderatorDesc": "నేను సమాజాన్ని నిర్వహించడంలో సహాయం చేస్తాను",

    // Emergency
    "emergency.title": "అత్యవసర సంప్రదింపు",
    "emergency.callNow": "ఇప్పుడు కాల్ చేయి",
    "emergency.cancel": "రద్దు",
    "emergency.familyDoctor": "కుటుంబ వైద్యుడు",
    "emergency.loading": "లోడ్ అవుతోంది...",
    "emergency.noContact": "అత్యవసర సంప్రదింపు లేదు",
    "emergency.addContact": "ప్రొఫైల్‌లో సంప్రదింపును జోడించండి",

    // Language
    "lang.switch": "English",

    // Notifications
    "notifications.title": "నోటిఫికేషన్‌లు",
    "notifications.markAllRead": "అన్నీ చదివినట్లు గుర్తించు",
    "notifications.noNotifications": "ఇంకా నోటిఫికేషన్‌లు లేవు",

    // Speech
    "speech.readAloud": "చదివి వినిపించు",
    "speech.stop": "ఆపు",
    "speech.voiceInput": "గొంతు ద్వారా టైప్ చేయి",
    "speech.listening": "వింటున్నాను...",

    // Common
    "common.edit": "మార్చు",
    "common.save": "సేవ్ చేయి",
    "common.saved": "సేవ్ అయింది!",
    "common.cancel": "రద్దు",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("app_language") as Language) || "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
  }, []);

  const t = useCallback(
    (key: string) => translations[language][key] || translations.en[key] || key,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
