const express = require('express');
const app = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const cors = require('cors');
const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(cors());
const loginError = "Username or password incorrect."

if(process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

var knex = require('knex')({
  client: 'pg',
  connection: {
    host : process.env.DB_HOST,
    user : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_NAME
  }
});


app.post("/login", [

  // sanitize and validate input
  body('username')
    .isString()
    .escape()
    .notEmpty()
    .withMessage("Must not be empty"),
  body('password')
    .isLength({ min: 6 })
    .escape()
    .notEmpty()
    .withMessage("Must not be empty")
], (req,res) => {
  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    console.error(errors)
    return res.status(400).json({ errors: errors.array() });
  }

  knex('users')
    .where({ username: req.body.username })
    .then(users => {
      if(!users[0]) {
        res.status(404).send(loginError);
      }
      bcrypt.compare(req.body.password, users[0].password, function(err,result) {
        if(result) {
          const userObject = {
            user_id: users[0].user_id,
            username: users[0].username
          };
          res.send(userObject);
        } else {
          res.status(404).send(loginError)
        }
      })
    })
    .catch(err => console.error(err))
});





app.post("/register", [
  
  // sanitize and validate input
  body('password')
    .escape()
    .isLength({ min: 6 })
    .withMessage("password must be at least 6 characters long"),
  body('email')
    .escape()
    .isEmail()
    .withMessage("email must be valid format")
    .normalizeEmail()
], (req,res) => {

  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    console.error(errors)
    return res.status(400).json({ errors: errors.array() });
  }

  // hash password
  const saltRounds = 10;
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    knex('users').insert({
      username: req.body.username,
      email: req.body.email,
      password: hash,
      created: new Date()
    })
    // catch user creation errors
    .then(users => {
      if(!users) { console.error(">>> USER AREADY EXISTS!") }
      res.status(200).json("Registered sucessfully")
    })
    .catch(err => {
      console.error(err)
      res.send('Unable to register user')
    })
  })

  
})



module.exports = app;