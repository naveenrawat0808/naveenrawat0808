import mongoose, { isValidObjectId, mongo } from "mongoose";
import { likesDB } from "../model/likes.model.js";
import { apiError } from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { CommentDB } from "../model/comments.model.js";

const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const userLikeToggle = await likesDB.findOne({
    post: postId,
    likedBy: req.user?._id,
  });

  if (userLikeToggle) {
    await likesDB.findByIdAndDelete(userLikeToggle._id);

    return res.status(200).json(new apiResponse(200, "Unliked Successfully."));
  }

  const userLike = await likesDB.create({
    post: postId,
    likedBy: req.user?._id,
  });

  if (!userLike) {
    throw new apiError(404, "unable to like this video!");
  }
  const likedDetails = await likesDB.findById(userLike._id);

  res
    .status(200)
    .json(new apiResponse(200, "Liked Successfully.", likedDetails));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const validcomment = await CommentDB.findById(commentId);

  if (!validcomment) {
    throw new apiError(404, "invalid commentId!");
  }

  const isAlreadyExist = await likesDB.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (!isAlreadyExist) {
    const likedComment = await likesDB.create({
      comment: commentId,
      likedBy: req.user?._id,
    });
    return res
      .status(201)
      .json(
        new apiResponse(200, "The Comment is Liked Successfully.", likedComment)
      );
  }

  await isAlreadyExist.deleteOne();
  res
    .status(200)
    .json(new apiResponse(200, "The Comment is Unliked Successfully.", []));
});

const getLikedPost = asyncHandler(async (req, res) => {
  const fetchedAllLikedPost = await likesDB.aggregate([
    {
      $match: {
        likedBy: req.user?._id,
      },
    },
  ]);
  if (!fetchedAllLikedPost?.length) {
    throw new apiError(404, "No liked Post Exist!");
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        "All Liked Post Fetched Successfully.",
        fetchedAllLikedPost
      )
    );
});

export { toggleCommentLike, togglePostLike, getLikedPost };
