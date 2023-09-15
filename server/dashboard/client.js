const form = document.getElementById("configForm");
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData(form);
  const awsKmsKeyId = formData.get("awsKmsKeyId");
  const awsRegion = formData.get("awsRegion");
  const awsAccessSecretKey = formData.get("awsAccessSecretKey");
  const awsAccessKey = formData.get("awsAccessKey");

  fetch("/startServer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      awsAccessKey,
      awsAccessSecretKey,
      awsKmsKeyId,
      awsRegion,
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
