import { UserAuthentication } from "../middlewares/auth.middleware.js";
import { Router } from "express";
import {
  getAllChats,
  addNewParticipantInGroupChat,
  removeParticipantFromGroupChat,
  leaveGroupChat,
  deleteOneOnOneChat,
  deleteGroupChat,
  renameGroupChat,
  getGroupChatDetails,
  createAGroupChat,
  createOrGetAOneOnOneChat,
  searchAvailableUsers,
} from "../controller/chat.controllers.js";
import { healthcheck } from "../controller/healthcheck.controller.js";

const router = Router();

router.use(UserAuthentication);

router.route("/a").get(healthcheck);
router.route("/").get(getAllChats);
router.route("/users").get(searchAvailableUsers);
router.route("/c/:receiverId").post(createOrGetAOneOnOneChat);

router.route("/group").post(createAGroupChat);
router
  .route("/group/:chatId")
  .get(getGroupChatDetails)
  .patch(renameGroupChat)
  .delete(deleteGroupChat);

router
  .route("/group/:chatId/:participantId")
  .post(addNewParticipantInGroupChat)
  .delete(removeParticipantFromGroupChat);

router.route("/leave/group/:chatId").delete(leaveGroupChat);

router.route("/remove/:chatId").delete(deleteOneOnOneChat);

export default router;
