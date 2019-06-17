const express = require("express");

const mongoose = require("mongoose");
const axios = require("axios");
const cheerio = require("cheerio");
const PORT = process.env.PORT || 3000;
const path = require("path");

// Require all models
var db = require("./models");
// Initialize Express
var app = express();

//TODO: GET SAVED ARTICLES WORKING

// Use morgan logger for logging requests

// Serve static content for the app from the "public" directory in the application directory.
app.use(express.static(path.join(__dirname, "./public")));
// Parse request body as JSON
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());

// Set Handlebars.
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views/layouts")
}));
app.set("view engine", "handlebars");

// require("./controllers/index.js")(app);
// require("./controllers/api.js")(app);

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI);

//============================ ROUTES
app.get('/', function (req, res) {


    // Grab every document in the Articles collection
    db.Article.find({})
        // If we were able to successfully find Articles, send them back to the client
        .then(function (dbArticle) {
            console.log(dbArticle);
            // res.json(dbArticle);
            res.render("index", {
                articles: dbArticle,
                test: "This is BS",
                title: "Mongo DB Scraper"
            });
        })
        // .then(dbArticle => res.json(dbArticle))
        .catch(err => res.json(err));
});

app.get("/scrape", function (req, res) {
    // First, we grab the body of the html with axios
    axios.get("https://www.aljazeera.com/news/").then(function (response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);

        // Now, we grab every h2 within an article tag, and do the following:
        $("div .topics-sec-item-cont").each(function (i, element) {
            // Save an empty result object
            var result = {};
            result.title = $(element).find(".topics-sec-item-head").text();
            result.summary = $(element).find(".topics-sec-item-p").text();
            result.link = "https://www.aljazeera.com" + $(element).find(".topics-sec-item-label").next().attr('href')
            result.image = "https://www.aljazeera.com" + $(element).next().find('a').next().find('img').attr('data-src');

            console.log(result.title);
            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function (dbArticle) {
                    // View the added result in the console
                    console.log(dbArticle);
                })
                .catch(function (err) {
                    // If an error occurred, log it
                    console.log(err);
                });
        });
        res.send("Scrape Complete");
        // Send a message to the client
    });
});

// Route for getting all Articles from the db
app.get("/articles", (req, res) => {
    // Grab every document in the Articles collection
    db.Article.find({})
        // If we were able to successfully find Articles, send them back to the client
        .then(function (dbArticle) {
            console.log(dbArticle);
            res.json(dbArticle);
        })
        // .then(dbArticle => res.json(dbArticle))
        .catch(err => res.json(err));
});

// Route for retrieving all Notes from the db
app.get("/notes", function (req, res) {
    // Find all Notes
    db.Note.find({})
        .then(function (dbNote) {
            // If all Notes are successfully found, send them back to the client
            res.json(dbNote);
        })
        .catch(function (err) {
            // If an error occurs, send the error back to the client
            res.json(err);
        });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({
            _id: req.params.id
        })
        // ..and populate all of the notes associated with it
        .populate("note")
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    console.log(req.body);
    db.Note.create(req.body)
        .then(function (dbNote) {
            // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            // return db.Article.findOneAndUpdate({_id: req.params.id}, {$push: {notes: dbNote._id}}, {new: true});
            return db.Article.findOneAndUpdate({
                _id: req.params.id
            }, {
                note: dbNote._id
            }, {
                new: true
            });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

app.delete("/articles/:id", function (req, res) {
    db.Article.deleteOne({
            _id: req.params.id
        }).then(function (data) {
            
            res.json(data);
        })
        .catch(function (err) {
            console.log(err)
        })
})


//route for saving articles 
app.post("/saved/:id", function (req, res) {
    console.log(req)
    db.Article.findOne({
      _id : req.params.id
    }).
    then(function(dbSaved) {
          console.log(dbSaved)

          var savedArticle = {}

          savedArticle.title = dbSaved.title,
          savedArticle.summary = dbSaved.summary,
          savedArticle.link = dbSaved.link,
          savedArticle.image = dbSaved.image
        
          db.Saved.create(savedArticle)
          .then(function(result) {
            console.log(result)
            console.log("\n-----article was added to saved collection-----\n");
            res.json(result);
          })
          .catch(function(err) {
            // If an error occurred, log it
            console.log(err);
          });
      })
  })

// route to delete saved article
  app.delete("/saved/:id", function (req, res) {
    db.Save.deleteOne({
      _id : req.params.id
    }).then(function(deleted){
      console.log("\n-----the following article has been deleted-----\n")
      // console.log(deleted)
      res.send("shit is gone")
      res.json(deleted)
      
    }).catch(function(err) {
      console.log(err)
    })
  })

//route for loading the saved data  
  app.get('/saved', function(req, res){
    db.Saved.find({}, function(err, data) {
      if(err) {
          console.log(err)
      } else {
          var SavedObject = {saved: data}
        //   res.render('index')
          res.render("saved", SavedObject)
      }
    })
  })

//============================ END ROUTES

// Start the server
app.listen(PORT, function () {
    console.log("App running on port http://localhost:" + PORT);
});