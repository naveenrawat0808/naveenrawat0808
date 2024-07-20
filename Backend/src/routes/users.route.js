import { Router } from "express";
import {
  ChangeCurrentPassword,
  DeleteUserAccount,
  UpdateCoverImage,
  UpdateUserAvatar,
  UpdateUserDetails,
  UserTokenRefreshing,
  getUserChannelDetails,
  getUserDetails,
  userLogIn,
  userLogOut,
  userRegisteration,
  getUserDetailsByUserId,
} from "../controller/users.controller.js";
import { UserAuthentication } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

router.route("/register").post(userRegisteration);
router.route("/login").post(userLogIn);
router.route("/logout").post(UserAuthentication, userLogOut);

router.route("/user-info").get(UserAuthentication, getUserDetails);

router.route("/refresh-token").post(UserAuthentication, UserTokenRefreshing);

router
  .route("/change-password")
  .post(UserAuthentication, ChangeCurrentPassword);

router.route("/update-account").post(UserAuthentication, UpdateUserDetails);

router.route("/delete-account").post(UserAuthentication, DeleteUserAccount);

router
  .route("/update-avatar")
  .post(UserAuthentication, upload.single("avatar"), UpdateUserAvatar);

router
  .route("/update-coverimage")
  .post(UserAuthentication, upload.single("coverImage"), UpdateCoverImage);

router
  .route("/accounts/channel/:username")
  .get(UserAuthentication, getUserChannelDetails);

router
  .route("/accounts/profile/:userId")
  .get(UserAuthentication, getUserDetailsByUserId);

export default router;
