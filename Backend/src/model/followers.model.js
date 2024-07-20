import mongoose, { Schema } from "mongoose";

const FollowingSchema = new Schema(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: "UserDB",
    },

    followedId: {
      type: Schema.Types.ObjectId,
      ref: "UserDB",
    },
  },
  {
    timestamps: true,
  }
);

export const FollowingDB = mongoose.model("FollowingDB", FollowingSchema);
