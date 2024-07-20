import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import { UserAuthentication } from "../middlewares/auth.middleware.js";
import {
  getAllMessages,
  sendMessage,
  deleteMessage,
} from "../controller/message.controllers.js";

const router = Router();

router.use(UserAuthentication);

router
  .route("/:chatId")
  .get(getAllMessages)
  .post(upload.fields([{ name: "attachments", maxCount: 5 }]), sendMessage);

router.route("/:chatId/:messageId").delete(deleteMessage);

export default router;
