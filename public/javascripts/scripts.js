// create socket
var socket = io();

// define view period
var viewPeriod = '1m';

// load graph and buttons
loadView(viewPeriod);
    
/******
Display
******/
    
// tell server to gather info for views
function loadView(viewPeriod) {
    return socket.emit('gatherInfo', viewPeriod);
}

// display graph with server info
socket.on('displayGraph', function(info) {
    var data = { 
        labels: info.dates,
        series: info.prices
    };
    var options = {
        showPoint: true,
        low: 0,
        fullWidth: true,
        chartPadding: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
        },
        axisX: {
            showGrid: false,
        },
        axisY: {
            onlyInteger: true,
            labelInterpolationFnc: function(value) {
                return '$' + value;
            }
        },
        plugins: [
            Chartist.plugins.tooltip({
                currency: '$',
            })
        ]
    };
    return new Chartist.Line('.ct-chart', data, options);
});

// display button with server info
socket.on('displayButton', function(snapshot) {
    $('#stocks').append('<div class="well col-xs-12 col-sm-6 col-md-6 col-lg-6"><div class="pull-left"><h3>' + snapshot.symbol + '</h3><h4>' + snapshot.name + '</h4><p>Last Trade Date: ' + snapshot.lastTradeDate + '</p><p>Last Trade Price: $' + snapshot.lastTradePriceOnly + '</p></div><div class="pull-right"><button type="button" class="btn btn-link" title="Remove stock" id="' + snapshot.symbol + '" onclick="remove(' + "'" + snapshot.symbol + "'" + ')"><span class="glyphicon glyphicon-remove"></span></button></div></div>');
    return false;
});

// display buttons with server info
socket.on('displayButtons', function(snapshot) {
    $('#stocks').empty();
    for (var i = 0, l = snapshot.length; i < l; i++) {
        $('#stocks').append('<div class="well col-xs-12 col-sm-6 col-md-6 col-lg-6"><div class="pull-left"><h3>' + snapshot[i].symbol + '</h3><h4>' + snapshot[i].name + '</h4><p>Last Trade Date: ' + snapshot[i].lastTradeDate + '</p><p>Last Trade Price: $' + snapshot[i].lastTradePriceOnly + '</p></div><div class="pull-right"><button type="button" class="btn btn-link" title="Remove stock" id="' + snapshot[i].symbol + '" onclick="remove(' + "'" + snapshot[i].symbol + "'" + ')"><span class="glyphicon glyphicon-remove"></span></button></div></div>');
    }
    return false;
});

/********
Add stock
********/

// tell database to add stock
function addStock() {
    socket.emit('addStock', $('#addStock').val());
    $('#addStock').val('');
}

// if stock added to database, load view
socket.on('stockAdded', function() {
    return loadView(viewPeriod);
});

socket.on('stockDoesntExist', function() {
    $('.modal-body').html("<h2>Stock Doesn't Exist!</h2><p>Please enter a valid stock symbol.</p>");
    return $('.modal').modal();
});

socket.on('stockNotAdded', function() {
    $('.modal-body').html("<h2>Stock Already Displayed!</h2><p>Please enter a stock symbol that isn't already on the chart.</p>");
    return $('.modal').modal();
});

// if database is empty, add Google's stock
socket.on('emptyDatabase', function() {
    return socket.emit('addStock', 'AAPL');
});
    
/***********
Remove stock
***********/

// tell database to remove stock
function remove(stock) {
    return socket.emit('removeStock', stock);
}

// if stock removed from database, load view
socket.on('stockRemoved', function() {
    return loadView(viewPeriod);
});
    
/*****************
Change View Period
*****************/

function changeViewPeriod(newViewPeriod) {
    viewPeriod = newViewPeriod;
    return loadView(viewPeriod);
}