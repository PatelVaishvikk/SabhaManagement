import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "Administrator" },
    role: { type: String, enum: ["admin"], default: "admin" }
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

const User: Model<UserDocument> = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
