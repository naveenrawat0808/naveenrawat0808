import { UserDB } from "../model/users.model.js";
import { apiError } from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { FollowingDB } from "../model/followers.model.js";
import mongoose from "mongoose";

const toggleFollowers = asyncHandler(async (req, res) => {
  const { followingId } = req.params;

  if (req.user._id === followingId) {
    throw new apiError(401, "You cannot toggle Following Yourself!");
  }
  const user = await FollowingDB.findById(followingId);

  if (!user) {
    throw new apiError(404, "User Not Found!");
  }

  const isFollowed = !user.isFollowed;

  user.updateOne(
    {
      set: {
        isFollowed,
      },
    },
    {
      new: true,
    }
  );

  res
    .status(200)
    .json(new apiResponse(200, "The Followers is Toggled Successfully."));
});

// controller to return Followed and following list of a User
const getUserFollowing = asyncHandler(async (req, res) => {
  const { followingId } = req.params;
  // console.log(followingId);
  const followers = await UserDB.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(followingId),
      },
    },
    {
      $lookup: {
        from: "followingdbs",
        localField: "_id",
        foreignField: "followedId",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "followingdbs",
        localField: "_id",
        foreignField: "followerId",
        as: "followedTo",
      },
    },
    {
      $addFields: {
        Followers: "$followers",
        FollowedTo: "$followedTo",
        followingCount: {
          $size: "$followers",
        },
        followedCount: {
          $size: "$followedTo",
        },
      },
    },
    {
      $project: {
        FollowedTo: 1,
        Followers: 1,
        followingCount: 1,
        followedCount: 1,
      },
    },
  ]);

  if (!followers?.length) {
    throw new apiError(404, "Followers does not exist!");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, "User Followers Fetched Successfully.", followers[0])
    );
});

const userFollowings = asyncHandler(async (req, res) => {
  const { followingId } = req.params;

  const user = await UserDB.findById(followingId);
  if (!user) {
    throw new apiError(404, "No User Found you want to follow!");
  }
  if (followingId == req.user._id) {
    throw new apiError(400, "You cannot follow yourself!");
  }

  const userfollowers = await FollowingDB.findOne({
    followerId: req.user._id,
    followedId: followingId,
  });
  if (userfollowers) {
    await FollowingDB.findByIdAndDelete(userfollowers._id);
    return res
      .status(200)
      .json(new apiResponse(200, "You Unfollow User Successfully."));
  }

  const followingToUser = await FollowingDB.create({
    followerId: req.user?._id,
    followedId: followingId,
  });

  res
    .status(201)
    .json(
      new apiResponse(200, "You Followed User Successully.", followingToUser)
    );
});

export { toggleFollowers, getUserFollowing, userFollowings };
