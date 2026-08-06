/* SmtpJS.com - v3.0.0 (Local Bundle) */
var Email = {
  send: function (a) {
    return new Promise(function (b, c) {
      a.nocache = (new Date).getTime();
      var d = JSON.stringify(a);
      Email.ajaxPost("https://smtpjs.com/v3/smtpjs.aspx", d, function (e) { b(e) })
    })
  },
  ajaxPost: function (a, b, c) {
    var d = Email.createCORSRequest("POST", a);
    if (!d) {
      return c("Erro: Não foi possível criar requisição CORS no navegador.");
    }
    d.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    d.onload = function () {
      var a = d.responseText;
      null != c && c(a)
    };
    d.onerror = function() {
      null != c && c("ERR_CONNECTION_RESET: Conexão bloqueada com o servidor de envio.");
    };
    d.send(b)
  },
  ajax: function (a, b) {
    var c = Email.createCORSRequest("GET", a);
    c.onload = function () {
      var a = c.responseText;
      null != b && b(a)
    };
    c.send()
  },
  createCORSRequest: function (a, b) {
    var c = new XMLHttpRequest;
    return "withCredentials" in c ? c.open(a, b, !0) : "undefined" != typeof XDomainRequest ? (c = new XDomainRequest, c.open(a, b)) : c = null, c
  }
};
if (typeof window !== 'undefined') {
  window.Email = Email;
}
