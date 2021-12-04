const { validationResult } = require("express-validator");
const HttpError = require("../models/error");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    return next(
      new HttpError("Fetching user failed. Please try again later.", 500)
    );
  }
  res
    .status(200)
    .json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs pass . Please check your data.", 422)
    );
  }
  const { name, email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(
        new HttpError("User exists already. Please login instead", 422)
      );
    }
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
      return next(new HttpError("Can't hash user password."), 500);
    }
    const createdUser = new User({
      name,
      email,
      image: req.file.path,
      password: hashedPassword,
      places: [],
    });
    await createdUser.save();
    let token;
    try {
       token = jwt.sign(
        { userId: createdUser.id, email: createdUser.email },
        process.env.JWT_KEY,
        {
          expiresIn: "1h",
        }
      );
    } catch (err) {
      return next(new HttpError("Signing up failed! Please try again later."), 500);
    }

    res.status(200).json({userId:createdUser.id,email:createdUser.email, token});
  } catch (err) {
    return next(
      new HttpError("Signing up failed! Please try again later.", 500)
    );
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
    if (!existingUser) {
      return next(new HttpError("Invalid credentials, could not login.", 401));
    }
  } catch (err) {
    return next(
      new HttpError("Loggin in failed! Please try again later.", 500)
    );
  }
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(
      new HttpError(
        "Can not log you in ! Please check your credentials and try again",
        500
      )
    );
  }
  if (!isValidPassword) {
    return next(new HttpError("Invalid credentials, could not login.", 401));
  }
  let token;
    try {
       token = jwt.sign(
        { userId: existingUser.id, email: existingUser.email },
        process.env.JWT_KEY,
        {
          expiresIn: "1h",
        }
      );
    } catch (err) {
      return next(new HttpError("Loging in failed.Please try again!"), 500);
    }

    res.status(200).json({userId:existingUser.id,email:existingUser.email, token});
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
