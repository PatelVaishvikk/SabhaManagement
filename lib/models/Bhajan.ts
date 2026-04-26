import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BhajanSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    imageUrl: { type: String, required: true },
    filePath: { type: String, required: true },
    lyricsText: { type: String, default: "" },
    lyricsLanguage: { type: String, default: "guj" },
    lyricsUpdatedAt: Date,
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

BhajanSchema.index({ active: 1, order: 1 });
BhajanSchema.index({ title: "text", notes: "text", lyricsText: "text" });

export type BhajanDocument = InferSchemaType<typeof BhajanSchema>;

if (mongoose.models.Bhajan && !mongoose.models.Bhajan.schema.path("lyricsText")) {
  mongoose.deleteModel("Bhajan");
}

const Bhajan: Model<BhajanDocument> = mongoose.models.Bhajan || mongoose.model("Bhajan", BhajanSchema);

export default Bhajan;
