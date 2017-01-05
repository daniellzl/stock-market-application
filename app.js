/***********************
Stock Market Application
***********************/

var express = require('express');
var path = require('path');
var logger = require('morgan');
var handlebars = require('express-handlebars');
var yahooFinance = require('yahoo-finance');
var mongoose = require('mongoose');
var dateFormat = require('dateformat');
var model = require('./models/models');

// initialize app
var app = express();

// mongo database
var connectionString = process.env.MONGO_DB;
mongoose.connect(connectionString);
var db = mongoose.connection;
db.on('error', function(){
    console.log('There was an error connecting to the database');
});
db.once('open', function() {
    console.log('Successfully connected to database');
});

// create http reference to app
var http = require('http').Server(app);

// server that integrates with (or mounts on) the Node.JS HTTP Server: socket.io
// initialize new instance of socket.io by passing the http server object
var io = require('socket.io')(http);

// http request logger
app.use(logger("dev", { format: 'dev', immediate: true }));

// templating engine
var hbs = handlebars.create({
    defaultLayout: 'main'
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// bower directory
app.use('/bower_components', express.static(__dirname + '/bower_components'));

// public directory
app.use(express.static(__dirname + '/public'));

// home page
app.get('/', function(req,res) {
    return res.render('home/index');
});

// listen on connection event for incoming sockets
io.on('connection', function(socket){

/******
Display
******/

    // gather information
    socket.on('gatherInfo', function(view) {
        
        // query database for stocks
        model.stockModel.find({}, function(err, dbResults) {
            if (err) throw err;
            
            // if database is empty
            if (dbResults.length === 0) {
                return socket.emit('emptyDatabase');
            } 
            
            // extract stock symbols from database
            var symbols = [];
            for (var i = 0, l = dbResults.length; i < l; i++) {
                symbols.push(dbResults[i].symbol);
            }
            
            // query yahoo finance for stock info of the day
            yahooFinance.snapshot({
                symbols: symbols,
                fields: ['s', 'n', 'd1', 'l1']
            }, function (err, snapshot) {
                if (err) throw err;
                
                // replace timestamps with dates
                for (var i = 0, l = snapshot.length; i < l; i++) {
                    snapshot[i].lastTradeDate = dateFormat(snapshot[i].lastTradeDate, 'm/d/yy');
                }
                
                // tell client browser to display buttons
                socket.emit('displayButtons', snapshot);
            });
            
            // set date range to be queried
            var from = new Date();
            switch(view) {
                case '1w':
                    from.setDate(from.getDate() - 7);
                    break;
                case '1m':
                    from.setMonth(from.getMonth() - 1);
                    break;
                case '3m':
                    from.setMonth(from.getMonth() - 3);
                    break;
                case '6m':
                    from.setMonth(from.getMonth() - 6);
                    break;
                case '1y':
                    from.setFullYear(from.getFullYear() - 1);
                    break;
                case '3y':
                    from.setFullYear(from.getFullYear() -3);
                    break;
                default:
                    from.setDate(from.getDate() - 7);
            }
            
            // query Yahoo Finance for historical info
            yahooFinance.historical({
                symbols: symbols,
                from: from,
                to: new Date
            }, function (err, result) {
                if (err) throw err;
                
                // object to store return information
                var info = {
                    dates: [],
                    prices: []
                };
                
                // loop through results and save dates and prices to return object
                var bool = true;
                for (var key in result) {
                    
                    var object = {
                        name: key,
                        data: []
                    };
                    
                    // if more than 15 stock prices gathered
                    if (result[key].length >= 10) {
                        for (var i = 0, l = result[key].length; i < l; i += Math.floor(l/10)) {
                            object.data.push(parseFloat(result[key][i].open.toFixed(2)));
                            if (bool) {
                                var d = new Date(result[key][i].date);
                                info.dates.push(dateFormat(d, 'm/d/yy'));
                            }
                        }
                        
                        
                    // if less than 15 stock prices gathered
                    } else {
                        for (var i = 0, l = result[key].length; i < l; i ++) {
                            object.data.push(parseFloat(result[key][i].open.toFixed(2)));
                            if (bool) {
                                var d = new Date(result[key][i].date);
                                info.dates.push(dateFormat(d, 'm/d/yy'));
                            }
                        }
                    }
                    
                    // save to info object
                    info.prices.push(object);
                    bool = false;
                }
                
                // tell client browser to display graph
                return socket.emit('displayGraph', info);
            });
        });
    });

/********
Add Stock
********/
    
    // add stock
    socket.on('addStock', function(stock) {
        
        // capitalize stock symbol
        stock = stock.toUpperCase();
        
        // if empty notify
        if (stock === '') {
            return socket.emit('stockDoesntExist');
        }
        
        // check if stock name exists
        yahooFinance.snapshot({
            symbol: stock,
            fields: ['n'],
        }, function (err, snapshot) {
            if (err) throw err;
            
            // stock doesn't exist
            if (snapshot.name === null) {
                
                // alert only sender of error
                return socket.emit('stockDoesntExist');
                
            // stock exists
            } else {
                
                // check if stock is already in database
                model.stockModel.findOne({ symbol: stock }, function(err, dbResults) {
                    if (err) throw err;
                    
                    // if not found add to database
                    if (dbResults === null) {
                        
                        // save stock to database
                        var s = model.stockModel({
                            symbol: stock
                        });
                        s.save(function(err){
                            if (err) throw err;
                            
                            // broadcast to all users
                            return io.emit('stockAdded');
                        });
                        
                    } else {
                        
                        // alert sender stock already exists
                        return socket.emit('stockNotAdded');
                    }
                });
            }
        });
    });

/***********
Remove Stock
***********/
    
    // remove stock
    socket.on('removeStock', function(stock) {
        
        // capitalize stock symbol
        stock = stock.toUpperCase();
        
        // remove stock in database
        model.stockModel.findOneAndRemove({ symbol: stock }, function(err) {
		    if (err) throw err;
		    
		    // notify all users
		    return io.emit('stockRemoved');
		});
    });
    
});

// listen for connections
var port = process.env.PORT || 8080;
http.listen(port, function() {
    console.log('Listening on port ' + port);
});