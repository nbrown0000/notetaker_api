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





// async helper function for /getlists route
async function getListCount(list) {
  let count = await knex('notes').where({ list_id: list.list_id }).count('body')
  return count
}


// helper function for /getlists
const getLists = user_id => {
  return knex('lists').where({ user_id: user_id })
  .then(lists => {
    if(!lists[0]) {
      return [];
    }
    return lists
  })
}


app.post("/getlists", [

  // sanitize and validate input
  body('user_id')
    .escape()
    .notEmpty().withMessage("Must not be empty")
    .isNumeric().withMessage("Must be a number")
], async (req,res) => {

  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // return lists
  const lists = await getLists(req.body.user_id)
  res.send(lists);
})



app.post("/addlist", [

  // sanitize and validate input
  body('user_id')
    .escape()
    .isNumeric().withMessage("Must be a number")
    .notEmpty().withMessage("Cannot be empty"),
  body('title')
    .escape()
    .isLength({ max: 50 }).withMessage("Cannot be longer than 50 characters")
    // .notEmpty().withMessage("Cannot be empty")
    .trim()
], (req,res) => {

  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // insert list to DB
  knex('users').where({ user_id: req.body.user_id })
  .then(users => {
    if(!users[0]) {
      console.error("User not found!")
      res.status(404).send("User not found!")
    }
    knex('lists').insert({
      title: req.body.title,
      created: new Date(),
      user_id: req.body.user_id
    })

    // catch errors
    .then(lists => {
      if(!lists) { console.error("Unable to add list.") }

      // return lists
      (async() => {
        const lists = await getLists(req.body.user_id)
        res.send(lists);
      })();

    })
    .catch(err => {
      console.error(err);
      res.send('Unable to add list')
    })
  })
})





app.post("/updatelist", [

  // validate inputs
  body('list_id')
    .escape()
    .notEmpty().withMessage("Cannot be empty")
    .isNumeric().withMessage("Must be a number"),
  body('title')
    .escape()
    .notEmpty().withMessage("Cannot be empty")
    .trim()
], (req,res) => {

  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }


  knex('lists')
    .where({ list_id: req.body.list_id })
    .update({ title: req.body.title })
    .then(lists => {
      if(!lists) {
        console.error("Unable to update list!");
        res.status(404).send("Unable to update list!")
      }

      knex('lists')
        .where({ list_id: req.body.list_id })
        .then(returnList => {
          res.send(returnList[0])
        })
      
        
      // res.send(lists[0])
      
      // res.json("list updated successfully")
    })
})





app.post("/deletelist", [

  // validate inputs
  body('user_id')
    .escape()
    .notEmpty().withMessage("Must not be empty")
    .isNumeric().withMessage("Must be a number"),
  body('list_id')
  .escape()
  .notEmpty().withMessage("Cannot be empty")
  .isNumeric().withMessage("Must be a number")
], (req,res) => {

  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  knex('lists').where({ list_id: req.body.list_id })
  .del()
  .then(async lists => {
    if(!lists) { console.error("Unable to delete list.") }
    
    // return updated lists
    const updatedLists = await getLists(req.body.user_id)
    res.send(updatedLists);
  })
  .catch(err => {
    console.error(err);
    res.send("Unable to delete list");
  })
})



app.post('/mostrecentlist', [

  // sanitize and validate input
  body('user_id')
    .escape()
    .isNumeric().withMessage("Must be a number")
], (req,res) => {

  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // get lists from DB
  knex('lists').where({ user_id: req.body.user_id}).orderBy('created', 'desc').limit(1)
  .then(lists => {
    if(!lists) { console.error("Unable to find list"); throw new Error("Unable to find list")}
    
    knex('notes').where({ list_id: lists[0].list_id }).count('body')
    .then(data => {
      // console.log(data[0])
      res.send({ list: lists[0], count: data[0] })
    })

  })
  .catch(err => {
    console.error(err);
    res.send("Unable to find list");
  })
})



module.exports = app;