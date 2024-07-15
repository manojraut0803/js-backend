import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
// import { verifyJWT } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    // if (!user) {
    //   throw new ApiError(404, "User not found");
    // }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
    throw new ApiError(
      500,
      "Something went wrong while generating Access and Refresh Token"
    );
  }
};

// register user
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
  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
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
  // const avatarLocalPath = req.files?.avatar[0]?.path;
  let avatarLocalPath;
  if (req.files && req.files.avatar && req.files.avatar[0]) {
    avatarLocalPath = req.files.avatar[0].path;
  } else {
    avatarLocalPath = undefined;
  }

  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
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

// login user
const loginUser = asyncHandler(async (req, res) => {
  // user login steps
  // [1] req.body -> data
  const { email, userName, password } = req.body;
  // console.log(email)
  // console.log(userName);

  // [2] username/email check login from
  // if (!userName && !email) {
  //   throw new ApiError(400, "username or Email is required");
  // }
  if (!(userName || email)) {
    throw new ApiError(400, "username or Email is required");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  // [3] find the user check
  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  // [4] check password if not matches
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, " Invalid user credentials");
  }

  // important
  // [5] Access Token and Refresh Token [if password correct]
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  ); // destructuring

  // optional
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // [6] send in cookies
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In Successfully"
      )
    );
});

// logout user
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  // cookies clear
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
  
    if (!user) {
      throw new ApiError(401, "Invalid  refresh token");
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used!!");
    }
  
    const options = {
      httpOnly: true,
      secure: true,
    };
  
    const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
  
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200, 
          {
            accessToken, refreshToken: newRefreshToken
          },
          "Access Token Refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
