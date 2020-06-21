const express = require("express");
const app = express();
const bodyParser = require('body-parser')
var cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

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

const loginError = "Username or password incorret."

app.get("/", (req,res) => {
  knex('users').select('*')
    .then(users => {
      res.send(users)
    })
})

app.post("/login", (req,res) => {
    knex('users')
      .where({ email: req.body.email, password: req.body.password })
      .then(users => {
        if(!users[0]) {
          res.status(404).send(loginError);
          throw new Error('user not found')
        }
        const emailMatches = users[0].email === req.body.email;
        const passwordMatches = users[0].password = req.body.password;
        emailMatches && passwordMatches ? res.send(users[0]) : res.status(404).send(loginError)
      })
      .catch(err => console.error(err.message))
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