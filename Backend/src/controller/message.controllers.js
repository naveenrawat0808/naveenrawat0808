import mongoose from "mongoose";
import { ChatEventEnum } from "../constant.js";
import { ChatDB } from "../model/chat.models.js";
import { ChatMessageDB } from "../model/message.models.js";
import { emitSocketEvent } from "../sockets/index.js";
import apiResponse from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { removeLocalFile, getLocalPath } from "../utils/helpers.js";

/**
 * @description Utility function which returns the pipeline stages to structure the chat message schema with common lookups
 * @returns {mongoose.PipelineStage[]}
 */

const chatMessageCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: "userdbs",
        foreignField: "_id",
        localField: "sender",
        as: "sender",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        sender: { $first: "$sender" },
      },
    },
  ];
};

const getAllMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const selectedChat = await ChatDB.findById(chatId);

  if (!selectedChat) {
    throw new apiError(404, "Chat does not exist");
  }

  if (!selectedChat.participants?.includes(req.user?._id)) {
    throw new apiError(400, "User is not a part of this chat");
  }

  const messages = await ChatMessageDB.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatMessageCommonAggregation(),
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(200, "Messages fetched successfully", messages || [])
    );
});

const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;

  if (!content && !req.files?.attachments?.length) {
    throw new apiError(400, "Message content or attachment is required");
  }

  const selectedChat = await ChatDB.findById(chatId);

  if (!selectedChat) {
    throw new apiError(404, "Chat does not exist");
  }

  const messageFiles = [];

  if (req.files && req.files.attachments?.length > 0) {
    req.files.attachments?.map((attachment) => {
      messageFiles.push({
        localPath: getLocalPath(attachment.filename),
      });
    });
  }

  // Create a new message instance with appropriate metadata
  const message = await ChatMessageDB.create({
    sender: new mongoose.Types.ObjectId(req.user._id),
    content: content || "",
    chat: new mongoose.Types.ObjectId(chatId),
    attachments: messageFiles,
  });

  // update the chat's last message which could be utilized to show last message in the list item
  const chat = await ChatDB.findByIdAndUpdate(
    chatId,
    {
      $set: {
        lastMessage: message._id,
      },
    },
    { new: true }
  );

  // structure the message
  const messages = await ChatMessageDB.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(message._id),
      },
    },
    ...chatMessageCommonAggregation(),
  ]);

  // Store the aggregation result
  const receivedMessage = messages[0];

  if (!receivedMessage) {
    throw new apiError(500, "Internal server error");
  }

  // logic to emit socket event about the new message created to the other participants
  chat.participants.forEach((participantObjectId) => {
    // here the chat is the raw instance of the chat in which participants is the array of object ids of users
    // avoid emitting event to the user who is sending the message
    if (participantObjectId.toString() === req.user._id.toString()) return;

    // emit the receive message event to the other participants with received message as the payload
    emitSocketEvent(
      req,
      participantObjectId.toString(),
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      receivedMessage
    );
  });

  return res
    .status(201)
    .json(new apiResponse(201, "Message saved successfully", receivedMessage));
});

const deleteMessage = asyncHandler(async (req, res) => {
  //controller to delete chat messages and attachments

  const { chatId, messageId } = req.params;

  //Find the chat based on chatId and checking if user is a participant of the chat
  const chat = await ChatDB.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    participants: req.user?._id,
  });

  if (!chat) {
    throw new apiError(404, "Chat does not exist");
  }

  //Find the message based on message id
  const message = await ChatMessageDB.findOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  if (!message) {
    throw new apiError(404, "Message does not exist");
  }

  // Check if user is the sender of the message
  if (message.sender.toString() !== req.user._id.toString()) {
    throw new apiError(
      403,
      "You are not the authorised to delete the message, you are not the sender"
    );
  }
  if (message.attachments.length > 0) {
    //If the message is attachment  remove the attachments from the server
    message.attachments.map((asset) => {
      removeLocalFile(asset.localPath);
    });
  }
  //deleting the message from DB
  await ChatMessageDB.deleteOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  //Updating the last message of the chat to the previous message after deletion if the message deleted was last message
  if (chat.lastMessage.toString() === message._id.toString()) {
    const lastMessage = await ChatMessageDB.findOne(
      { chat: chatId },
      {},
      { sort: { createdAt: -1 } }
    );

    await ChatDB.findByIdAndUpdate(chatId, {
      lastMessage: lastMessage ? lastMessage?._id : null,
    });
  }
  // logic to emit socket event about the message deleted  to the other participants
  chat.participants.forEach((participantObjectId) => {
    // here the chat is the raw instance of the chat in which participants is the array of object ids of users
    // avoid emitting event to the user who is deleting the message
    if (participantObjectId.toString() === req.user._id.toString()) return;
    // emit the delete message event to the other participants frontend with delete messageId as the payload
    emitSocketEvent(
      req,
      participantObjectId.toString(),
      ChatEventEnum.MESSAGE_DELETE_EVENT,
      message
    );
  });

  return res
    .status(200)
    .json(new apiResponse(200, "Message deleted successfully", message));
});

export { getAllMessages, sendMessage, deleteMessage };
