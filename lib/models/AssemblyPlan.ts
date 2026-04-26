import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PlanItemSchema = new Schema(
  {
    video: { type: Schema.Types.ObjectId, ref: "Video", required: true },
    scheduledStart: { type: String, required: true },
    scheduledEnd: { type: String, required: true },
    overrideDuration: { type: Number, min: 0 },
    autoStop: { type: Boolean, default: true },
    notes: { type: String, default: "" }
  },
  { _id: true }
);

const PlanBhajanItemSchema = new Schema(
  {
    bhajan: { type: Schema.Types.ObjectId, ref: "Bhajan", required: true },
    notes: { type: String, default: "" }
  },
  { _id: true }
);

const AssemblyPlanSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["draft", "ready", "completed"], default: "draft" },
    items: [PlanItemSchema],
    bhajanItems: [PlanBhajanItemSchema]
  },
  { timestamps: true }
);

AssemblyPlanSchema.index({ date: 1, status: 1 });

export type AssemblyPlanDocument = InferSchemaType<typeof AssemblyPlanSchema>;

if (mongoose.models.AssemblyPlan && !mongoose.models.AssemblyPlan.schema.path("bhajanItems")) {
  mongoose.deleteModel("AssemblyPlan");
}

const AssemblyPlan: Model<AssemblyPlanDocument> =
  mongoose.models.AssemblyPlan || mongoose.model("AssemblyPlan", AssemblyPlanSchema);

export default AssemblyPlan;
