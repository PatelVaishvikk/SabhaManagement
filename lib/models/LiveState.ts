import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LiveStateSchema = new Schema(
  {
    planId: { type: String, required: true, unique: true, index: true },
    currentIndex: { type: Number, default: 0, min: 0 },
    isPlaying: { type: Boolean, default: false },
    playbackStatus: {
      type: String,
      enum: ["stopped", "playing", "paused"],
      default: "stopped"
    },
    playbackSeconds: { type: Number, default: 0, min: 0 },
    volume: { type: Number, default: 0.85, min: 0, max: 1 },
    muted: { type: Boolean, default: false },
    autoAdvance: { type: Boolean, default: false },
    commandSeq: { type: Number, default: 0, min: 0 },
    commandSource: { type: String, enum: ["operator", "remote"], default: "operator" },
    commandName: { type: String, default: "" },
    commandIssuedAt: Date,
    projectorLastSeenAt: Date,
    projectorEnabled: { type: Boolean, default: false },
    projectorFullscreen: { type: Boolean, default: false },
    projectorPlaybackStatus: {
      type: String,
      enum: ["stopped", "playing", "paused"],
      default: "stopped"
    },
    projectorPlaybackSeconds: { type: Number, default: 0, min: 0 },
    projectorEmergencyMode: {
      type: String,
      enum: ["none", "blank", "logo", "message", "video", "idle", "bhajan"],
      default: "none"
    },
    projectorCurrentIndex: { type: Number, default: 0, min: 0 },
    projectorVideoId: { type: String, default: "" },
    emergencyMode: {
      type: String,
      enum: ["none", "blank", "logo", "message", "video", "idle", "bhajan"],
      default: "none"
    },
    emergencyMessage: { type: String, default: "" },
    emergencyVideo: { type: Schema.Types.ObjectId, ref: "Video" },
    emergencyBhajan: { type: Schema.Types.ObjectId, ref: "Bhajan" }
  },
  { timestamps: true }
);

export type LiveStateDocument = InferSchemaType<typeof LiveStateSchema>;

if (mongoose.models.LiveState && !mongoose.models.LiveState.schema.path("projectorLastSeenAt")) {
  mongoose.deleteModel("LiveState");
}

const LiveState: Model<LiveStateDocument> =
  mongoose.models.LiveState || mongoose.model("LiveState", LiveStateSchema);

export default LiveState;
