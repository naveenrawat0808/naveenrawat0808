import { Router } from "express";
import {
  getAllPost,
  getAllUsersPost,
  publishAPost,
  getPostById,
  updatePost,
  deletePost,
  togglePublishStatus,
  getPostByUserId,
} from "../controller/posts.controller.js";
import { UserAuthentication } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { healthcheck } from "../controller/healthcheck.controller.js";

const router = Router();
router.use(UserAuthentication); // Apply verifyJWT middleware to all routes in this file

router.route("/").get(getAllPost).post(upload.single("postImg"), publishAPost);
router.route("/all-posts").get(getAllUsersPost);
router.route("/:userId").get(getPostByUserId);
router
  .route("/:PostId")
  .get(getPostById)
  .delete(deletePost)
  .patch(upload.single("postImg"), updatePost);

router.route("/toggle/publish/:PostId").patch(togglePublishStatus);

export default router;
