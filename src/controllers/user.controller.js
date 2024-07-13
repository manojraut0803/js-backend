import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //   res.status(200).json({ message: "ok", });

  //  user registration steps
  // [1] get user details from frontend
  const { fullName, email, userName, password } = req.body;
  // console.log("email: ", email);

  // [2] validation - if fields are empty?
  //   if (fullName === "") {
  //     throw new ApiError(400, "full name is required!");
  //   }
  if ( [fullName, email, userName, password].some((field) => field?.trim() === "") ) {
    throw new ApiError(400, "All fields are required!");
  }

  // [3] check if user already exits
  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email and username already exists");
  }
  // console.log(req.files);

  // [4] check for images - avatar and cover image
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if ( req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // [5] upload them to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // [6] create user Object- create entry in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  // [7] remove password and username
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // [8] check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //[9] return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };
