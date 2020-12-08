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



app.post("/getnotes", [

  // sanitize and validate input
  body('list_id')
    .escape()
    .notEmpty().withMessage("Must not be empty")
    .isNumeric().withMessage("Must be a number")
], (req,res) => {

  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // get notes from DB
  knex('notes').where({ list_id: req.body.list_id})
  .then(notes => {

    // error handling for notes
    if(!notes) {
      console.error("Error fetching notes");
      res.status(404).send("Error fetching notes");
    }
    knex('lists').where({ list_id: req.body.list_id})
    .then(lists => {
      if(!lists[0]) {
        console.error("List not found");
        res.status(404).send("List not found");
      }

      // return object
      const object = {
        list_id: lists[0].list_id,
        title: lists[0].title,
        notes: notes
      }
      res.send(object)
    })
    
  })
})





app.post("/addnote", [

  // validate inputs
  body('list_id')
    .escape()
    .notEmpty().withMessage("Cannot be empty")
    .isNumeric().withMessage("Must be a number"),
  body('body')
    .escape()
    .notEmpty().withMessage("Cannot be empty")
    .trim()
], (req,res) => {
  
  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // add note to DB
  knex('lists').where({ list_id: req.body.list_id })
  .then(lists => {
    if(!lists[0]) {
      console.error("List not found!")
      res.status(404).send("List not found!")
    }
    knex('notes').insert({
      body: req.body.body,
      list_id: req.body.list_id
    })

    // catch errors
    .then(notes => {
      if(!notes) { console.error("Unable to add note.") }
      res.status(200).send("note added sucessfully")
    })
    .catch(err => {
      console.error(err);
      res.send('Unable to add note')      
    })
  })
})



app.post("/updatenote", [

  // validate inputs
  body('note_id')
    .escape()
    .notEmpty().withMessage("Cannot be empty")
    .isNumeric().withMessage("Must be a number"),
  body('body')
    .escape()
    .notEmpty().withMessage("Cannot be empty")
    .trim()
], (req,res) => {
  
  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }                                                 

  knex('notes')
    .where({ note_id: req.body.note_id })
    .update({ body: req.body.body })
    .then(notes => {
      if(!notes) {
        console.error("Unable to update note!");
        res.status(404).send("Unable to update note!")
      }
      res.json("Note updated successfully")
    })
})

app.post("/deletenote", [

  // validate inputs
  body('note_id')
  .escape()
  .notEmpty().withMessage("Cannot be empty")
  .isNumeric().withMessage("Must be a number")
], (req,res) => {
  
  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // delete note from DB
  knex('notes').where({ note_id: req.body.note_id })
  .del()

  // catch errors
  .then(result => {
    if(response.ok) { res.send("Successfully deleted note") }
    else { res.send("Unable to delete note"); }
  })
  .catch(err => {
    console.error(err);
    res.send("Unable to delete note");
  })
})




module.exports = app;