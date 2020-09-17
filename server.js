const express = require("express");
const app = express();
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
var cors = require('cors');
const { response } = require("express");
const { body, validationResult } = require('express-validator');
if(process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

app.use(bodyParser.json())
app.use(cors());

var knex = require('knex')({
  client: 'pg',
  connection: {
    host : process.env.DB_HOST,
    user : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_NAME
  }
});

const loginError = "Username or password incorrect."

app.get("/", (req,res) => {
  knex('users').select('*')
    .then(users => {
      res.send(users)
    })
})

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
    return res.status(400).json({ errors: errors.array() });
  }

  knex('users')
    .where({ username: req.body.username })
    .then(users => {
      if(!users[0]) {
        res.status(404).send(loginError);
        throw new Error('user not found');
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
    .catch(err => console.error(err.message))
})

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
      if(!users) { throw new Error("user already exists!") }
      res.status(200).json("Registered sucessfully")
    })
    .catch(err => {
      res.send('Unable to register user')
      console.log(err);
      throw err;
    })
  })

  
})


// async helper function for /getlists route
async function getListCount(list) {
  let count = await knex('notes').where({ list_id: list.list_id }).count('body')
  return count
}

app.post("/getlists", [

  // sanitize and validate input
  body('user_id')
    .escape()
    .notEmpty().withMessage("Must not be empty")
    .isNumeric().withMessage("Must be a number")
], (req,res) => {

  // catch validation error
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // get lists from DB
  knex('lists').where({ user_id: req.body.user_id})
  .then(lists => {
    if(!lists[0]) {
      res.status(404).send("No lists found for user.");
      throw new Error("No lists for user found");
    }

    // map each list to generate object containing list and note count
    const results = lists.map(async (list) => {
      let count = await getListCount(list)
      return { list: list, count: count[0].count }
    })
    Promise.all(results).then(data => res.send(data))
    
  })
})


app.post("/getnotes", (req,res) => {
  if(!req.body.list_id) {
    res.status(404).send("Invalid request.")
  }
  knex('notes').where({ list_id: req.body.list_id})
  .then(notes => {
    if(!notes) {
      res.status(404).send("Error fetching notes");
      throw new Error("Error fetching notes");
    }
    knex('lists').where({ list_id: req.body.list_id})
    .then(lists => {
      if(!lists[0]) {
        res.status(404).send("List not found");
        throw new Error("List not found");
      }
      const object = {
        list_id: lists[0].list_id,
        title: lists[0].title,
        notes: notes
      }
      res.send(object)
    })
    
  })
})

app.post("/addlist", (req,res) => {
  knex('users').where({ user_id: req.body.user_id })
  .then(users => {
    if(!users[0]) {
      res.status(404).send("User not found!")
      throw new Error("User not found!")
    }
    knex('lists').insert({
      title: req.body.title,
      created: new Date(),
      user_id: req.body.user_id
    })
    .then(lists => {
      if(!lists) { throw new Error("Unable to add list.") }
      res.status(200).send("list added sucessfully")
    })
    .catch(err => {
      res.send('Unable to add list')
      console.log(err);
      throw err;
    })
  })
})

app.post("/addnote", (req,res) => {
  knex('lists').where({ list_id: req.body.list_id })
  .then(lists => {
    if(!lists[0]) {
      res.status(404).send("User not found!")
      throw new Error("User not found!")
    }
    knex('notes').insert({
      body: req.body.body,
      list_id: req.body.list_id
    })
    .then(notes => {
      if(!notes) { throw new Error("Unable to add note.") }
      res.status(200).send("note added sucessfully")
    })
    .catch(err => {
      res.send('Unable to add note')
      console.log(err);
      throw err;
    })
  })
})

app.post("/updatenote", (req,res) => {
  knex('notes')
    .where({ note_id: req.body.note_id })
    .update({ body: req.body.body })
    .then(notes => {
      if(!notes) {
        res.status(404).send("Unable to update note!")
        throw new Error("Unable to update note!");
      }
      res.json("Note updated successfully")
    })
})

app.post("/deletenote", (req,res) => {
  knex('notes').where({ note_id: req.body.note_id })
  .del()
  .then(result => {
    if(response.ok) { res.send("Successfully deleted note") }
    else { res.send("Unable to delete note"); }
  })
  .catch(err => {
    res.send("Unable to delete note");
    console.log(err);
    throw err;
  })
})

app.post("/updatelist", (req,res) => {
  knex('lists')
    .where({ list_id: req.body.list_id })
    .update({ title: req.body.title })
    .then(lists => {
      if(!lists) {
        res.status(404).send("Unable to update list!")
        throw new Error("Unable to update list!");
      }
      res.json("list updated successfully")
    })
})

app.post("/deletelist", (req,res) => {
  knex('lists').where({ list_id: req.body.list_id })
  .del()
  .then(lists => {
    if(!lists) { throw new Error("Unable to delete list.") }
    res.status(200).send("list deleted sucessfully")
  })
  .catch(err => {
    res.send("Unable to delete list");
    console.log(err);
    throw err;
  })
})



const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Listening on port ${process.env.PORT}`))