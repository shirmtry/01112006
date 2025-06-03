
const express = require('express');
const app = express();
const path = require('path');
app.use(express.json());
app.use(express.static(__dirname));

app.use('/api/user', require('./api/user'));
app.use('/api/request', require('./api/request'));
app.use('/api/bet', require('./api/bet'));

app.get('/', (req,res)=>res.sendFile(path.join(__dirname, 'index.html')));
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server running', PORT));
