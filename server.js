const express = require('express');
const app = express();
const jsonfile = require('jsonfile');
const cookieParser = require('cookie-parser');
const shajs = require('sha.js');
const expressWs = require('express-ws')(app);
const randomstring = require("randomstring");
const nodemailer = require('nodemailer');

app.use(express.static("public"));
app.use(cookieParser());

app.enable('trust proxy');

app.use(function(request, response, next) {
  if (process.env.NODE_ENV != 'development' && !request.secure) {
    response.redirect("https://" + request.headers.host + request.url) 
  } 
  next();
});

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

app.get('/', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.sendFile(__dirname + "/views/index.html");
  
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  
  let user = jsonfile.readFileSync("users.json")[username];
  if(!user) return res.sendFile(__dirname + "/views/index.html");
  if(user.password !== password) return res.sendFile(__dirname + "/views/index.html");
  if(!user.verified) return res.sendFile(__dirname + "/views/index.html");
  
  res.redirect("/dashboard");
});

app.get('/sitemap', (req, res) => {
  res.sendFile(__dirname + "/views/sitemap.xml");
});

app.get('/dashboard', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json")[username];
  if(!user || user.password !== password) return res.redirect("/");
  if(!user.verified) return res.redirect("/");
  
  res.sendFile(__dirname + "/views/dashboard.html");
});

app.get('/fakeboard', (req, res) => {
  res.sendFile(__dirname + "/views/board.html");
});

app.get('/forbidden', (req, res) => {
  res.sendFile(__dirname + "/views/forbidden.html");
});

app.get('/not_found', (req, res) => {
  res.sendFile(__dirname + "/views/not_found.html");
});

app.get('/api/v1/createUser', (req, res) => {
  let username = req.query.username;
  let password = shajs('sha512').update(req.query.password).digest('hex');
  let firstName = req.query.fname;
  let email = req.query.email;
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let userDB = jsonfile.readFileSync("users.json");
  if(userDB[username]) return res.send("User already exists.");
  userDB[username] = {"password": password, "email": email, "firstName": firstName, "verified": false};
  jsonfile.writeFileSync("users.json", userDB);
  
  var mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: 'Confirm your PlanOver account.',
    html: 
`
<head>
<style>

button  {
  background-color: #4c60af;
  color: white;
  padding: 14px 20px;
  margin: 8px 0;
  border: none;
  cursor: pointer;
  width: 150px;
  text-align: center;
  outline: 0;
  overflow-wrap: anywhere;
  border-radius: 5px;
}
  
  button:hover {
  opacity: 0.8;
  outline: 0;
}
  
th, td {
  padding: 15px;
}

table {
  border-collapse: collapse;
  border: 1px solid black;
  padding: 10px;
  text-align: center;
}

</style>
</head>
<body>
<table>
<tr>
<td>
<header>
<h1>Account Verification</h1>
</header>
<br>
<p>Thank you for making an account on <a href="https://www.planover.glitch.me">www.planover.glitch.me</a></p>
<p>Please confirm your email below</p>
<br>
  <a href="https://planover.glitch.me/verify?u=${username}"><button>Confirm Email</button></a>
</td>
</tr>
</table>
</body>
`
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
  
  res.send("Please check your email!");
});

app.get('/api/v1/checkUser', (req, res) => {
  let username = req.query.username;
  let password = shajs('sha512').update(req.query.password).digest('hex');
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json")[username];
  if(!user) return res.send("User does not exist.");
  if(user.password !== password) return res.send("Incorrect password.");
  if(!user.verified) return res.send("Please verify your email.");
  
  res.send("true");
});

app.get('/api/v1/boards', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json")[username];
  if(!user || user.password !== password) return res.redirect("/");
  if(!user.verified) return res.redirect("/");
  
  if(!user["boards"]) return res.send("User has no boards.");
  
  res.send(user["boards"]);
});

app.get('/verify', (req, res) => {
  let username = req.query.u;
  let userDB = jsonfile.readFileSync("users.json");
  userDB[username].verified = true;
  jsonfile.writeFileSync("users.json", userDB);
  res.redirect("/");
});

app.get('/api/v1/joinedBoards', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json")[username];
  if(!user || user.password !== password) return res.redirect("/");
  if(!user.verified) return res.redirect("/");
  
  if(!user["joined"]) return res.send("User has no boards.");
  
  res.send(user["joined"]);
});

app.get('/api/v1/createBoard', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  let boardName = req.query.boardName;
  let boardCode = randomstring.generate(7);
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json");
  if(!user[username] || user[username].password !== password) return res.redirect("/");
  if(!user[username].verified) return res.redirect("/");
  
  if(!user[username]["boards"]) user[username]["boards"] = {};
  user[username]["boards"][boardCode] = JSON.parse(`{"boardName": "${boardName}", "users": {"${username}": {"allowed": true}}}`);
  jsonfile.writeFileSync("users.json", user);
  
  res.send(boardCode);
});

app.get('/api/v1/deleteBoard', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  let boardCode = req.query.boardCode;
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json");
  if(!user[username] || user[username].password !== password) return res.redirect("/");
  if(!user[username].verified) return res.redirect("/");
  delete user[username]["boards"][boardCode];
  jsonfile.writeFileSync("users.json", user);
});

app.get('/api/v1/updateBoard/addTask', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  let boardCode = req.query.boardCode;
  let task = req.query.task;
  let personInCharge = req.query.personInCharge;
  let taskId = req.query.taskId;
  let status = req.query.status;
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json");
  if(!user[username] || user[username].password !== password) return res.redirect("/");
  if(!user[username].verified) return res.redirect("/");
  if(!user[username]["boards"][boardCode]["tasks"]) user[username]["boards"][boardCode]["tasks"] = {};
  user[username]["boards"][boardCode]["tasks"][taskId] = {"task": task, "personInCharge": personInCharge, "status": status};
  jsonfile.writeFileSync("users.json", user);
  
  res.send("success!");
});

app.get('/api/v1/updateBoard/updateTask', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  let boardCode = req.query.boardCode;
  let taskId = req.query.taskId;
  let status = req.query.status;
  let u = req.query.username;
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json");
  if(!user[username] || user[username].password !== password) return res.redirect("/");
  if(!user.verified) return res.redirect("/");
  if(!user[u]["boards"][boardCode]["tasks"]) user[u]["boards"][boardCode]["tasks"] = {};
  if(!user[u]["boards"][boardCode]["tasks"][taskId]["status"]) user[u]["boards"][boardCode]["tasks"][taskId]["status"] = {};
  user[u]["boards"][boardCode]["tasks"][taskId]["status"] = status;
  jsonfile.writeFileSync("users.json", user);
  
  res.send("success!");
});

app.get('/api/v1/leaveBoard', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  let boardOwner = req.query.boardOwner;
  let boardCode = req.query.boardCode;
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json");
  if(!user[username] || user[username].password !== password) return res.redirect("/");
  if(!user[username].verified) return res.redirect("/");
  delete user[boardOwner]["boards"][boardCode]["users"][username];
  delete user[username]["joined"][boardCode];
  jsonfile.writeFileSync("users.json", user);
});

app.get('/api/v1/joinBoard', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  let boardCode = req.query.boardCode;
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json");
  if(!user[username] || user[username].password !== password) return res.redirect("/");
  if(!user[username].verified) return res.redirect("/");
  
  for(let u in user) {
    for(let i in user[u]["boards"]) {
      if(i == boardCode) {
        if(!user[u]["boards"][i]["users"]) user[u]["boards"][i]["users"] = {};
        if(!user[u]["boards"][i]["users"][username]) user[u]["boards"][i]["users"][username] = {};
        user[u]["boards"][i]["users"][username]["allowed"] = true;
        let boardName = user[u]["boards"][i]["boardName"];
        if(!user[username]["joined"]) user[username]["joined"] = {};
        user[username]["joined"][i] = {"boardName": boardName, "boardOwner": u}
        res.send(u);
        return jsonfile.writeFileSync("users.json", user);
      }
    }
  }
  
  res.send("Invalid");
});

app.ws('/api/v1/board/websocket/:username/:boardCode', function(ws, req) { 
  ws.on('message', function(msg) {
    let boardOwner = req.params.username;
    let boardCode = req.params.boardCode;
    let username = req.cookies.username;
    let password = shajs('sha512').update(req.cookies.p).digest('hex');
      
    if(!username) return ws.send("No username entered.");
    if(!password) return ws.send("No password entered.");
    let user = jsonfile.readFileSync("users.json");
    if(!user[username] || user[username].password !== password) return ws.send("No access allowed.");
    if(!user[username].verified) return ws.send("No access allowed.");
    
    if(!user[boardOwner]["boards"][boardCode]["users"]) user[boardOwner]["boards"][boardCode]["users"] = {};
    if(!user[boardOwner]["boards"][boardCode]["users"][username]) user[boardOwner]["boards"][boardCode]["users"][username] = {};
    user[boardOwner]["boards"][boardCode]["users"][username]["status"] = "online";
    
    jsonfile.writeFileSync("users.json", user);
    
    if(msg.startsWith("add task: ")) {
      let data = JSON.parse(msg.slice("add task: ".length));
      let task = data.task;
      let personInCharge = data.personInCharge;
      let taskId = data.taskId;
      let status = data.status;
        
      if(!username) return ws.send("No access allowed.");
      if(!password) return ws.send("No access allowed.");
      let userDB = jsonfile.readFileSync("users.json");
      if(!userDB[username] || userDB[username].password !== password) return ws.send("No access allowed.");
      if(!userDB[username].verified) return ws.send("No access allowed.");
      if(!userDB[username]["boards"][boardCode]) return ws.send("Not allowed to add task.");
      if(!userDB[username]["boards"][boardCode]["tasks"]) userDB[username]["boards"][boardCode]["tasks"] = {};
      if(userDB[username]["boards"][boardCode]["tasks"][taskId]) return ws.send("Task already exists");
      userDB[username]["boards"][boardCode]["tasks"][taskId] = {"task": task, "personInCharge": personInCharge, "status": status};
      jsonfile.writeFileSync("users.json", userDB);
    } else if(msg.startsWith("update task: ")) {
      let data = JSON.parse(msg.slice("update task: ".length));
      let taskId = data.taskId;
      let status = data.status;
      let u = data.username;
        
      if(!username) return ws.send("No access allowed.");
      if(!password) return ws.send("No access allowed.");
      let userDB = jsonfile.readFileSync("users.json");
      if(!userDB[username] || userDB[username].password !== password) return ws.send("No access allowed.");
      if(!userDB[username].verified) return ws.send("No access allowed.");
      if(!userDB[u]["boards"][boardCode]["tasks"]) userDB[u]["boards"][boardCode]["tasks"] = {};
      if(!userDB[u]["boards"][boardCode]["tasks"][taskId]["status"]) userDB[u]["boards"][boardCode]["tasks"][taskId]["status"] = {};
      userDB[u]["boards"][boardCode]["tasks"][taskId]["status"] = status;
      jsonfile.writeFileSync("users.json", userDB);
    } else if(msg.startsWith("get tasks: ")) {
      let data = JSON.parse(msg.slice("get tasks: ".length));
      let boardCode = data.boardCode;
      let u = data.username;
      
      if(!username) return ws.send("No access allowed.");
      if(!password) return ws.send("No access allowed.");
      let userDB = jsonfile.readFileSync("users.json");
      if(!userDB[username] || userDB[username].password !== password) return ws.send("No access allowed.");
      if(!userDB[username].verified) return ws.send("No access allowed.");
      
      ws.send("tasks: " + JSON.stringify(userDB[u]["boards"][boardCode]["tasks"]));
    } else if(msg.startsWith("get users: ")) {
      let data = JSON.parse(msg.slice("get users: ".length));
      let boardCode = data.boardCode;
      let u = data.username;
      
      if(!username) return ws.send("No access allowed.");
      if(!password) return ws.send("No access allowed.");
      let userDB = jsonfile.readFileSync("users.json");
      if(!userDB[username] || userDB[username].password !== password) return ws.send("No access allowed.");
      if(!userDB[username].verified) return ws.send("No access allowed.");
      
      ws.send("users: " + JSON.stringify(user[u]["boards"][boardCode]["users"]));
    }
  });
  
  ws.on('close', function() {
    let boardOwner = req.params.username;
    let boardCode = req.params.boardCode;
    let username = req.cookies.username;
    let password = shajs('sha512').update(req.cookies.p).digest('hex');
      
    if(!username) return ws.send("No username entered.");
    if(!password) return ws.send("No password entered.");
    let user = jsonfile.readFileSync("users.json");
    if(!user[username] || user[username].password !== password) return ws.send("No access allowed.");
    if(!user[username].verified) return ws.send("No access allowed.");
    
    if(!user[boardOwner]["boards"][boardCode]["users"]) user[boardOwner]["boards"][boardCode]["users"] = {};
    if(!user[boardOwner]["boards"][boardCode]["users"][username]) user[boardOwner]["boards"][boardCode]["users"][username] = {};
    user[boardOwner]["boards"][boardCode]["users"][username]["status"] = "offline";
    
    jsonfile.writeFileSync("users.json", user);
  });
});

app.get('/api/v1/board/getUsers', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json");
  if(!user[username] || user[username].password !== password) return res.redirect("/");
  if(!user[username].verified) return res.redirect("/");
  
  let boardUsername = req.query.username;
  let boardCode = req.query.boardCode;
  
  if(!user[boardUsername]) return res.sendFile(__dirname + "/views/not_found.html");
  if(!user[boardUsername]["boards"][boardCode]) return res.sendFile(__dirname + "/views/not_found.html");
  
  res.send(user[boardUsername]["boards"][boardCode]["users"]);
});

app.get('/api/v1/board/getBoardName', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json");
  if(!user[username] || user[username].password !== password) return res.redirect("/");
  if(!user[username].verified) return res.redirect("/");
  
  let boardUsername = req.query.username;
  let boardCode = req.query.boardCode;
  
  if(!user[boardUsername]) return res.sendFile(__dirname + "/views/not_found.html");
  if(!user[boardUsername]["boards"][boardCode]) return res.sendFile(__dirname + "/views/not_found.html");
  
  res.send(user[boardUsername]["boards"][boardCode]["boardName"]);
});

app.get('/api/v1/board/getBoardTasks', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json");
  if(!user[username] || user[username].password !== password) return res.redirect("/");
  if(!user[username].verified) return res.redirect("/");
  
  let boardUsername = req.query.username;
  let boardCode = req.query.boardCode;
  
  if(!user[boardUsername]) return res.sendFile(__dirname + "/views/not_found.html");
  if(!user[boardUsername]["boards"][boardCode]) return res.sendFile(__dirname + "/views/not_found.html");
    
  res.send(user[boardUsername]["boards"][boardCode]["tasks"]);
});

app.get('/board/:username/:boardCode', (req, res) => {
  if(!req.cookies.username && !req.cookies.p) return res.redirect("/");
  let username = req.cookies.username;
  let password = shajs('sha512').update(req.cookies.p).digest('hex');
  
  if(!username) return res.send("No username entered.");
  if(!password) return res.send("No password entered.");
  let user = jsonfile.readFileSync("users.json")
  if(!user[username] || user[username].password !== password) return res.redirect("/");
  if(!user[username].verified) return res.redirect("/");
  
  let boardUsername = req.params.username;
  let boardCode = req.params.boardCode;
    
  if(!user[boardUsername]) return res.sendFile(__dirname + "/views/not_found.html");
  if(!user[boardUsername]["boards"][boardCode]) return res.sendFile(__dirname + "/views/not_found.html");
  if(!user[boardUsername]["boards"][boardCode]["users"][username]) return res.sendFile(__dirname + "/views/forbidden.html");
  if(!user[boardUsername]["boards"][boardCode]["users"][username]["allowed"]) return res.sendFile(__dirname + "/views/forbidden.html");
  
  res.sendFile(__dirname + "/views/board.html");
});

app.get('*', function(req, res){
  res.status(404).sendFile(__dirname + "/views/not_found.html");
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});