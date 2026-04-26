import { z } from "zod";

export const categories = ["Prayer", "Worship", "Devotion", "Message", "Announcement"] as const;
export const sourceTypes = ["cloudinary", "youtube", "gdrive"] as const;

export const videoMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  category: z.enum(categories).default("Announcement"),
  tags: z.array(z.string()).default([]),
  duration: z.coerce.number().min(0).default(0)
});

export const planItemSchema = z.object({
  video: z.string().min(1),
  scheduledStart: z.string().regex(/^\d{2}:\d{2}$/),
  scheduledEnd: z.string().regex(/^\d{2}:\d{2}$/),
  overrideDuration: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  autoStop: z.boolean().default(true),
  notes: z.string().optional().default("")
});

export const planBhajanItemSchema = z.object({
  bhajan: z.string().min(1),
  notes: z.string().optional().default("")
});

export const planSchema = z.object({
  title: z.string().min(1),
  date: z.coerce.date(),
  description: z.string().optional().default(""),
  status: z.enum(["draft", "ready", "completed"]).default("draft"),
  items: z.array(planItemSchema).default([]),
  bhajanItems: z.array(planBhajanItemSchema).default([])
});

export const announcementSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["ticker", "overlay", "both"]).default("ticker"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  scheduledAt: z.string().optional().default(""),
  active: z.boolean().default(true)
});

export const settingsSchema = z.object({
  collegeName: z.string().min(1).default("HSAPSS Windsor"),
  logoUrl: z.string().optional().default(""),
  defaultDay: z.string().default("Friday"),
  defaultTime: z.string().default("09:00"),
  autoStopBehavior: z.enum(["warn only", "hard stop", "fade then stop"]).default("hard stop"),
  autoAdvance: z.boolean().default(false),
  theme: z.enum(["light", "dark", "system"]).default("system")
});
