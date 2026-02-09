const baseUrl = location.origin; // Render domain
document.getElementById("baseUrl").textContent = baseUrl;

let userToken = localStorage.getItem("abdb_user_token") || "";
let apiKey = localStorage.getItem("abdb_project_key") || "";

const userTokenEl = document.getElementById("userToken");
const apiKeyEl = document.getElementById("apiKey");
const out = document.getElementById("output");

function setOutput(obj) {
  out.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

function refreshUI() {
  userTokenEl.textContent = userToken || "-";
  apiKeyEl.textContent = apiKey || "-";
}
refreshUI();

async function post(url, body, auth) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { "Authorization": `Bearer ${auth}` } : {})
    },
    body: JSON.stringify(body || {})
  });
  return res.json();
}

async function patch(url, body, auth) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { "Authorization": `Bearer ${auth}` } : {})
    },
    body: JSON.stringify(body || {})
  });
  return res.json();
}

async function get(url, auth) {
  const res = await fetch(url, {
    headers: {
      ...(auth ? { "Authorization": `Bearer ${auth}` } : {})
    }
  });
  return res.json();
}

// Signup
document.getElementById("btnSignup").onclick = async () => {
  const username = document.getElementById("username").value.trim();
  const data = await post(`${baseUrl}/v1/auth/signup`, { username });
  if (data.token) {
    userToken = data.token;
    localStorage.setItem("abdb_user_token", userToken);
  }
  refreshUI();
  setOutput(data);
};

// Login
document.getElementById("btnLogin").onclick = async () => {
  const username = document.getElementById("username").value.trim();
  const data = await post(`${baseUrl}/v1/auth/login`, { username });
  if (data.token) {
    userToken = data.token;
    localStorage.setItem("abdb_user_token", userToken);
  }
  refreshUI();
  setOutput(data);
};

// Create project
document.getElementById("btnCreateProject").onclick = async () => {
  const name = document.getElementById("projectName").value.trim();
  const data = await post(`${baseUrl}/v1/projects/create`, { name }, userToken);
  if (data.apiKey) {
    apiKey = data.apiKey;
    localStorage.setItem("abdb_project_key", apiKey);
  }
  refreshUI();
  setOutput(data);
};

// Add doc
document.getElementById("btnAddDoc").onclick = async () => {
  try {
    const body = JSON.parse(document.getElementById("docJson").value);
    const data = await post(`${baseUrl}/v1/db/users`, body, apiKey);
    setOutput(data);
  } catch {
    setOutput("Invalid JSON");
  }
};

// Get docs
document.getElementById("btnGetDocs").onclick = async () => {
  const data = await get(`${baseUrl}/v1/db/users`, apiKey);
  setOutput(data);
};
