const form = document.getElementById("configForm");
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData(form);
  const port = formData.get("port");
  const hostname = formData.get("hostname");

  fetch("/startServer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      port,
      hostname,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      alert("Server started: " + data.message);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});
