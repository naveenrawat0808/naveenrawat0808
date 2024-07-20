import jwt from "jsonwebtoken";
import { apiError } from "../utils/apiError.js";
import { UserDB } from "../model/users.model.js";
import asyncHandler from "../utils/asyncHandler.js";

const UserAuthentication = asyncHandler(async (req, _, next) => {
  const userAccessToken =
    req.cookies?.userLoginDetails ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!userAccessToken) {
    throw new apiError(401, "User is Logged Out!");
  }

  const isTokenValid = jwt.verify(
    userAccessToken,
    process.env.ACCESS_TOKEN_SECRET
  );

  const userDetails = await UserDB.findById(isTokenValid._id).select(
    "-password -refreshToken"
  );

  // console.log(userDetails);
  if (!userDetails) {
    throw new apiError(401, "Invalid User Tokens!");
  }
  req.user = userDetails;

  next();
});

export { UserAuthentication };
