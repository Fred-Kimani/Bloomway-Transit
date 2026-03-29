const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Bloomway Transit site running at http://localhost:' + PORT);
});
