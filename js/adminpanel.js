document.addEventListener("DOMContentLoaded", async () => {
    try {
        let response = await fetch(`${window.apidomain}/check_roles.php`, {
            method: "GET",
            credentials: "include"  // Для отправки cookies с запросом
        });

        let result = await response.json();

        if (!result.access) {
            window.location.href = "index.html";  // Перенаправление на страницу логина
        } else {
            window.username = result.username;
            document.getElementById("username").innerText = result.username;
            await loadRoles();
            await loadAccessKeys();
        }
    } catch (error) {
        console.error('Error checking roles:', error);
    }
});

function logout() {
    fetch(`${window.apidomain}/logout.php`, {
        method: "GET",
        credentials: "include",
    }).then(() => {
        window.location.href = "index.html";
    }).catch(error => {
        console.error("Ошибка при выходе:", error);
    });
}

function Back() {
    window.location.href = "dashboard.html";
}

// -------------------------------------------------------------------------------------
// --------------------------------- УПРАВЛЕНИЕ РОЛЯМИ ---------------------------------
// -------------------------------------------------------------------------------------

// Загружаем все доступные роли из БД
async function loadRoles() {
    try {
        const response = await fetch(`${window.apidomain}/get_roles.php`, {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        window.myRoles = data.my_roles; // Сохраняем глобально
        window.allUsers = data.users_with_lower_roles;
        displayAllRoles();
        displayAllUsers();
    } catch (error) {
        console.error("Error loading roles:", error);
    }
}

// Сохранение изменений
async function saveRoles() {
    let roles = {}; // объект для хранения ролей
    let rows = document.querySelectorAll("#rolesTable tbody tr"); // выбираем все строки таблицы

    // Получаем выбранного пользователя из select
    let targetUsername = document.getElementById("userSelect").value;

    // Проверяем, выбран ли пользователь
    if (targetUsername === "none") {
        alert("Пожалуйста, выберите пользователя.");
        return;
    }

    // Обратный объект для поиска ключа по переведенной строке
    const reverseTranslations = Object.keys(translations).reduce((acc, key) => {
        acc[translations[key]] = key; // ключ - это переведенная строка, значение - это ключ роли
        return acc;
    }, {});

    rows.forEach((row, index) => {
        let checkbox = row.querySelector("td input[type='checkbox']"); // получаем чекбокс в строке
        let role = row.querySelector("td:nth-child(2)").textContent.trim();
        let roleLevelSelect = row.querySelector("td select"); // выбираем select с ролью

        // Находим оригинальный ключ роли по переведенному названию
        let originalRole = reverseTranslations[role] || role; // Если не нашли, оставляем как есть

        // Если есть чекбокс
        if (checkbox) {
            let access = checkbox.checked ? 1 : 0; // Проверяем, отмечен ли чекбокс
            // Добавляем роль и доступ в объект roles
            roles[originalRole] = {
                access: access
            };
        }

        // Если есть select (role_level)
        if (roleLevelSelect) {
            let roleLevel = roleLevelSelect.value;

            if (!roleLevel) {
                console.warn(`Не выбран уровень для роли ${originalRole} в строке ${index + 1}`);
                return; // если значение роли не найдено, пропускаем эту строку
            }

            // Добавляем уровень к существующей роли
            roles[originalRole] = {
                access: roleLevel
            };
        }
    });

    try {
        const response = await fetch(`${window.apidomain}/update_roles.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initiator: window.username,
                username: targetUsername,
                roles: roles,
            })
        });

        const data = await response.json();
        if (data.status === 'success') {
            const saveButton = document.getElementById('saveButton');
            const deleteUser = document.getElementById('deleteUserSelect');
            const select = document.getElementById('rolesSelect');
            saveButton.disabled = true;
            deleteUser.disabled = true;
            select.disabled = true;
            loadRoles()
        } else {
            alert('У вас недостаточно прав для выполнения этой команды');
        }
    } catch (error) {
        console.error("Ошибка при обновлении прав:", error);
    }
}

// Функция для отображения всех пользователей в `select` элемент
function displayAllUsers() {
    const userSelect = document.getElementById('userSelect');

    // Очищаем все опции, чтобы затем добавить новые
    userSelect.innerHTML = '<option class="userOptions" value="none">Выберите пользователя</option>';

    // Перебираем пользователей с меньшими ролями из ответа и добавляем их в select
    window.allUsers.forEach(user => {
        const option = document.createElement('option');
        option.textContent = user.username;
        option.classList.add('userOptions');  // Добавляем класс для стилизации
        userSelect.appendChild(option);
    });
}

// Функция для отображения ролей с чекбоксами
function displayAllRoles() {
    const table = document.getElementById('rolesTable');
    const tbody = table.querySelector('tbody');

    // Очищаем tbody перед добавлением новых данных
    tbody.innerHTML = '';

    // Перебираем ключи объекта my_roles
    for (const role in window.myRoles) {
        if (window.myRoles.hasOwnProperty(role)) {  // Проверяем, что это собственное свойство
            const row = document.createElement('tr');

            // Создаем ячейку с названием роли
            const nameCell = document.createElement('td');
            const roleName = translations[role] || role; // Используем перевод, если есть, или роль как есть
            nameCell.textContent = roleName;  // Отображаем имя роли

            // Создаем ячейку для элемента управления (чекбокс или выпадающее меню)
            const controlCell = document.createElement('td');

            if (role === "role_level") {
                // Создаем выпадающее меню
                const select = document.createElement('select');
                select.id = 'rolesSelect'; // Устанавливаем ID
                select.classList.add('rolesSelect')
                select.disabled = true;

                const optionsroles = ["1", "2", "3", "4", "5", "6"];
                Object.entries(optionsroles).forEach(([key, label]) => {
                    const option = document.createElement('option');
                    const value = parseInt(key) + 1
                    const selectname = rolesSelect[label] || label
                    option.value = value;
                    option.textContent = selectname;
                    select.appendChild(option);
                });

                controlCell.appendChild(select);
            } else {
                // Создаем чекбокс для всех остальных ролей
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.dataset.role = role; // Сохраняем имя роли в data-атрибуте
                checkbox.disabled = true; // Пока пользователь не выбран, чекбокс неактивен
                controlCell.appendChild(checkbox);
            }

            row.appendChild(controlCell);
            row.appendChild(nameCell);

            // Добавляем строку в таблицу
            tbody.appendChild(row);

            // Если это строка с select, поднимите её на первое место
            if (role === "role_level") {
                tbody.insertBefore(row, tbody.firstChild);
            }
        }
    }
}

// Функция для отображения ролей выбранного пользователя
function displayUserRoles(username) {
    const rolesContainer = document.getElementById('allRolesContainer');
    const checkboxes = rolesContainer.querySelectorAll('input[type="checkbox"]');
    const selects = rolesContainer.querySelectorAll('select');

    // Получаем роли выбранного пользователя из ответа
    const userRoles = window.allUsers.find(user => user.username == username);

    if (userRoles) {
        // Для каждого чекбокса обновляем состояние в зависимости от прав пользователя
        checkboxes.forEach(checkbox => {
            const role = checkbox.dataset.role;
            checkbox.checked = userRoles.roles && userRoles.roles[role] === 1;  // Проверяем, есть ли роль у пользователя и активна ли она
        });

        // Обновляем значение select
        selects.forEach(select => {
            if (userRoles.roles && userRoles.roles['role_level']) {
                const userRoleLevel = parseInt(userRoles.roles['role_level'], window.myRoles['role_level']);

                // Удаляем недопустимые option (если их нельзя показывать)
                Array.from(select.options).forEach(option => {
                    const optionValue = parseInt(option.value);
                    if (optionValue >= window.myRoles['role_level']) {
                        option.hidden = true; // Скрываем недопустимые уровни
                    } else {
                        option.hidden = false;
                    }
                });

                // Устанавливаем текущее значение select
                select.value = userRoleLevel;
            }
        });
    }
}

async function deleteUserSelect() {
    const selectedUser = document.getElementById('userSelect').value;

    if (selectedUser === 'none') {
        alert("Не выбран пользователь для удаления!");
        return;
    }

    const confirmDelete = confirm(`Вы уверены, что хотите удалить пользователя: ${selectedUser}?`);

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(`${window.apidomain}/delete_userselect.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initiator: window.username,
                selectedUser: selectedUser
            })
        });

        const data = await response.json();
        if (data.status === 'success') {
            const saveButton = document.getElementById('saveButton');
            const deleteUser = document.getElementById('deleteUserSelect');
            const select = document.getElementById('rolesSelect');
            saveButton.disabled = true;
            deleteUser.disabled = true;
            select.disabled = true;
            loadRoles();
        } else {
            alert('У вас недостаточно прав для выполнения этой команды');
        }
    } catch (error) {
        console.error("Ошибка при удалении пользователя:", error);
    }
}

// Обновление состояния чекбоксов и кнопки в зависимости от выбранного пользователя
document.getElementById('userSelect').addEventListener('change', function () {
    const selectedUser = this.value;
    const checkboxes = document.querySelectorAll('#allRolesContainer input[type="checkbox"]');
    const saveButton = document.getElementById('saveButton');
    const deleteUser = document.getElementById('deleteUserSelect');
    const select = document.getElementById('rolesSelect');

    if (selectedUser !== 'none') {
        // Активируем чекбоксы и кнопку "Сохранить изменения"
        checkboxes.forEach(checkbox => {
            checkbox.disabled = false;
        });
        saveButton.disabled = false;
        deleteUser.disabled = false;
        select.disabled = false;
        // Обновляем состояния чекбоксов в зависимости от выбранного пользователя
        displayUserRoles(selectedUser);
    } else {
        // Деактивируем чекбоксы и кнопку "Сохранить изменения"
        checkboxes.forEach(checkbox => {
            checkbox.disabled = true;
            checkbox.checked = false;
        });
        saveButton.disabled = true;
        deleteUser.disabled = true;
        select.disabled = true;
    }
});

// --------------------------------------------------------------------------------------
// --------------------------------- УПРАВЛЕНИЕ КЛЮЧАМИ ---------------------------------
// --------------------------------------------------------------------------------------

// Загружаем все доступные роли из БД
async function loadAccessKeys() {
    try {
        const response = await fetch(`${window.apidomain}/get_accesskey.php`, {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();
        window.AccessKeys = data.AccessKeys; // Сохраняем глобально

        if (window.AccessKeys) {
            displayAllAccessKeys();
        }
    } catch (error) {
        console.error("Ошибка в загрузке ключей:", error);
    }
}

// Функция для отображения всех ключей в таблице
function displayAllAccessKeys() {
    const table = document.getElementById('AccessKeyTable');
    const tbody = table.querySelector('tbody');

    // Очищаем tbody перед добавлением новых данных
    tbody.innerHTML = '';

    window.AccessKeys.forEach((item) => {
        if (item.hasOwnProperty('key_value')) {  // Проверяем, что ключ существует
            const row = document.createElement('tr');

            // Создаем ячейку с названием роли
            const KeyCell = document.createElement('td');
            KeyCell.textContent = item.key_value;  // Отображаем имя роли
            KeyCell.onclick = function () { copyKeyToClipboard(this); }; // Назначаем обработчик клика
            KeyCell.classList.add('accessKey')

            // Создаем ячейку с чекбоксом
            const checkboxCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.key = item.key_value; // Сохраняем ключ в data-атрибуте
            checkboxCell.appendChild(checkbox);

            // Добавляем ячейки в строку
            row.appendChild(checkboxCell);
            row.appendChild(KeyCell);

            // Добавляем строку в таблицу
            tbody.appendChild(row);
        }
    });
}

// Сохранение изменений
async function deleteKeyAccess() {
    AccessKeys = [];
    let checkboxes = document.querySelectorAll("#AccessKeyTable tbody input[type='checkbox']:checked");

    checkboxes.forEach(checkbox => {
        AccessKeys.push({ key_value: checkbox.dataset.key });
    });

    if (AccessKeys.length === 0) {
        alert("Не выбран ключ для удаления!");
        return;
    }

    try {
        const response = await fetch(`${window.apidomain}/delete_accesskey.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initiator: window.username,
                AccessKeys: AccessKeys
            })
        });

        const data = await response.json();
        if (data.status === 'success') {
            loadAccessKeys();
        } else {
            alert('У вас недостаточно прав для выполнения этой команды');
        }
    } catch (error) {
        console.error("Error deleting keys:", error);
    }
}

// Сохранение изменений
async function createKeyAccess() {
    try {
        const response = await fetch(`${window.apidomain}/create_accesskey.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initiator: window.username,
            })
        });

        const data = await response.json();
        if (data.status === 'success') {
            loadAccessKeys();
        } else {
            alert('У вас недостаточно прав для выполнения этой команды');
        }
    } catch (error) {
        console.error("Error deleting keys:", error);
    }
}

function copyKeyToClipboard(cell) {
    let key = cell.textContent;

    navigator.clipboard.writeText(key).then(() => {
        cell.classList.add('hidden');

        setTimeout(() => {
            cell.textContent = 'Ключ скопирован в буфер обмена';
            cell.classList.remove('hidden');
        }, 150);

        setTimeout(() => {
            cell.classList.add('hidden');
            setTimeout(() => {
                cell.textContent = key;
                cell.classList.remove('hidden');
            }, 150);
        }, 3000);
    }).catch(err => console.error('Ошибка копирования:', err));
}

const checkboxesContainer = document.getElementById('accessKeys');
const deleteKeyButton = document.getElementById('deleteKeyButton');

deleteKeyButton.disabled = true; // Изначально кнопка отключена

checkboxesContainer.addEventListener('change', function () {
    const anyChecked = checkboxesContainer.querySelector('input[type="checkbox"]:checked');
    deleteKeyButton.disabled = !anyChecked;
});

// ------------------------------------------------------------------------------------
// --------------------------------- УПРАВЛЕНИЕ W.I.P ---------------------------------
// ------------------------------------------------------------------------------------

function openTab(evt, tabName) {
    // Скрываем все вкладки
    var tabcontents = document.getElementsByClassName("tabcontent");
    for (var i = 0; i < tabcontents.length; i++) {
        tabcontents[i].style.display = "none";
    }

    // Убираем активный класс с всех кнопок
    var tablinks = document.getElementsByClassName("tablink");
    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    // Показываем выбранную вкладку и добавляем активный класс
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");
}

// Открытие вкладки по умолчанию
document.querySelector(".tablink").click();