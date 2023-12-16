import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({ 
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "7838",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 8;
var error = null;

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries WHERE user_id =$1", 
    [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  }); 
  return countries;
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const users = await db.query("SELECT * FROM users");
  const color = await db.query(
    "SELECT color FROM users WHERE id =$1", 
    [currentUserId]);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users.rows,
    color: color.rows[0].color,
    error: error
  });
  error = null;
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  try 
  {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    const data = result.rows[0];
    const countryCode = data.country_code;
    try 
    {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id, id) VALUES ($1, $2, $3)",
        [countryCode, currentUserId, countryCode + currentUserId]
      );
      res.redirect("/");
    } 
    catch (err) 
    {
      console.log(err);
      error = "Country already marked!";
      res.redirect("/");
    }
  } 
  catch (err) 
  {
    console.log(err);
    error = "Country does not exist!";
    res.redirect("/");
  }
});

app.post("/user", async (req, res) => {
  const userId = req.body.user;
  const add = req.body.add;
  if (userId)
  {
    currentUserId = userId;
    res.redirect("/");
  }
  if (add === "new")
  {
    res.render("new.ejs");
  } 
});

app.post("/new", async (req, res) => {
  const userName = req.body.name;
  const userColor = req.body.color;
  if (userName && userColor)
  {
    const result = await db.query(
      "INSERT INTO users (user_name, color) VALUES ($1, $2) RETURNING id", 
      [userName, userColor]);
    currentUserId = result.rows[0].id;
  }
  error = "provide username and color.";
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
