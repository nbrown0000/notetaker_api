const express = require('express');
const app = express.Router();
const bcrypt = require('bcrypt');
const { check, sanitize, body, validationResult } = require('express-validator');
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


// get notes helper function
const getNotes = list_id => {
  return knex('notes').where({ list_id: list_id})
  .then(notes => {
    // error handling for notes
    if(!notes) { return [] }
    // console.log(notes)
    return notes
  })
}



app.post("/getnotes", [

  // sanitize and validate input
  body('list_id')
    // .escape()
    .notEmpty().withMessage("Must not be empty")
    .isNumeric().withMessage("Must be a number")
], async(req,res) => {

  // catch validation error
  const errors = await validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // get notes from DB
  const notes = await getNotes(req.body.list_id)
  res.send(notes)
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
], async (req,res) => {
  
  // catch validation error
  const errors = await validationResult(req);
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
      (async () => {
        // get notes from DB
        const notes = await getNotes(req.body.list_id)
        res.send(notes)
      })();
    })
    .catch(err => {
      console.error(err);
      res.send('Unable to add note')      
    })
  })

  
})


// helper function for /updatenotes route
const updateNote = note => {
  // if note does not exist then create it

  // else update note body
  return new Promise((resolve, reject) => {
    knex('notes')
    .where({ note_id: note.note_id })
    .update({ body: note.body })
    .then(notes => {
      if(!notes) {
        console.error("Unable to update note!");
        reject("Unable to update note!")
      }
      resolve(notes[0])
      // resolve("Note updated successfully")
    })
  })
}

app.post("/updatenotes", [

  // validate inputs
  body('notes.*.note_id')
    .escape()
    .notEmpty().withMessage("Cannot be empty")
    .isNumeric().withMessage("Must be a number"),
  body('notes.*.body')
    .escape()
    .notEmpty().withMessage("Cannot be empty")
    .trim()
],
  (req,res) => {

  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const promises = req.body.notes.map(note => updateNote(note))
  Promise
    .all(promises)
    .then(data => {
      // fetch lists to return
      knex('notes').where({ list_id: req.body.list_id})
      .then(notes => {
        // error handling for notes
        if(!notes) { res.send([]) }
        res.send(notes)
      })
    })
    .catch(err => res.status(400).json(err))

})

app.post("/deletenote", [

  // validate inputs
  body('note_id')
  .escape()
    .notEmpty().withMessage("Cannot be empty")
    .isNumeric().withMessage("Must be a number"),
  body('list_id')
    .escape()
    .notEmpty().withMessage("Cannot be empty")
    .isNumeric().withMessage("Must be a number"),
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
    if(!result) { res.send("Unable to delete note") }

    (async() => {
      const notes = await getNotes(req.body.list_id)
      res.send(notes)
    })();
  })
  .catch(err => {
    console.error(err);
    res.send("Unable to delete note");
  })
})




module.exports = app;