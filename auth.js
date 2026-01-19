function login(){
  const u = document.getElementById("user").value;
  const p = document.getElementById("pass").value;

  if(u==="admin" && p==="1234"){
    localStorage.setItem("login","yes");
    window.location="dashboard.html";
  }else{
    document.getElementById("msg").innerText="Invalid Login";
  }
}
