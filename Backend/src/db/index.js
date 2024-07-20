import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";


const connectDB = async ()=>{
    try {
        mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
        console.log("MongoDB is connected successfully");
    } catch (error) {
        console.log("MongoDB Connection Failed" , error);
        process.exit(1);        //terminate the code with an error.
    }
}

export default connectDB;