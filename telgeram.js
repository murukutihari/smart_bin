const BOT = "8313925096:AAEcalLC27RZRfjcmpqGm37pmef3-eVqDCk";
const CHAT = "1003574947318";

function sendTelegram(msg){
  fetch(`https://api.telegram.org/bot${BOT}/sendMessage`,{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:CHAT,text:msg})
  });
}
