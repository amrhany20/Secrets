//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth20' ).Strategy;
const findOrCreate = require("mongoose-findorcreate");

//const encrypt = require("mongoose-encryption");
const app = express();
//const md5 =require("md5");
const bcrypt = require("bcrypt");
const saltRounds =10;
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
    //cookie: { secure: true }
  }));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/userDB");

//TODO
const userSchema = new mongoose.Schema ({
    email:String,
    password:String,
    googelId:String,
    secret: String
});
//userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
//passport.serializeUser(User.serializeUser());
//passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function (user,done) {
    done(null,user.id);
});
passport.deserializeUser(function (id,done) {
    User.findById(id,function (err,user) {
        done(err,user);
    });
});
passport.use(new GoogleStrategy({
    clientID:     process.env.CLINTID,
    clientSecret: process.env.CLINTSECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));


app.get("/",function (req,res) {
    res.render("home")
});
app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));
app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));
app.get("/login",function (req,res) {
    res.render("login")
});
app.get("/register",function (req,res) {
    res.render("register")
});
app.get("/logout",function (req,res) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});
app.get("/secrets",function (req,res) {
    // if (req.isAuthenticated()) {
    //     res.render("secrets");
    // } else {
    //     res.redirect("/login");
    // }
    User.find({"secret":{$ne:null}},function (err,foundUsers) {
     if (err) {
        console.log(err);
     } else {
        if (foundUsers) {
            res.render("secrets",{usersWithSecrets:foundUsers});
        }
     }   
    } );
});
app.get("/submit",function (req,res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});
app.post("/submit",function (req,res) {
   const submittedSecret = req.body.secret;
   User.findById(req.user.id,function (err,foundUser) {
    if (err) {
        console.log(err);
    } else {
        if (foundUser) {
            foundUser.secret= submittedSecret;
            foundUser.save(function () {
                res.redirect("/secrets");
            });
        }
    }
   }) ;
});
app.post("/register",function (req,res) {
    User.register({username:req.body.username},req.body.password,function (err,user) {
       if (err) {
        console.log(err);
        res.redirect("/register");
       } else {
        passport.authenticate("local")(req,res,function () {
           res.redirect("/secrets"); 
        });
       } 
    });
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     // Store hash in your password DB.
    //     const newUser = new User({
    //         email:req.body.username,
    //         password:hash
    //        // password: md5(req.body.password)
    //     });
    //     newUser.save(function (err) {
    //         if (err) {
    //             console.log(err);
    //         } else {
    //             res.render("secrets");
    //         }
    //     });
    
    // });
    
});
app.post("/login",function (req,res) {
    const user = new User({
        username:req.body.username,
        password:req.body.password
    });
    req.logIn(user,function (err) {
       if (err) {
        console.log(err);
       } else {
        passport.authenticate("local")(req,res,function () {
            res.redirect("/secrets"); });
       } 
    });
    // const username = req.body.username;
    // const password=req.body.password;

    // //const password = md5(req.body.password);
    // User.findOne({email:username},function (err,foundUser) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         if (foundUser) {
    //             bcrypt.compare(password, foundUser.password, function(err, result) {
    //                 if (result) {
    //                     res.render("secrets");
    //                 } else {
    //                     console.log("wrong password");
    //                 }
    //             });
                
    //             // if(foundUser.password===password){
    //             //     res.render("secrets")
    //             // }else{
    //             //     console.log("wrong password");
    //             // }
    //         } else {
    //             console.log("no such a user registered");
    //         }
    //     }
        
    // });
});
app.listen(3000, function() {
  console.log("Server started on port 3000");
});