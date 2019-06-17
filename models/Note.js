var mongoose = require('mongoose');

// Schema constructor
var Schema = mongoose.Schema;

// Creates a note schema object using the schema constructor
var NoteSchema = new Schema({
    title: String,

    body: String
})

// Creates a model for the above shema.
var Note = mongoose.model("Note", NoteSchema);

module.exports = Note;