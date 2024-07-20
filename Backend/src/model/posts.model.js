import mongoose, { Schema } from "mongoose";

const postsSchema = new Schema(
  {
    postImg: {
      //cloudnary url
      type: String,
    },
    title: {
      type: String,
      // required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "UserDB",
    },
    description: {
      type: String,
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PostDB = mongoose.model("PostDB", postsSchema);
