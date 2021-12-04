const fs = require("fs");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const getCoordsForAddress = require("../util/location");
const HttpError = require("../models/error");
const Place = require("../models/place");
const User = require("../models/user");

// get place by id
const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "something went wrong . could not find a place :" + err,
      500
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError(
      "could not find a place with provided place id.",
      404
    );
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) });
};

// get place by user id
const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  //let places;
  let userWithPlaces;
  try {
    //places = await Place.find({ creator: userId });
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Fetching places failed! please try again later.",
      500
    );
    return next(error);
  }
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    const error = new HttpError(
      "could not find a places with provided user id.",
      404
    );
    return next(error);
  }
  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};
const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new HttpError("Invalid inputs pass . Please check your data.", 422));
  }
  const { title, description, address, creator } = req.body;
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    next(error);
  }
  const createPlace = new Place({
    title,
    description,
    location: coordinates,
    image: req.file.path,
    address,
    creator,
  });
  try {
    let user = await User.findById(creator);
    if (!user) {
      const error = new HttpError("Can't find user by provided user id!", 500);
      return next(error);
    }
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createPlace.save({ session: sess });
    user.places.push(createPlace);
    await user.save({ session: sess });
    sess.commitTransaction();

    res.status(200).json({ place: createPlace });
  } catch (err) {
    const error = new HttpError(
      "Created place failed , please try again!" + err,
      500
    );
    return next(error);
  }
};

const updatePlaceById = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs pass . Please check your data.", 422)
    );
  }
  const { title, description, address } = req.body;
  const placeId = req.params.pid;

  let updatedPlace;
  try {
    updatedPlace = await Place.findById(placeId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong , Could not update place.", 500)
    );
  }
  // check là người tạo place mới đc quyền edit
  if (
    !updatedPlace ||
    updatedPlace.creator.toString() !== req.userData.userId
  ) {
    return next(new HttpError("You are not allowed to edit this place.", 401));
  }
  updatedPlace.title = title;
  updatedPlace.address = address;
  updatedPlace.description = description;

  try {
    await updatedPlace.save();
  } catch (err) {
    return next(
      new HttpError("Something went wrong , Could not update place.", 500)
    );
  }
  res.status(200).json({ place: updatedPlace.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;

  try {
    //populate is link place's creator to object user have place id
    place = await Place.findById(placeId).populate("creator");
    if (!place) {
      return next(new HttpError("Could not find place for this id.", 404));
    }
    // check là người tạo place mới đc quyền delete
    if (place.creator.id !== req.userData.userId) {
      return next(
        new HttpError("You are not allowed to edit this place.", 401)
      );
    }
    const imagePath = place.image;
    // using session that mean you can roll back if one of those tasks not exec successfully
    // ex : in here if place.creator.save({ session: sess }) is failed then place.remove({session: sess }) will cancel removing in mongoose.
    const sess = await mongoose.startSession();
    sess.startTransaction;
    await place.remove({ session: sess }); // 1
    place.creator.places.pull(place);
    await place.creator.save({ session: sess }); //2
    sess.commitTransaction(); // wait until this success
    fs.unlink(imagePath, (err) => {
      console.log(err);
    });
  } catch (err) {
    return next(
      new HttpError("Something went wrong , Could not delete place.", 500)
    );
  }
  res.status(200).json("Deleted place!");
};

exports.updatePlaceById = updatePlaceById;
exports.deletePlace = deletePlace;
exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
