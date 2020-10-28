window.addEventListener('load', e => {
  if(document.location.protocol !== "https:") return document.location.href = "https://" + document.location.href.split("http://").join("");
  registerSW(); 
  if (window.matchMedia("(display-mode: standalone)").matches) {
    document.getElementById("installBtn").style.display = "none";
  } 
});

function sha512(str) {
  return crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(str)).then(buf => {
    return Array.prototype.map.call(new Uint8Array(buf), x=>(('00'+x.toString(16)).slice(-2))).join('');
  });
}

async function registerSW() { 
  if ('serviceWorker' in navigator) { 
    try {
      await navigator.serviceWorker.register('/sw.js'); 
    } catch (e) {
      alert('ServiceWorker registration failed. Sorry about that.'); 
    }
  } else {
    document.querySelector('.alert').removeAttribute('hidden'); 
  }
}

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

function installApp() {
  if(!deferredPrompt) return document.getElementById("installBtn").style.display = "none";
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
  });
}

async function signUp() {
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;
  let fname = document.getElementById("firstname").value;
  let email = document.getElementById("email").value;
  
  sha512(password).then(pass => {
    document.getElementById("button").innerHTML = "Please wait...";
    fetch("/api/v1/createUser?username=" + username + "&password=" + pass + "&fname=" + fname + "&email=" + email).then((response) => {
      response.text().then((text) => {
        if(text == "User already exists.") return document.getElementById("button").innerHTML = "That username is already taken!";
        document.getElementById("button").innerHTML = text;
        setCookie("username", username, 9999);
        setCookie("p", pass, 9999);
        //document.location = "/dashboard";
      })
    })
  });
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

async function signIn() {
  document.getElementById("signIn").innerHTML = "Please wait...";
  let username = document.getElementById("usernameLogin").value;
  let password = document.getElementById("passwordLogin").value;
  setCookie("username", username, 9999);
  sha512(password).then(pass => {
    setCookie("p", pass, 9999);
    checkLogin();
  });
}

async function signOut() {
  setCookie("username", "", 0);
  setCookie("p", "", 0);
  document.location = "/";
}

async function checkLogin() {
  let username = getCookie("username");
  let password = getCookie("p");
  
  fetch("/api/v1/checkUser?username=" + username + "&password=" + password).then((response) => {
    response.text().then((text) => {
      let correct = (text === 'true');
      if(correct) {
        document.location = "/dashboard"
      } else {
        if(document.getElementById("signIn")) {
          document.getElementById("signIn").innerHTML = text;
          setTimeout(() => {
            document.getElementById("signIn").innerHTML = "Sign In";
          }, 2000);
        }
      }
    })
  })
}

function openNav() {
  if(document.body.clientWidth < 768) {
    document.getElementById("mySidenav").style.width = "50%";
  } else {
    document.getElementById("mySidenav").style.width = "20%";
  }
  document.getElementById("main").style.marginLeft = "250px";
  document.getElementById("open-btn").style.display = "none";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.getElementById("main").style.marginLeft= "0";
  document.getElementById("open-btn").style.display = "block";
}

async function dashboardLoad() {  
  fetch("/api/v1/boards").then((response) => {
    response.text().then((text) => {
      if(text == "User has no boards.") document.getElementById("boardsCard").innerHTML = "<button onclick=\"\document.getElementById('id01').style.display='block'\"\>Create Board</button>"
      let parsed = JSON.parse(text);
      Object.keys(parsed).forEach(board => {
        document.getElementById("boardsCard").innerHTML += `<button onclick="location.href='/board/${getCookie("username")}/${board}'">${parsed[board].boardName}<a href="/dashboard" onclick="deleteBoard('${board}')"><img class="delete" src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/OOjs_UI_icon_trash-destructive.svg/1200px-OOjs_UI_icon_trash-destructive.svg.png"></a></button><br>`;
      })
      document.getElementById("boardsCard").innerHTML += "<br><button onclick=\"\document.getElementById('id01').style.display='block'\"\>Create Board</button>"
    })
  })    
  
  fetch("/api/v1/joinedBoards").then((response) => {
    response.text().then((text) => {
      if(text == "User has no boards.") document.getElementById("joinedBoardsCard").innerHTML = "<button onclick=\"\document.getElementById('id02').style.display='block'\"\>Join Board</button>"
      let parsed = JSON.parse(text);
      Object.keys(parsed).forEach(board => {
        document.getElementById("joinedBoardsCard").innerHTML += `<button onclick="location.href='/board/${parsed[board].boardOwner}/${board}'">${parsed[board].boardName}<a href="/dashboard" onclick="leaveBoard('${parsed[board].boardOwner}', '${board}')"><img class="delete" src="https://icons-for-free.com/iconfiles/png/512/leave+logout+signout+icon-1320183183841309817.png"></a></button><br>`;
      })
      document.getElementById("joinedBoardsCard").innerHTML += "<br><button onclick=\"\document.getElementById('id02').style.display='block'\"\>Join Board</button>"
    })
  }) 
}

async function deleteBoard(boardCode) {
  if(confirm("Are you sure you want to delete this board? (" + boardCode + ")")) {
    fetch("/api/v1/deleteBoard?boardCode=" + boardCode).then((response) => {
      response.text().then((text) => {
        alert(text);
      })
    })
  }
}

async function leaveBoard(boardOwner, boardCode) {
  if(confirm("Are you sure you want to leave this board? (" + boardCode + ", owned by " + boardOwner + ")")) {
    fetch("/api/v1/leaveBoard?boardOwner=" + boardOwner + "&boardCode=" + boardCode).then((response) => {
      response.text().then((text) => {
        alert(text);
      })
    })
  }
}

let taskCount = 0;
let socket;
let data = {};
let oldData = data;
let users = {};
let oldUsers = users;
let readyToLoadTasks = true;

async function boardLoad() {
  let path = document.location.pathname.split("/");
  let cleanPath = [];
  path.forEach(p => {
    if(!p) return;
    cleanPath.push(p);
  });
  path = cleanPath;
  let username = decodeURI(path[1]);
  let boardCode = decodeURI(path[2]);
  
  if(username !== getCookie("username")) document.getElementById("create-new-btn").style.display = "none";
  
  document.getElementById("usernameCard").innerHTML = username;
  document.getElementById("boardCard").innerHTML = boardCode;
  
  fetch("/api/v1/board/getBoardName?username=" + username + "&boardCode=" + boardCode).then((response) => {
    response.text().then((text) => {
      document.title = "PlanOver · " + text;
    })
  })
  
  firstLoadTasks();
  
  socket = new WebSocket('wss://' + document.location.hostname + '/api/v1/board/websocket/' + username + '/' + boardCode);

  socket.addEventListener('open', function (event) {
    socket.send("get tasks: " + JSON.stringify({"username": username, "boardCode": boardCode}));
    socket.send("get users: " + JSON.stringify({username, boardCode}));
    
    socket.send("hello server");
  
    setInterval(() => {
      oldUsers = users;
      socket.send("get users: " + JSON.stringify({username, boardCode}));
      //updateUsers();
    }, 2000);
    
    setInterval(() => {
      oldData = data;
      socket.send("get tasks: " + JSON.stringify({"username": username, "boardCode": boardCode}));
      //loadTasks();
    }, 2000);
  });
  
  socket.onclose = function() {
    console.log("Fixing socket...");
    socket = new WebSocket('wss://' + document.location.hostname + '/api/v1/board/websocket/' + username + '/' + boardCode);
  };

  socket.addEventListener('message', function (event) {
    if(event.data == "No access allowed.") location.href = "/";
    if(event.data.startsWith("tasks: ")) {
      data = JSON.parse(event.data.slice("tasks: ".length));
      loadTasks();
    }
    
    if(event.data.startsWith("users: ")) {
      users = JSON.parse(event.data.slice("users: ".length));
      updateUsers();
    }
  });
}

function updateUsers(username, boardCode, socket) {
  if(oldUsers !== users) {
    document.getElementById("usersCard").innerText = "";
    document.getElementById("personInCharge").innerHTML = "";
    Object.keys(users).forEach(key => {
      if(users[key].status == "online") {
        document.getElementById("usersCard").innerHTML += key + "<br>";
      }
      document.getElementById("personInCharge").innerHTML += "<option value='" + key + "'>" + key + "</option>"
    });
  }
}

function newBoardNameInput() {
  document.getElementById("createBoardButton").innerText = "Create " + document.getElementById("newBoardName").value;
}

function createBoard() {
  let newBoardName = document.getElementById("newBoardName").value;
  
  fetch("/api/v1/createBoard?boardName=" + newBoardName).then((response) => {
    response.text().then((text) => {
      document.location = "/board/" + getCookie("username") + "/" + text;
    })
  })
}

function firstLoadTasks() {
  let path = document.location.pathname.split("/");
  let cleanPath = [];
  path.forEach(p => {
    if(!p) return;
    cleanPath.push(p);
  });
  path = cleanPath;
  let username = decodeURI(path[1]);
  let boardCode = decodeURI(path[2]);
  taskCount = document.getElementById("table").children.length;
  
  fetch("/api/v1/board/getBoardTasks?username=" + username + "&boardCode=" + boardCode).then((response) => {
    response.json().then((json) => {
      let taskKeys = Object.keys(json);
      document.getElementById("table").innerHTML = "";
      for(let i = 0; i < taskKeys.length; i++) {
        let task = taskKeys[i];
        taskCount = document.getElementById("table").children.length;
        addTable(json[task].task, json[task].personInCharge, taskCount);
        updateTask(json[task].status, taskCount);
      }
    })
  })
}

function loadTasks() {
  if(!readyToLoadTasks) return;
  let path = document.location.pathname.split("/");
  let cleanPath = [];
  path.forEach(p => {
    if(!p) return;
    cleanPath.push(p);
  });
  path = cleanPath;
  let username = decodeURI(path[1]);
  let boardCode = decodeURI(path[2]);
  taskCount = document.getElementById("table").children.length;
  
  // fetch("/api/v1/board/getBoardTasks?username=" + username + "&boardCode=" + boardCode).then((response) => {
    // response.json().then((json) => {
  if(oldData !== data) {
      let taskKeys = Object.keys(data);
      document.getElementById("table").innerHTML = "";
      for(let i = 0; i < taskKeys.length; i++) {
        let task = taskKeys[i];
        taskCount = document.getElementById("table").children.length;
        addTable(data[task].task, data[task].personInCharge, taskCount);
        updateTask(data[task].status, taskCount);
      }
  }
    // })
  // })
}

function boardCodeInput() {
  document.getElementById("joinBoard").innerText = "Join " + document.getElementById("boardCode").value;
}

function joinBoard() {
  let boardCode = document.getElementById("boardCode").value;
  
  document.getElementById("joinBoard").innerText = "Please wait...";
  
  fetch("/api/v1/joinBoard?boardCode=" + boardCode).then((response) => {
    response.text().then((text) => {
      if(text == "Invalid") return document.getElementById("joinBoard").innerText = "Invalid code.";
      document.location = "/board/" + text + "/" + boardCode;
    })
  })
}

function addTask() {
  let task = document.getElementById("task").value;
  let personInCharge = document.getElementById("personInCharge").value;

  taskCount = document.getElementById("table").children.length;
  
  addTable(task, personInCharge, taskCount);
  // fetch("/api/v1/updateBoard/addTask?boardCode=" + document.getElementById("boardCard").innerText + "&task=" + task + "&personInCharge=" + personInCharge + "&taskId=" + taskCount + "&status=" + status).then((response) => {
  //   response.text().then((text) => {
  //     console.log(text);
  //   })
  // })
  
  socket.send("add task: " + JSON.stringify({"task": task, "personInCharge": personInCharge, "taskId": taskCount, "status": "not-started"}));
  
  document.getElementById("id01").style.display = 'none';
  document.getElementById("task").value = "";
  document.getElementById("personInCharge").value = "";
}

function addTable(task, personInCharge, id) {
  let tbody = document.createElement("tbody");
  let tr = document.createElement("tr");
  let th = document.createElement("th");
  th.innerHTML = `<th>${task}</th>`;
  th.setAttribute("class", "personID")
  let th2 = document.createElement("th");
  th2.innerHTML = `<th>${personInCharge}</th>`
  th2.setAttribute("class", "personID")
  let th3 = document.createElement("th");
  th3.setAttribute("id", id);
  let successBtn = document.createElement("button");
  successBtn.setAttribute("class", "btn success");
  successBtn.setAttribute("onclick", "updateTaskWithRequest('finished', " + id + ")");
  successBtn.setAttribute("id", id + "-finished");
  successBtn.innerText = "Finished";
  let infoBtn = document.createElement("button");
  infoBtn.setAttribute("class", "btn info");
  infoBtn.setAttribute("onclick", "updateTaskWithRequest('working-on', " + id + ")");
  infoBtn.setAttribute("id", id + "-working-on");
  infoBtn.innerText = "Working on";
  let warningBtn = document.createElement("button");
  warningBtn.setAttribute("class", "btn warning");
  warningBtn.setAttribute("onclick", "updateTaskWithRequest('not-started', " + id + ")");
  warningBtn.setAttribute("id", id + "-not-started");
  warningBtn.innerText = "Not Started";
  // th3.innerHTML = `<button class="btn success">Finished</button>
  // <button class="btn info" onclick="updateTask('working-on', ${id})">Working on</button>
  // <button class="btn warning active" onclick="updateTask('not-started', ${id})">Not Started</button>`
  th3.appendChild(successBtn);
  th3.appendChild(infoBtn);
  th3.appendChild(warningBtn);
  tr.appendChild(th);
  tr.appendChild(th2);
  tr.appendChild(th3);
  tbody.appendChild(tr);
  document.getElementById("table").appendChild(tbody);
}

function updateTaskWithRequest(status, id) {
  readyToLoadTasks = false;
  let path = document.location.pathname.split("/");
  let cleanPath = [];
  path.forEach(p => {
    if(!p) return;
    cleanPath.push(p);
  });
  path = cleanPath;
  let username = decodeURI(path[1]);
  socket.send("update task: " + JSON.stringify({"taskId": id, "status": status, "username": username}));
  
  document.getElementById(id).childNodes.forEach(child => {
    child.classList.remove("active");
  });
  document.getElementById(id + "-" + status).classList.add("class", "active");
  // fetch("/api/v1/updateBoard/updateTask?boardCode=" + document.getElementById("boardCard").innerText + "&taskId=" + id + "&status=" + status + "&username=" + username).then((response) => {
  //   response.text().then((text) => {
  //   })
  // })
  setTimeout(() => {
    readyToLoadTasks = true;
  }, 500);
}

function updateTask(status, id) {
  for(let i = 0; i < document.getElementById(id.toString()).children.length; i++) {
    let child = document.getElementById(id.toString()).children.item(i.toString());
    child.classList.remove("active");
  };
  document.getElementById(id + "-" + status).classList.add("active");
}

function copyCode() {
  navigator.clipboard.writeText(document.getElementById("boardCard").innerText);
  document.getElementById("copyCodeTooltip").innerText = "Copied!";
  setTimeout(() => {
    document.getElementById("copyCodeTooltip").innerText = "Copy Code";
  }, 3000);
}