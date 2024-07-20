import { Router } from "express";
import {
  getLikedPost,
  toggleCommentLike,
  togglePostLike,
} from "../controller/like.controller.js";
import { UserAuthentication } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(UserAuthentication); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle/p/:postId").post(togglePostLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/user/liked-post").get(getLikedPost);

export default router;
