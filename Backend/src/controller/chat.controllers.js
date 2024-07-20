import mongoose from "mongoose";
import { ChatMessageDB } from "../model/message.models.js";
import { ChatDB } from "../model/chat.models.js";
import { UserDB } from "../model/users.model.js";
import { apiError } from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { emitSocketEvent } from "../sockets/index.js";
import { ChatEventEnum } from "../constant.js";

/**
 * @description Utility function which returns the pipeline stages to structure the chat schema with common lookups
 * @returns {mongoose.PipelineStage[]}
 */

const chatCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: "userdbs",
        localField: "participants",
        foreignField: "_id",
        as: "participants",
        pipeline: [
          {
            $project: {
              password: 0,
              refreshToken: 0,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "chatmessagedbs",
        localField: "lastMessage",
        foreignField: "_id",
        as: "lastMessage",
        pipeline: [
          {
            $lookup: {
              from: "userdbs",
              localField: "sender",
              foreignField: "_id",
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
        ],
      },
    },
    {
      $addFields: {
        lastMessage: { $first: "$lastMessage" },
      },
    },
  ];
};

/**
 *
 * @param {string} chatId
 * @description utility function responsible for removing all the messages and file attachments attached to the deleted chat
 */

const deleteCascedeChatMessages = async (chatId) => {
  const messages = await ChatMessageDB.find({
    chat: new mongoose.Types.ObjectId(chatId),
  });

  let attachments = [];

  attachments = attachments.concat(
    ...messages.map((message) => {
      return message.attachments;
    })
  );
  attachments.forEach((attachment) => {
    removeLocalFile(attachment.localPath);
  });

  await ChatMessageDB.deleteMany({
    chat: new mongoose.Types.ObjectId(chatId),
  });
};

const searchAvailableUsers = asyncHandler(async (req, res) => {
  const users = await UserDB.aggregate([
    {
      $match: {
        _id: {
          $ne: req.user._id, //avoid logged in user, *Returns true if the values are not equivalent.*
        },
      },
    },
    {
      $project: {
        avatar: 1,
        username: 1,
        email: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, users, "Users fetched Successfully."));
});

const createOrGetAOneOnOneChat = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  // console.log(receiverId);
  const isUserValid = await UserDB.findById(receiverId);

  if (!isUserValid) {
    throw new apiError(404, "Invalid Receiver User Id.");
  }

  if (isUserValid._id.toString() === req.user._id.toString()) {
    throw new apiError(400, "You cannot send message to yourself!");
  }

  const chat = await ChatDB.aggregate([
    {
      $match: {
        isGroupChat: false,
        $and: [
          {
            participants: { $elemMatch: { $eq: req.user._id } },
          },
          {
            participants: {
              $elemMatch: {
                $eq: new mongoose.Types.ObjectId(receiverId),
              },
            },
          },
        ],
      },
    },
    ...chatCommonAggregation(),
  ]);
  if (chat.length) {
    // if we find the chat that means user already has chats.
    return res
      .status(200)
      .json(new apiResponse(200, "Chat retreiverd Successfully.", chat[0]));
  }

  const newChatInstance = await ChatDB.create({
    name: "One On One Chat",
    participants: [req.user._id, new mongoose.Types.ObjectId(receiverId)], // add receiver and logged in user
    admin: req.user._id,
  });

  const createdChat = await ChatDB.aggregate([
    {
      $match: {
        _id: newChatInstance._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = createdChat[0];

  if (!payload) {
    throw new apiError(500, "Internal Server Error!");
  }

  payload?.participants?.forEach((participant) => {
    if (participant._id.toString() === req.user._id.toString()) return; // don't emit the event for the logged in use as he is the one who is initiating the chat

    // emit event to other participants with new chat as a payload
    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(201)
    .json(new apiResponse(201, "Chat retreived Successfully.", payload));
});

const createAGroupChat = asyncHandler(async (req, res) => {
  const { name, participants } = req.body;

  if (participants.includes(req.user._id.toString())) {
    throw new apiError(
      400,
      "Participants array should not contain the group creator"
    );
  }

  const members = [...new Set([...participants, req.user._id.toString()])];

  if (members.length < 3) {
    throw new apiError(
      400,
      "Seems like you have passed duplicate participants. but you need more than 3 members for a group chat!"
    );
  }

  const groupChat = await ChatDB.create({
    name,
    isGroupChat: true,
    participants: members,
    admin: req.user._id,
  });

  const chat = await ChatDB.aggregate([
    {
      $match: {
        _id: groupChat._id,
      },
    },

    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new apiError(500, "Internal Server Error!");
  }

  payload?.participants.forEach((participant) => {
    if (participant._id.toString() === req.user._id.toString()) return; // don't emit the event for the logged in use as he/she is the one who is initiating the chat

    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });
  return res
    .status(201)
    .json(new apiResponse(201, "Group Chat Created Successfully.", payload));
});

const getGroupChatDetails = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const groupChat = await ChatDB.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const chat = groupChat[0];

  if (!chat) {
    throw new apiError(404, "Group Chat does not exist!");
  }

  return res
    .status(200)
    .json(new apiResponse(200, "Group chat fetched successfully"));
});

const renameGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { name } = req.body;

  const groupChat = await ChatDB.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new apiError(404, "Group chat does not exist");
  }

  if (groupChat.admin?.toString() !== req.user._id?.toString()) {
    throw new apiError(404, "You are not an admin");
  }

  const updatedGroupChat = await ChatDB.findByIdAndUpdate(
    chatId,
    {
      $set: {
        name,
      },
    },
    { new: true }
  );

  const chat = await ChatDB.aggregate([
    {
      $match: {
        _id: updatedGroupChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new apiError(500, "Internal server error");
  }

  payload?.participants?.forEach((participant) => {
    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.UPDATE_GROUP_NAME_EVENT,
      payload
    );
  });

  return res
    .status(200)
    .json(
      new apiResponse(200, "Group chat name updated successfully", chat[0])
    );
});

const deleteGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const groupChat = await ChatDB.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const chat = groupChat[0];

  if (!chat) {
    throw new apiError(404, "Group chat does not exist");
  }

  if (chat.admin?.toString() !== req.user._id?.toString()) {
    throw new apiError(404, "Only admin can delete the group");
  }

  await ChatDB.findByIdAndDelete(chatId);

  await deleteCascedeChatMessages(chatId);

  chat?.participants?.forEach((participant) => {
    if (participant._id.toString() === req.user._id.toString()) return; // don't emit the event for the logged in use as he is the one who is deleting

    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      chat
    );
  });

  return res
    .status(200)
    .json(new apiResponse(200, "Group chat deleted successfully", {}));
});

const deleteOneOnOneChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const chat = await ChatDB.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new apiError(404, "Chat does not exist");
  }

  await ChatDB.findByIdAndDelete(chatId);

  await deleteCascedeChatMessages(chatId);

  const otherParticipant = payload?.participants?.find(
    (participant) => participant?._id.toString() !== req.user._id.toString() // get the other participant in chat for socket
  );

  emitSocketEvent(
    req,
    otherParticipant._id?.toString(),
    ChatEventEnum.LEAVE_CHAT_EVENT,
    payload
  );

  return res
    .status(200)
    .json(new apiResponse(200, "Chat deleted successfully", {}));
});

const leaveGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const groupChat = await ChatDB.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new apiError(404, "Group chat does not exist");
  }

  const existingParticipants = groupChat.participants;

  if (!existingParticipants?.includes(req.user?._id)) {
    throw new apiError(400, "You are not a part of this group chat");
  }

  const updatedChat = await ChatDB.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        participants: req.user?._id,
      },
    },
    { new: true }
  );

  const chat = await ChatDB.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new apiError(500, "Internal server error");
  }

  return res
    .status(200)
    .json(new apiResponse(200, "Left a group successfully", payload));
});

const addNewParticipantInGroupChat = asyncHandler(async (req, res) => {
  const { chatId, participantId } = req.params;

  const groupChat = await ChatDB.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new apiError(404, "Group chat does not exist");
  }

  if (groupChat.admin?.toString() !== req.user._id?.toString()) {
    throw new apiError(404, "You are not an admin");
  }

  const existingParticipants = groupChat.participants;

  if (existingParticipants?.includes(participantId)) {
    throw new apiError(409, "Participant already in a group chat");
  }

  const updatedChat = await ChatDB.findByIdAndUpdate(
    chatId,
    {
      $push: {
        participants: participantId,
      },
    },
    { new: true }
  );

  const chat = await ChatDB.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new apiError(500, "Internal server error");
  }

  emitSocketEvent(req, participantId, ChatEventEnum.NEW_CHAT_EVENT, payload);

  return res
    .status(200)
    .json(new apiResponse(200, "Participant added successfully", payload));
});

const removeParticipantFromGroupChat = asyncHandler(async (req, res) => {
  const { chatId, participantId } = req.params;

  const groupChat = await ChatDB.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new apiError(404, "Group chat does not exist");
  }

  if (groupChat.admin?.toString() !== req.user._id?.toString()) {
    throw new apiError(404, "You are not an admin");
  }

  const existingParticipants = groupChat.participants;

  if (!existingParticipants?.includes(participantId)) {
    throw new apiError(400, "Participant does not exist in the group chat");
  }

  const updatedChat = await ChatDB.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        participants: participantId,
      },
    },
    { new: true }
  );

  const chat = await ChatDB.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new apiError(500, "Internal server error");
  }

  emitSocketEvent(req, participantId, ChatEventEnum.LEAVE_CHAT_EVENT, payload);

  return res
    .status(200)
    .json(new apiResponse(200, "Participant removed successfully", payload));
});

const getAllChats = asyncHandler(async (req, res) => {
  const chats = await ChatDB.aggregate([
    {
      $match: {
        participants: { $elemMatch: { $eq: req.user._id } },
      },
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    ...chatCommonAggregation(),
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(200, "User chats fetched successfully!", chats || [])
    );
});

export {
  getAllChats,
  addNewParticipantInGroupChat,
  removeParticipantFromGroupChat,
  leaveGroupChat,
  deleteOneOnOneChat,
  deleteGroupChat,
  renameGroupChat,
  getGroupChatDetails,
  createAGroupChat,
  createOrGetAOneOnOneChat,
  searchAvailableUsers,
};
