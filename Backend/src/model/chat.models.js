import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessageDB",
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "UserDB",
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: "UserDB",
    },
  },
  {
    timestamps: true,
  }
);

export const ChatDB = mongoose.model("ChatDB", chatSchema);
