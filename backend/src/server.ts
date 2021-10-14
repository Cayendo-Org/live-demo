const express = require('express');
const app = express();
const port = process.env.PORT || 1337;

app.use('/', express.static('../../frontend/build'));
app.listen(port, () => {
  console.log('server started at http://localhost:'+port);
});
