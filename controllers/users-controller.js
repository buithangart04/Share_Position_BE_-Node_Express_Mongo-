const { validationResult } = require("express-validator");
const HttpError = require("../models/error");
const User = require("../models/user");

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
    const createdUser = new User({
      name,
      email,
      image:
        "https://i.pinimg.com/originals/60/d8/b6/60d8b611ff25ee1e59788c7eefca8a27.jpg",
      password,
      places: [],
    });
    await createdUser.save();
    res.status(200).json({ user: createdUser.toObject({ getters: true }) });
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
    if (!existingUser || existingUser.password !== password) {
      return next(new HttpError("Invalid credentials, could not login.", 401));
    }
  } catch (err) {
    return next(
      new HttpError("Loggin in failed! Please try again later.", 500)
    );
  }
  res.json({
    message: "login",
    user: existingUser.toObject({ getters: true }),
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
