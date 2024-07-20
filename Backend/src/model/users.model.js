import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    avatar: {
      type: String, // cloudinary url
    },
    coverImage: {
      type: String, // cloudinary url
    },
    password: {
      type: String,
      require: [true, "Password is required"],
    },
    education: {
      institionName: String,
      degree: String,
      fieldOfStudy: String,
      startDate: String,
      endDate: String,
    },
    skill: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
    },
    district: {
      type: String,
    },
    state: {
      type: String,
    },
    country: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const UserDB = mongoose.model("UserDB", userSchema);
