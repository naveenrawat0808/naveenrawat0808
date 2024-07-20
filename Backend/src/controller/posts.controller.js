import mongoose, { Mongoose, isValidObjectId } from "mongoose";
import { PostDB } from "../model/posts.model.js";
import { apiError } from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

//This fetched all the User Post whose LoggedIn.
const getAllUsersPost = asyncHandler(async (req, res) => {
  const posts = await PostDB.aggregate([
    {
      $lookup: {
        from: "userdbs",
        localField: "owner",
        foreignField: "_id",
        as: "usernameDetails",
      },
    },
    {
      $lookup: {
        from: "likesdbs",
        localField: "_id",
        foreignField: "post",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "commentdbs",
        localField: "_id",
        foreignField: "post",
        as: "comments",
      },
    },
    {
      $addFields: {
        usernameDetails: "$usernameDetails",
        username: "$usernameDetails.username",
        avatar: "$usernameDetails.avatar",
        likesCount: { $size: "$likes" },
        commentsCount: { $size: "$comments" },
      },
    },
    {
      $project: {
        postImg: 1,
        title: 1,
        description: 1,
        isPublished: 1,
        username: 1,
        avatar: 1,
        createdAt: 1,
        likesCount: 1,
        commentsCount: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  if (!posts) {
    throw new apiError(404, "No Post Available!");
  }
  res
    .status(200)
    .json(new apiResponse(200, "All user Post fetched Successfully", posts));
});

const getAllPost = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  // console.log("working");
  if (!userId) throw new apiError(404, "User Id is missing!");
  const userPosts = await PostDB.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likesdbs",
        localField: "_id",
        foreignField: "post",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "commentdbs",
        localField: "_id",
        foreignField: "post",
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "userdbs",
        localField: "owner",
        foreignField: "_id",
        as: "usernameDetails",
      },
    },
    {
      $addFields: {
        usernameDetails: "$usernameDetails",
        username: "$usernameDetails.username",
        avatar: "$usernameDetails.avatar",
        likesCount: { $size: "$likes" },
        commentsCount: { $size: "$comments" },
      },
    },
    {
      $project: {
        postImg: 1,
        description: 1,
        isPublished: 1,
        username: 1,
        avatar: 1,
        createdAt: 1,
        likesCount: 1,
        commentsCount: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  res
    .status(200)
    .json(
      new apiResponse(200, "All user Posts fetched successfully.", userPosts)
    );
});
const getPostByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  // console.log(userId);
  if (!userId) throw new apiError(404, "User Id is missing!");
  const userPosts = await PostDB.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likesdbs",
        localField: "_id",
        foreignField: "post",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "commentdbs",
        localField: "_id",
        foreignField: "post",
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "userdbs",
        localField: "owner",
        foreignField: "_id",
        as: "usernameDetails",
      },
    },
    {
      $addFields: {
        usernameDetails: "$usernameDetails",
        username: "$usernameDetails.username",
        avatar: "$usernameDetails.avatar",
        likesCount: { $size: "$likes" },
        commentsCount: { $size: "$comments" },
      },
    },
    {
      $project: {
        postImg: 1,
        description: 1,
        isPublished: 1,
        username: 1,
        avatar: 1,
        createdAt: 1,
        likesCount: 1,
        commentsCount: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  res
    .status(200)
    .json(
      new apiResponse(200, "All user Posts fetched successfully.", userPosts)
    );
});

//This is for creates or post a content.
const publishAPost = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const PostImgPath = req?.file?.path;

  // console.log(description, PostImgPath);
  if (!(title || description)) {
    throw new apiError(404, "Title or description is required!");
  }
  if (PostImgPath) {
    var postImg = await uploadOnCloudinary(PostImgPath);

    if (!postImg) {
      throw new apiError(
        400,
        "Error while uploading post image on Cloudinary!"
      );
    }
  }
  const publishingPost = await PostDB.create({
    postImg: postImg.url || "",
    title,
    owner: req.user._id,
    description,
  });

  const publishedPost = await PostDB.findById(publishingPost._id).select(
    "-owner"
  );
  res
    .status(201)
    .json(
      new apiResponse(200, "The Post is published successfully.", publishedPost)
    );
});

//This fetched all the post by using userId.
const getPostById = asyncHandler(async (req, res) => {
  const { PostId } = req.params;

  const post = await PostDB.findById(PostId);

  if (!post) {
    throw new apiError(404, "Invalid Post ID.");
  }
  res
    .status(200)
    .json(new apiResponse(200, "The Post is fetched successfully.", post));
});

const updatePost = asyncHandler(async (req, res) => {
  const { PostId } = req.params;

  const { title, description } = req?.body;

  const PostImgPath = req?.file?.path;

  // if (!title || !description) {
  //   throw new apiError(404, "title and description is required!");
  // }

  if (PostImgPath) {
    var postImg = await uploadOnCloudinary(PostImgPath);

    if (!postImg) {
      throw new apiError(
        400,
        "Error while uploading post image on Cloudinary!"
      );
    }
  }

  const newPost = await PostDB.findByIdAndUpdate(
    PostId,
    {
      $set: {
        title: title,
        description: description,
        postImg: postImg.url,
      },
    },
    {
      new: true,
    }
  );
  res
    .status(200)
    .json(new apiResponse(200, "The Post is Updated Successfully.", newPost));
});

const deletePost = asyncHandler(async (req, res) => {
  const { PostId } = req.params;

  const Post = await PostDB.findById(PostId);

  if (!Post) {
    throw new apiError(404, "Post Not Found!");
  }

  await Post.deleteOne();
  res
    .status(200)
    .json(new apiResponse(200, "The Post is deleted successfully."));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { PostId } = req.params;

  const Post = await PostDB.findById(PostId);

  if (!Post) {
    throw new apiError(400, "Post Not Found!");
  }

  if (Post?.owner !== req.user._id) {
    throw new apiError(401, "You are unauthorized for this function!");
  }
  const isPublished = !Post.isPublished;

  Post.updateOne(
    {
      set: {
        isPublished,
      },
    },
    {
      new: true,
    }
  );

  res
    .status(200)
    .json(new apiResponse(200, "isPublished Toggled Successfully."));
});

export {
  getAllPost,
  getAllUsersPost,
  getPostByUserId,
  publishAPost,
  getPostById,
  updatePost,
  deletePost,
  togglePublishStatus,
};
