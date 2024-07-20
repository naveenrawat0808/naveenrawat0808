import mongoose from "mongoose";
import { CommentDB } from "../model/comments.model.js";
import { apiError } from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getPostComments = asyncHandler(async (req, res) => {
  const { PostId } = req.params;

  const PostComments = await CommentDB.aggregate([
    {
      $match: {
        post: mongoose.Types.ObjectId(PostId),
      },
    },
    {
      $lookup: {
        from: "postdbs",
        localField: "post",
        foreignField: "_id",
        as: "postdetails",
        pipeline: [
          {
            $lookup: {
              from: "userdbs",
              localField: "owner",
              foreignField: "_id",
              as: "userDetails",
            },
          },
          {
            $project: {
              fullName: 1,
              username: 1,
              email: 1,
              avatar: 1,
              coverImage: 1,
              videoFile: 1,
              postImg: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
  ]);

  if (!PostComments?.length) {
    throw new apiError(404, "Post does not exist!");
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        "All comments are fetched successfully.",
        PostComments[0]
      )
    );
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (content.trim() == "") {
    throw new apiError(404, "Comment is not be empty!");
  }

  const comments = await CommentDB.create({
    content,
    post: req.params.PostId,
    owner: req.user._id,
  });

  res
    .status(201)
    .json(new apiResponse(200, "The Comment is added Successfully.", comments));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const newContent = req.body.content;

  if (newContent.trim() == "") {
    throw new apiError(404, "You cannot leave comment empty!");
  }

  const newComment = await CommentDB.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: newContent,
      },
    },
    {
      new: true,
    }
  );

  res
    .status(200)
    .json(
      new apiResponse(200, "The Comment is Updated Successfully.", newComment)
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  await CommentDB.findByIdAndDelete(req.params.commentId, {
    new: true,
  });

  res
    .status(200)
    .json(new apiResponse(200, "The Comment is deleted successfully."));
});

export { getPostComments, addComment, updateComment, deleteComment };
