const express = require("express");
const app = express();

const bodyParser = require('body-parser')
const cors = require('cors');

const user = require('./Routes/user');
const list = require('./Routes/list');
const note = require('./Routes/note');

if(process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

app.use(bodyParser.json())
app.use(cors());

app.get("/", (req,res) => { res.status(404).send("Invalid destination") })
app.use("/user", user)
app.use("/list", list)
app.use("/note", note)


const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Listening on port ${process.env.PORT}`))