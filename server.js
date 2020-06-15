const express = require("express");
const app = express();
const bodyParser = require('body-parser')
const dotenv = require('dotenv');
dotenv.config();

app.use(bodyParser.json())
var knex = require('knex')({
  client: 'pg',
  connection: {
    host : process.env.DB_HOST,
    user : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_NAME
  }
});

const loginError = "Username or password incorret."

app.get("/", (req,res) => {
  knex('users').select('*')
    .then(users => {
      res.send(users)
    })
})

app.post("/login", (req,res) => {
  knex('users').where('email',req.body.email)
    .then(users => {
      if(!users[0]) res.send(loginError)

      const emailMatches = users[0].email === req.body.email;
      const passwordMatches = users[0].password = req.body.password;
      
      if(emailMatches && passwordMatches) { res.send(users[0]) }
      else { res.send(loginError) }
    })
    .catch(err => {
      console.log("Error accessing database:",err);
      res.send("Error accessing database:",err);
    })
})

app.post("/register",(req,res) => {
  knex('users').insert({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password
  })
  .then(users => {
    if(!users) { throw new Error("user already exists!") }
    res.send(users[0])
  })
  .catch(err => {
    res.send('Unable to register user')
    console.log(err); throw err;
  })
})

app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}`))