var mongoose = require('mongoose');

// venue 
var stockSchema = new mongoose.Schema({
    symbol: String,
});

// save venue as model
var stockModel = mongoose.model('venue', stockSchema);

// export venue
module.exports = {
    stockModel: stockModel
};