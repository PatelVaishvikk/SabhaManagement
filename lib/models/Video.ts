import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const categories = ["Prayer", "Worship", "Devotion", "Message", "Announcement"] as const;
const sourceTypes = ["cloudinary", "youtube", "gdrive"] as const;

const VideoSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, enum: categories, required: true, default: "Announcement" },
    tags: [{ type: String, trim: true }],
    sourceType: { type: String, enum: sourceTypes, required: true },
    youtubeId: String,
    cloudinaryUrl: String,
    cloudinaryPublicId: String,
    driveFileId: String,
    streamUrl: { type: String, required: true },
    thumbnailUrl: String,
    duration: { type: Number, required: true, min: 0, default: 0 },
    playCount: { type: Number, default: 0 },
    lastPlayedAt: Date
  },
  { timestamps: true }
);

VideoSchema.index({ title: "text", tags: "text", description: "text" });
VideoSchema.index({ category: 1, sourceType: 1, createdAt: -1 });

export type VideoDocument = InferSchemaType<typeof VideoSchema>;

const Video: Model<VideoDocument> = mongoose.models.Video || mongoose.model("Video", VideoSchema);

export default Video;
