import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CORS_URL,
    credentials: true,
  },
});

app.set("io", io); // using set method to mount the `io` instance on the app to avoid usage of `global`

app.use(
  cors({
    origin: process.env.CORS_URL,
    methods: ["Get", "POST"],
    optionsSuccessStatus: 200,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

import userRoutes from "./routes/users.route.js";
import userFollowers from "./routes/followers.routes.js";
import userPost from "./routes/posts.route.js";
import postLike from "./routes/likes.route.js";
import postComment from "./routes/comment.routes.js";

app.use("/api/v1/users", userRoutes, userFollowers);
app.use("/api/v1/posts", userPost, postLike, postComment);

import { initializeSocketIO } from "./sockets/index.js";
initializeSocketIO(io);

import chatRouter from "./routes/chat.routes.js";
import messageRouter from "./routes/message.routes.js";

app.use("/api/v1/chat-app/chats", chatRouter);
app.use("/api/v1/chat-app/messages", messageRouter);

export { httpServer };
