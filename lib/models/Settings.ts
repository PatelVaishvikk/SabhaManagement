import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SettingsSchema = new Schema(
  {
    collegeName: { type: String, default: "HSAPSS Windsor" },
    logoUrl: { type: String, default: "" },
    idleImageUrl: { type: String, default: "" },
    idleImageFilePath: { type: String, default: "" },
    defaultDay: { type: String, default: "Friday" },
    defaultTime: { type: String, default: "09:00" },
    autoStopBehavior: {
      type: String,
      enum: ["warn only", "hard stop", "fade then stop"],
      default: "hard stop"
    },
    autoAdvance: { type: Boolean, default: false },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    activityFeed: [
      {
        event: String,
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export type SettingsDocument = InferSchemaType<typeof SettingsSchema>;

const Settings: Model<SettingsDocument> = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

export default Settings;
