import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    content: {
      type: String,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "PostDB",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "UserDB",
    },
  },
  {
    timestamps: true,
  }
);

export const CommentDB = mongoose.model("CommentDB", commentSchema);
