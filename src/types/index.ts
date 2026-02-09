export interface ProjectData {
    name: string;
    oneLiner: string;
    sector: string;
    location: string;
    stage: string;
    vision: string;
    problem: string;
    solution: string;
    talentNeeds: string[];
    productHighlights: string;
    targetAudience: string;
    businessModel: string;
    differentiation: string;
    marketSize: string;
    teamMembers: string;
    whyNow: string;
    longTermMoat: string;
    roadmapFinance: string;
    others: string;
}

export interface ProfileData {
    name: string;
    title: string;
    location: string;
    bio: string;
    skills: string[];
    experienceHighlights: string;
    education: string;
    lookingFor: string;
    superpower: string;
    others: string;
    avatar: string;
}

export interface Message {
    role: 'user' | 'model';
    text: string;
}

export interface Attachment {
    name: string;
    data: string;
    mimeType: string;
}

export interface Annotation {
    id: string;
    field: string;
    selectedText: string;
    comment: string;
    timestamp: number;
}

export const initialProjectData: ProjectData = {
    name: "", oneLiner: "", sector: "", location: "", stage: "",
    vision: "", problem: "", solution: "", talentNeeds: [],
    productHighlights: "", targetAudience: "", businessModel: "",
    differentiation: "", marketSize: "", teamMembers: "",
    whyNow: "", longTermMoat: "", roadmapFinance: "", others: ""
};

export const initialProfileData: ProfileData = {
    name: "", title: "", location: "", bio: "", skills: [],
    experienceHighlights: "", education: "", lookingFor: "",
    superpower: "", others: "", avatar: ""
};
