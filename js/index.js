document.addEventListener("DOMContentLoaded", async () => {
    try {
        let response = await fetch(`${window.apidomain}/csrf_token.php`, {
        //let response = await fetch("/../backend/api/csrf_token.php", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include" // Обязательно для передачи сессии
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        let result = await response.json();
        document.getElementById("csrf_token").value = result.csrf_token;
    } catch (error) {
        console.error("Fetch error:", error);
    }
});

// Функция для получения или генерации deviceID
function getDeviceID() {
    if (!localStorage.getItem("deviceID")) {
        localStorage.setItem("deviceID", crypto.randomUUID());
    }
    return localStorage.getItem("deviceID");
}

document.querySelector("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    let formData = new FormData(e.target);
    formData.append("deviceID", getDeviceID()); // Добавляем deviceID в запрос

    let response = await fetch(`${window.apidomain}/auth.php`, {
    //let response = await fetch("/../backend/api/auth.php", {
        method: "POST",
        body: formData,
        credentials: "include" // Для передачи cookies и сессий
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    let result = await response.json();
    
    if (result.success) {
        window.location.href = "dashboard.html"; // После входа перекидывает на защищенную страницу
    } else {
        document.getElementById("error-message").innerText = result.error;
    }
});