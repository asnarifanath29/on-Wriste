const express = require('express');
const app = express()
const path = require("path")
const dotenv = require("dotenv")
dotenv.config();
const session = require("express-session")
const passport=require("./config/passport")
const adminRouter = require("./routes/adminRouter")
const userRouter = require("./routes/userRouter")
const db = require("./config/db")

db()
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(
    session({
        secret: process.env.SECRET_KEY, // Replace this with your own secure string
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false, // Set to true if using HTTPS
            httpOnly: true, // Helps prevent XSS
            maxAge: 1000 * 60 * 60 * 24, // Session duration (1 day)
        },
    })
);
app.use(passport.initialize());
app.use(passport.session())
app.use((req, res, next) => {
    res.set('cache-control', 'no-store')
    next();
})

app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')])
app.use(express.static(path.join(__dirname, "public")))


app.use("/", userRouter)
app.use("/admin", adminRouter)

const cors = require('cors');
app.use(cors()); // Allow all origins (or restrict as needed)

app.listen(5000, () => {
    console.log("Server Running")
})

module.exports = app;