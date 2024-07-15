import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// import { decode } from 'querystring';
// const urlDecode = (str) => decodeURIComponent(str);

export const verifyJWT = asyncHandler(async (req, res, next) => { // _ => res
  try {
    // Retrieve the token from the cookies or authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    // console.log(token);
    // console.log('Raw token:', token)
    if(!token){
      throw new ApiError(401, "Unauthorized request: Token not provided or invalid format");
    }
    // verify token
    // console.log({token});

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // console.log('Decoded token:', decodedToken);
    // console.log(decodedToken.foo)

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // discuss about frontend
      throw new ApiError(401, "Invalid Access Token");
    }
    req.user = user;
    next();     // Error Handling: Errors are caught, logged, and passed to the next middleware using next.
  } catch (error) {
    console.log(error)
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});
