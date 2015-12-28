var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');


var app = express();
app.set('port', (process.env.PORT || 5000));



app.use(express.static(__dirname + '/public'));
app.use(require('browser-logger')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//app.use(clientListener());

app.get('/', function (req, res) {
    res.sendFile('public/index.html');
});


app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});



