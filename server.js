const express = require("express");
const app = express();
const bodyParser = require('body-parser')
var cors = require('cors');
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

const loginError = "Username or password incorret."

app.get("/", (req,res) => {
  knex('users').select('*')
    .then(users => {
      res.send(users)
    })
})

app.post("/login", (req,res) => {
    knex('users')
      .where({ username: req.body.username, password: req.body.password })
      .then(users => {
        if(!users[0]) {
          res.status(404).send(loginError);
          throw new Error('user not found')
        }
        const usernameMatches = users[0].username === req.body.username;
        const passwordMatches = users[0].password = req.body.password;
        if(usernameMatches && passwordMatches) {
          const userObject = {
            user_id: users[0].user_id,
            username: users[0].username,
            created: users[0].created,
            last_login: users[0].last_login
          }
          res.send(userObject)
        } else {
          res.status(404).send(loginError)
        }
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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Listening on port ${process.env.PORT}`))