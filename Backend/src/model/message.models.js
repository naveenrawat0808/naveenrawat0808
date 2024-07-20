import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "UserDB",
    },
    content: {
      type: String,
    },
    attachments: {
      type: [
        {
          localPath: String,
        },
      ],
      default: [],
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "ChatDB",
    },
  },
  {
    timestamps: true,
  }
);

export const ChatMessageDB = mongoose.model("ChatMessageDB", messageSchema);
