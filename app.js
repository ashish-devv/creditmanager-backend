require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authenticateJWT = require("./middleware/middleware");
const cors = require("cors");

app.use(express.json());
app.use(cors());

const { User, ListSubject } = require("./model/model");

//connect to mongoDB and print the connection status
mongoose.connect(
  process.env.DB_URL,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log("Connected to mongoDB");
    }
  }
);

// mongoose.set("debug", true);

//create a api to login a user
app.post("/api/login", async (req, res) => {
  //get the email and password from the request body
  const { email, password } = req.body;
  //find the user with the email
  const user = await User.findOne({ email }).lean();
  //if user is not found
  if (!user) {
    return res.json({ status: "User not found", code: 1 });
  }
  //if user is found
  //compare the password with the hashed password
  const isMatch = await bcrypt.compare(password, user.password);
  //if password is not matched
  const adminstatus = user.admin;
  if (!isMatch) {
    return res.json({ status: "Incorrect password", code: 1 });
  } else {
    const token = jwt.sign(
      {
        uid: user._id,
        email: user.email,
        regno: user.regno,
        name: user.name,
        admin: user.admin,
        basket: {
          b1: user.basket1,
          b2: user.basket2,
          b3: user.basket3,
          b4: user.basket4,
          b5: user.basket5,
        },
      },
      process.env.SECRET_KEY
    );
    res.send({ success: 1, token, adminstatus });
  }
  //if password is matched
  //create a token
});

//create a Api to register a user
app.post("/api/register", async (req, res) => {
  const { email, password: plainpwd, name, regno, year, admincode } = req.body;
  // validate the user input
  if (!email || !plainpwd || !name || !regno || !year) {
    return res.json({ status: "Please fill all the fields" });
  }
  //validate the email
  const emailRegex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!emailRegex.test(email)) {
    return res.json({ status: "Please enter a valid email" });
  }
  //validate email is from  the same domain
  const domain = email.split("@")[1];
  if (domain !== "cutm.ac.in") {
    return res.json({ status: "Please enter a valid Cutm email" });
  }
  //validate the password
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(plainpwd)) {
    return res.json({ status: "Please enter a valid password" });
  }
  //check year is valid like 2000
  const yearRegex = /^[0-9]{4}$/;
  if (!yearRegex.test(year)) {
    return res.json({ status: "Please enter a valid year" });
  }
  // check if the user already exists
  const user = await User.findOne({ email });
  if (user) {
    return res.json({
      status: "User already exists",
      message: "User Already Exists",
    });
  }
  //check if the regno already exists
  const regnoExists = await User.findOne({ regno });
  if (regnoExists) {
    return res.json({
      status: "User already exists",
      message: "User Already Exists",
    });
  }
  //check admin code
  var admin = null;
  if (admincode === undefined || admincode === null || admincode === "") {
    admin = false;
  } else if (admincode === process.env.ADMIN_CODE) {
    admin = true;
  } else {
    admin = false;
    return res.json({
      status: "Admin code is incorrect",
      message: "Admin Code is incorrect",
    });
  }
  // hash the password
  const password = await bcrypt.hash(plainpwd, 10);
  try {
    const response = await User.create({
      email,
      password,
      name,
      regno,
      year,
      admin,
      basket1: 18,
      basket2: 18,
      basket3: 27,
      basket4: 45,
      basket5: 52,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({
        status: "User already exists",
        code: 1,
        message: "User Already Exists",
      });
    } else {
      return res.json({ status: err });
    }
  }
  return res.json({ status: "success", code: 0 });
});

app.get("/hello", (req, res) => {
  //console.log(req.decoded);
  return res.json({ status: "success" });
});

//create a api to create a entry in subject list
app.post("/api/addsubject", authenticateJWT, async (req, res) => {
  const { subjectname, subjectcode, subjectcredit, basketno, semester, year } =
    req.body;
  console.log(req.body);
  //validate the user input and subject code and subject name should be string and subject credit should be number
  if (
    typeof subjectname !== "string" ||
    typeof subjectcode !== "string" ||
    !subjectname ||
    !subjectcode ||
    !subjectcredit ||
    !basketno ||
    !semester ||
    !year
  ) {
    return res.json({ status: "Please fill all the fields" });
  }

  //create a new entry in subject list
  const subject = new ListSubject({
    uid: req.decoded.uid,
    subjectname,
    subjectcode,
    subjectcredit,
    basketno,
    semester,
    year,
  });
  try {
    const response = await subject.save();
  } catch (err) {
    return res.json({ status: err });
  }
  return res.json({ status: "success", code: 0 });
});

//create a api to delete the subject from the subject list\
app.delete("/api/deletesubject/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  //validate the user input
  if (!id) {
    return res.json({ status: "Please fill all the fields" });
  }
  //delete the subject from the subject list
  try {
    const response = await ListSubject.deleteOne({ _id: id });
  } catch (err) {
    return res.json({ status: err });
  }
  return res.json({ status: "success", code: 0 });
});

//create a api to get the subject list of user
app.get("/api/getsubjectlist", authenticateJWT, async (req, res) => {
  //get the subject list of user
  const subjectlist = await ListSubject.find({ uid: req.decoded.uid });
  //if subject list is not found
  if (!subjectlist) {
    return res.json({ status: "Subject list not found", code: 1 });
  }
  //if subject list is found
  return res.json({ status: "success", code: 0, subjectlist });
});

app.get("/api/getsubjectlist/:regno", async (req, res) => {
  const regno = req.params.regno;
  //validate regno input having only numbers
  const regnoRegex = /^[0-9]+$/;
  if (!regnoRegex.test(regno)) {
    return res.json({ status: "Please enter a valid regno" });
  }
  // check if the regno exists
  const user = await User.findOne({ regno }).select("-password");
  //console.log(user);

  if (!user) {
    return res.json({ status: "User not found", code: 1 });
  }
  const uniqueid = user.id;
  const subjectlist = await ListSubject.find({ uid: uniqueid });
  if (!subjectlist) {
    return res.json({ status: "Subject list not found", code: 1 });
  }
  return res.json({ status: "success", code: 0, subjectlist, user });
});

//update basket credit api
app
  .route("/api/updatebasketcredit")
  .get(authenticateJWT, async (req, res) => {
    // return user
    const user = await User.findOne({ uid: req.decoded.uid }).select(
      "-password"
    );
    if (!user) {
      return res.json({ status: "User not found", code: 1 });
    }
    return res.json({ status: "success", code: 0, user });
  })
  .post(authenticateJWT, async (req, res) => {
    const { basket1, basket2, basket3, basket4, basket5 } = req.body;
    //validate the user input
    if (!basket1 || !basket2 || !basket3 || !basket4 || !basket5) {
      return res.json({ status: "Please fill all the fields" });
    }
    //update the basket credit
    try {
      const response = await User.updateOne(
        { regno: req.decoded.regno },
        {
          $set: {
            basket1,
            basket2,
            basket3,
            basket4,
            basket5,
          },
        }
      );
    } catch (err) {
      return res.json({ status: err });
    }
    return res.json({ status: "success", code: 0 });
  });

app.post("/getdetails", authenticateJWT, async (req, res) => {
  if (req.decoded.admin === true) {
    try {
      var { subjectcode, year } = req.body;
      //validate the user input
      if (
        !subjectcode ||
        !year ||
        typeof subjectcode !== "string" ||
        typeof year !== "string"
      ) {
        return res.json({ status: "Please fill all the fields", code: 0 });
      }
      if (year.length != 4) {
        return res.json({ status: "Please enter a valid year", code: 0 });
      }
      //query the database using subject code or year

      // console.log("log:", subjectlist);

      // query the database using exact year and subject code

      var subjectlist = await ListSubject.find(
        {
          subjectcode,
          year,
        },
        { uid: 1, _id: 0 }
      );
      console.log("year", typeof year);

      // console.log(
      //   "log",
      //   subjectlist.map((item) => item.uid)
      // );
      if (subjectlist.length == 0) {
        return res.json({ status: "No Data Found", code: 0 });
      }
      // get user name and regno by matching all the uid in subject list
      const userlist = await User.find(
        {
          _id: { $in: subjectlist.map((item) => item.uid) },
        },
        { name: 1, regno: 1 }
      );
      // const userlist = await User.find(
      //   { id: { $in: subjectlist } },
      //   { regno: 1, name: 1 }
      // );

      res.json({ userlist });
    } catch (error) {
      console.log(error);
      return res.json({ status: "Something went Wrong!", code: 0 });
    }
  } else {
    return res.json({ status: "You are not an admin", code: 1 });
  }
});

app.post("/getdetailyearwise", authenticateJWT, async (req, res) => {
  if (req.decoded.admin === true) {
    try {
      var { year } = req.body;
      //validate the user input
      if (!year || typeof year !== "string") {
        return res.json({ status: "Please fill all the fields", code: 0 });
      }
      if (year.length != 4) {
        return res.json({ status: "Please enter a valid year", code: 0 });
      }
      const userlist = await User.find({ year }, { name: 1, regno: 1 });
      if (userlist.length == 0) {
        return res.json({ status: "No Data Found", code: 0 });
      }
      const allsubjecttakenbyuser = await ListSubject.find({
        uid: { $in: userlist.map((item) => item._id) },
      });
      return res.json({ userlist, allsubjecttakenbyuser });
    } catch (error) {
      console.log(error);
      return res.json({ status: "Something went Wrong!", code: 0 });
    }
  } else {
    return res.json({ status: "You are not an admin", code: 1 });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server started on port 5000");
});
