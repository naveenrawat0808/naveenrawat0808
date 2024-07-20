import { Router } from "express";
import {
  getPostComments,
  addComment,
  updateComment,
  deleteComment,
} from "../controller/comment.controller.js";
import { UserAuthentication } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(UserAuthentication); // Apply verifyJWT middleware to all routes in this file

router.route("/p/c/:PostId").get(getPostComments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;
