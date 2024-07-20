import mongoose, { Schema } from "mongoose";

const likesSchema = new Schema(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: "CommentDB",
    },

    post: {
      type: Schema.Types.ObjectId,
      ref: "PostDB",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "UserDB",
    },
  },
  {
    timestamps: true,
  }
);

export const likesDB = mongoose.model("likesDB", likesSchema);
