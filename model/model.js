const mongoose = require("mongoose");

const listsubject = new mongoose.Schema({
  uid: { type: String, required: true },
  subjectname: { type: String, required: true },
  subjectcode: { type: String, required: true },
  subjectcredit: { type: Number, required: true },
  basketno: { type: Number, required: true },
  semester: { type: Number, required: true },
  year: { type: Number, required: true },
});

// create a schema for mongoDB for user
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  regno: { type: Number, required: true, unique: true },
  year: { type: Number, required: true },
  admin: { type: Boolean, required: true },
  basket1: { type: Number, required: true },
  basket2: { type: Number, required: true },
  basket3: { type: Number, required: true },
  basket4: { type: Number, required: true },
  basket5: { type: Number, required: true },
});

//create model for mongoDB
const User = mongoose.model("User", userSchema);
const ListSubject = mongoose.model("ListSubject", listsubject);

//export the model
module.exports = { User, ListSubject };
