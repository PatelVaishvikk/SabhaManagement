import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AnnouncementSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    type: { type: String, enum: ["ticker", "overlay", "both"], required: true, default: "ticker" },
    priority: { type: String, enum: ["low", "medium", "high"], required: true, default: "medium" },
    scheduledAt: { type: String, default: "" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

AnnouncementSchema.index({ active: 1, priority: 1 });

export type AnnouncementDocument = InferSchemaType<typeof AnnouncementSchema>;

const Announcement: Model<AnnouncementDocument> =
  mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);

export default Announcement;
