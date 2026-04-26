export type SourceType = "cloudinary" | "youtube" | "gdrive";
export type VideoCategory = "Prayer" | "Worship" | "Devotion" | "Message" | "Announcement";
export type PlanStatus = "draft" | "ready" | "completed";
export type AnnouncementKind = "ticker" | "overlay" | "both";
export type AnnouncementPriority = "low" | "medium" | "high";
export type EmergencyMode = "none" | "blank" | "logo" | "message" | "video" | "idle" | "bhajan";
export type PlaybackStatus = "stopped" | "playing" | "paused";

export interface VideoDoc {
  _id: string;
  title: string;
  description?: string;
  category: VideoCategory;
  tags: string[];
  sourceType: SourceType;
  youtubeId?: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  driveFileId?: string;
  streamUrl: string;
  thumbnailUrl?: string;
  duration: number;
  playCount: number;
  lastPlayedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssemblyPlanItem {
  _id?: string;
  video: string | VideoDoc;
  scheduledStart: string;
  scheduledEnd: string;
  overrideDuration?: number;
  autoStop: boolean;
  notes?: string;
}

export interface AssemblyPlanBhajanItem {
  _id?: string;
  bhajan: string | BhajanDoc;
  notes?: string;
}

export interface AssemblyPlanDoc {
  _id: string;
  title: string;
  date: string;
  description?: string;
  status: PlanStatus;
  items: AssemblyPlanItem[];
  bhajanItems: AssemblyPlanBhajanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementDoc {
  _id: string;
  text: string;
  type: AnnouncementKind;
  priority: AnnouncementPriority;
  scheduledAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsDoc {
  _id?: string;
  collegeName: string;
  logoUrl?: string;
  idleImageUrl?: string;
  idleImageFilePath?: string;
  defaultDay: string;
  defaultTime: string;
  autoStopBehavior: "warn only" | "hard stop" | "fade then stop";
  autoAdvance: boolean;
  theme: "light" | "dark" | "system";
  activityFeed: { event: string; at: string }[];
  cloudinaryUsage?: {
    usedBytes: number;
    limitBytes: number;
  };
}

export interface BhajanDoc {
  _id: string;
  title: string;
  notes?: string;
  imageUrl: string;
  filePath: string;
  lyricsText?: string;
  lyricsLanguage?: string;
  lyricsUpdatedAt?: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LiveStateDoc {
  _id?: string;
  planId: string;
  currentIndex: number;
  isPlaying: boolean;
  playbackStatus?: PlaybackStatus;
  playbackSeconds?: number;
  volume?: number;
  muted?: boolean;
  autoAdvance: boolean;
  commandSeq?: number;
  commandSource?: "operator" | "remote";
  commandName?: string;
  commandIssuedAt?: string;
  projectorLastSeenAt?: string;
  projectorEnabled?: boolean;
  projectorFullscreen?: boolean;
  projectorPlaybackStatus?: PlaybackStatus;
  projectorPlaybackSeconds?: number;
  projectorEmergencyMode?: EmergencyMode;
  projectorCurrentIndex?: number;
  projectorVideoId?: string;
  emergencyMode: EmergencyMode;
  emergencyMessage?: string;
  emergencyVideo?: string | VideoDoc;
  emergencyBhajan?: string | BhajanDoc;
  createdAt?: string;
  updatedAt?: string;
}
