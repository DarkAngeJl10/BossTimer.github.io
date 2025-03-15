const reconnectInterval = 100; // Время ожидания перед повторным подключением (5 секунд)
const apidomain = "https://pw-boss-timer.koyeb.app/api";
const wsdomain = "wss://your-koyeb-url.com/websocket";
let socket;

document.addEventListener('DOMContentLoaded', function () {
    // Функция для добавления обработчиков
    function addIconEventListeners() {
      const icons = document.querySelectorAll('.info-icon');
  
      icons.forEach(function (icon) {
        // Обработчик для наведения
        icon.addEventListener('mouseenter', function () {
          const infoMenu = icon.querySelector('.info-menu');
  
          // Получаем координаты меню и контейнера
          const rect = infoMenu.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const container = icon.closest('td'); // Столбец в таблице
          const containerRect = container.getBoundingClientRect();
  
          // Проверка, не выходит ли меню за пределы контейнера по правому краю
          if (rect.left + rect.width > containerRect.right) {
            const overflow = (rect.left + rect.width) - containerRect.right;
            infoMenu.style.left = `-${overflow + 10}px`; // Сдвигаем меню влево
          }
  
          // Проверка, не выходит ли меню за пределы контейнера по нижнему краю
          if (rect.bottom > containerRect.bottom) {
            const overflow = rect.bottom - containerRect.bottom;
            infoMenu.style.top = `-${overflow + 10}px`; // Сдвигаем меню вверх
          }
  
          // Показываем меню
          infoMenu.classList.add('visible');
        });
  
        // Обработчик для убирания меню при уходе с иконки
        icon.addEventListener('mouseleave', function () {
          const infoMenu = icon.querySelector('.info-menu');
          infoMenu.classList.remove('visible');
        });
      });
    }
  
    // Используем MutationObserver для отслеживания добавления новых элементов
    const observer = new MutationObserver(function (mutationsList) {
      mutationsList.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          addIconEventListeners();  // Добавляем обработчики после добавления элементов
        }
      });
    });
  
    // Убедимся, что контейнер для наблюдения существует
    const targetNode = document.querySelector('.right-column'); // Например, для правой колонки
    if (targetNode) {
      const config = { childList: true, subtree: true };
  
      // Запускаем наблюдатель
      observer.observe(targetNode, config);
    } else {
      console.error('Контейнер для наблюдения не найден!');
    }
  
    // Добавляем обработчики для всех иконок при загрузке страницы
    addIconEventListeners();
  });
  
  

// Проверка на наличие сессионного токена
document.addEventListener("DOMContentLoaded", async () => {
    let response = await fetch(`${apidomain}/check_session.php`, {
        method: "GET",  // или POST, в зависимости от запроса
        credentials: "include"  // Для отправки cookies с запросом
    });
    
    let result = await response.json();

    if (!result.success) {
        window.location.href = "index.html"; // Перенаправление на страницу логина
    } else {
        window.username = result.username
        document.getElementById("username").innerText = result.username;
    }
});

function logout() {
    fetch(`${apidomain}/logout.php`, {
        method: "GET", // или POST, если требуется
        credentials: "include", // Отправляем куки для завершения сессии
    }).then(() => {
        window.location.href = "index.html"; // Перенаправляем на страницу логина
    }).catch(error => {
        console.error("Ошибка при выходе:", error);
    });
}


function connectWebSocket() {
    //socket = new WebSocket('wss://pw-boss-timer.koyeb.app/');
    socket = new WebSocket(`${wsdomain}`);

    socket.addEventListener('open', () => {
        //console.log('WebSocket открыт');
        const localTime = new Date().toISOString();
        socket.send(JSON.stringify({
            action: 'getBosses',
            username: window.username,
            localTime: localTime,
        }));
    });

    socket.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.status === 'connected') {
                console.log('WebSocket подключен');
            }
            if (data.type === 'bosses') {
                //console.log('Данные о боссах:', data.bosses);
                bosses = data.bosses;
                loadBosses(data.bosses);
            }
        } catch (error) {
            console.error('Ошибка обработки данных:', error);
        }
    });

    socket.addEventListener('close', (event) => {
        console.log(`Соединение закрыто (код ${event.code}). Переподключение через ${reconnectInterval / 1000} секунд...`);
        setTimeout(connectWebSocket, reconnectInterval);
    });

    socket.addEventListener('error', (event) => {
        console.error('WebSocket ошибка:', event);
        socket.close(); // Принудительно закрываем, чтобы сработало `onclose` и начался процесс переподключения
    });
}

// Функция для добавления босса через WebSocket
function addBoss() {
    const bossName = prompt("Введите имя босса:");
    const bossShift = prompt("Введите время сдвига в минутах:");

    if (!bossName || isNaN(bossShift)) {
        alert("Пожалуйста, заполните все поля.");
        return;
    }

    const currentTime = new Date();
    const firstShiftTime = new Date(currentTime.getTime() + bossShift * 60000);
    const secondShiftTime = new Date(firstShiftTime.getTime() + bossShift * 60000);

    // Формируем время в формате ISO 8601
    const timeString1 = firstShiftTime.toISOString();
    const timeString2 = secondShiftTime.toISOString();

    const localTime = new Date().toISOString();

    socket.send(JSON.stringify({
        action: 'add',
        username: window.username,
        name: bossName,
        time1: timeString1,
        time2: timeString2,
        shift: bossShift,
        localTime: localTime,
    }));
}

// Функция для удаления босса через WebSocket
function deleteBoss() {
    const deletebossName = prompt("Введите имя босса для удаления из таблицы:");

    if (!deletebossName) {
        alert("Пожалуйста, заполните все поля.");
        return;
    }

    const localTime = new Date().toISOString();

    socket.send(JSON.stringify({
        action: 'delete',
        username: window.username,
        name: deletebossName,
        localTime: localTime,
    }));
}

// Функция для обнуления времени босса через WebSocket
function resetTime(bossName) {
    const localTime = new Date().toISOString();
    socket.send(JSON.stringify({
        action: 'resetTime',
        username: window.username,
        name: bossName,
        localTime: localTime,
    }));
}

// bosses.sort((a, b) => a.shift - b.shift); // Сортировка по числовому значению shift (по возрастанию)

function loadBosses(bosses) {
    const tableBody = document.querySelector('#bossTable tbody');
    if (!tableBody) {
        console.error('Тело таблицы не найдено!');
        return;
    }
    tableBody.innerHTML = ''; // Очищаем таблицу перед добавлением новых данных

    if (bosses && bosses.length > 0) {
        // Сортируем боссов по ключу shift (по возрастанию)
        bosses.sort((a, b) => a.shift - b.shift);

        bosses.forEach(boss => {
            const row = document.createElement('tr');
            
            // Функция для отображения времени в локальном формате
            const formatTimeFromISO = (isoString) => {
                if (!isoString) return '--:--:--';  // Если строка не задана, возвращаем "недоступно"
                const date = new Date(isoString);
            
                // Проверяем, является ли date валидной датой
                if (isNaN(date.getTime())) return '--:--:--';  // Если дата невалидна, возвращаем "недоступно"
            
                return date.toLocaleTimeString('ru-RU', { hour12: false });
            };

            // Получаем последние действия для отображения в выпадающем меню
            const lastActions = boss.actions && boss.actions.length > 0 ? boss.actions : null;

            // Функция для форматирования типа действия
            function getActionType(action) {
                switch (action) {
                case 'add':
                    return 'Добавил босса';
                case 'delete':
                    return 'Удалил босса';
                case 'update':
                    return 'Обновил время';
                case 'resetTime':
                    return 'Удалил время';
                default:
                    return action;
                }
            }

            // Создание выпадающего меню с историей действий
            const actionHistory = lastActions ? lastActions.map(action => `
                <p><strong>${action.username}</strong>: ${getActionType(action.action)} -- ${formatDateAndTime(action.timestamp)}</p>
            `).join('') : '<p>Нет данных</p>';

            row.innerHTML = `
                <td>${boss.name}</td>
                <td class="table_time">${formatTimeFromISO(boss.time1)}</td>
                <td>${formatTimeFromISO(boss.time2)}</td>
                <td><button onclick="updateBossTime('${boss.name}', '${boss.shift}')">Обновить</button></td>
                <td><button onclick="resetTime('${boss.name}')">Удалить время</button></td>
                <td>
                    <div class="info-icon">
                        <i class="fas fa-info-circle"></i>
                        <div class="info-menu">
                            <p><strong>История изменений:</strong></p>
                            ${actionHistory}
                        </div>
                    </div>
                </td>
            `;
            tableBody.appendChild(row); // Добавляем строку в таблицу
        });
    } else {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = `<td colspan="5">Нет данных о боссах</td>`;
        tableBody.appendChild(noDataRow);
    }
}


// Функция для отправки обновленных данных босса на сервер через WebSocket
function updateBossInDB(updatedData) {
    // Отправляем данные через WebSocket сервер
    const localTime = new Date().toISOString();
    socket.send(JSON.stringify({
        action: 'updateBoss',
        username: window.username,
        data: updatedData,
        localTime: localTime,
    }));
}

function formatDateAndTime(isoString) {
    const date = new Date(isoString);
  
    const options = {
      month: 'long', // Месяц
      day: 'numeric', // Число месяца
      hour: '2-digit', // Час
      minute: '2-digit', // Минуты
      second: '2-digit', // Секунды
    };
  
    return date.toLocaleString('ru-RU', options); // Форматируем дату по русски
  }

const formatTimeFromISO = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ru-RU', { hour12: false });
};

let bosses = [];  // Инициализация глобальной переменной для хранения данных о боссах

// Функция для обновления времени босса с учётом сдвига
function updateBossTime(bossName, shift) {

    if (!Array.isArray(bosses) || bosses.length === 0) {
        console.error('Данные о боссах ещё не загружены!');
        return;
    }

    const bossData = bosses.find(boss => boss.name === bossName);
    if (!bossData) {
        console.error('Босс не найден в данных:', bossName);
        return;
    }

    // Получаем локальное время
    const localTime = new Date().toISOString();

    // Обновляем время с учётом сдвига
    //console.log('Обновление времени для босса:', bossName);
    const newTime1 = calculateShiftedTime(localTime, shift);
    const newTime2 = calculateShiftedTime(localTime, shift * 2);

    // Логируем обновлённые значения времени
    //console.log('Новое время 1:', newTime1);
    //console.log('Новое время 2:', newTime2);

    // Отправляем обновление на сервер
    const dataToSend = {
        action: 'update',
        username: window.username,
        name: bossName,
        time1: newTime1,
        time2: newTime2,
        shift: shift,
        localTime: localTime,
    };

    // Отправляем данные через WebSocket
    socket.send(JSON.stringify(dataToSend));
}

// Функция для применения сдвига времени
function calculateShiftedTime(time, shift) {
    if (!time || !shift) return time;  // Если времени или сдвига нет, возвращаем исходное время

    // Преобразуем время в объект Date (чтобы работать с локальной временной зоной)
    const localTime = new Date(time);  // Используем ISO строку для преобразования в Date объект

    // Применяем сдвиг
    localTime.setMinutes(localTime.getMinutes() + parseInt(shift)); 

    // Возвращаем время в формате ISO 8601
    return localTime.toISOString();
}

function updateNearestBosses(bosses) {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toTimeString().slice(0, 8);

    let allBossTimes = [];

    for (let boss of bosses) {
        let time1 = new Date(boss.time1);
        let time2 = new Date(boss.time2);

        // Добавляем только те боссы, время которых не прошло
        if (time1 > now) allBossTimes.push({ name: boss.name, time: time1 });
        if (time2 > now) allBossTimes.push({ name: boss.name, time: time2 });
    }

    // Сортируем по времени
    allBossTimes.sort((a, b) => a.time - b.time);

    // Заполняем ближайших 5 боссов
    for (let i = 0; i < 5; i++) {
        const boss = allBossTimes[i] || null;
        const bossElement = document.getElementById(`nextBoss${i + 1}`);
        
        if (boss) {
            bossElement.textContent = `${boss.name} - ${formatTimeFromISO(boss.time)}`;
            
            // Звуковое предупреждение для первого босса, если время до респауна меньше 2 минут
            const timeToRespawn = boss.time - now;
            playSoundAlert(timeToRespawn);  // Проверяем, нужно ли проиграть звук
        } else {
            bossElement.textContent = 'Нет ближайших боссов';
        }
    }
}

// Функция для преобразования времени в объект Date
function parseBossTime(time) {
    if (time === '--:--:--') return null; // Проверяем и возвращаем null, если время равно '--:--:--'
    const [hours, minutes, seconds] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null; // Проверяем на NaN
    const currentDate = new Date();
    currentDate.setHours(hours, minutes, seconds, 0);
    return currentDate;
}


// Функция форматирования времени
function formatTime(date) {
    return date.toTimeString().slice(0, 8);
}

// Преобразование времени в секунды
function getTimeInSeconds(timeStr) {
    const [hours, minutes, seconds] = timeStr.split(':').map(num => parseInt(num, 10));
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
    return Math.floor(date.getTime() / 1000);
}

// Обновление текущего времени
// Обновление текущего времени
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    const currentTime = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    currentTimeElement.textContent = currentTime;
}

function highlightNearestBosses() {
    const now = new Date();
    const tableBody = document.querySelector('#bossTable tbody');
    if (!tableBody || bosses.length === 0) return;

    // Сбрасываем подсветку у всех строк
    [...tableBody.rows].forEach(row => row.classList.remove('highlight', 'pastThreshold'));

    // Функция для преобразования времени в объект Date
    function parseBossTime(time) {
        if (!time || time === '--:--:--') return null;
        const date = new Date(time); // Используем Date для парсинга ISO строки
        return isNaN(date.getTime()) ? null : date; // Возвращаем дату, если она валидна
    }

    // Массив для хранения всех времен (первое и второе время каждого босса)
    let bossTimes = [];

    // Добавляем каждого босса с его временем
    bosses.forEach(boss => {
        const time1 = parseBossTime(boss.time1);
        if (time1) {
            bossTimes.push({ boss, time: time1, shift: 'first' });
        }
    });

    // Сортируем всех боссов по времени
    bossTimes.sort((a, b) => Math.abs(now - a.time) - Math.abs(now - b.time));

    // Сначала обрабатываем боссов, чье время уже прошло за порог
    bossTimes.forEach(item => {
        const row = [...tableBody.rows].find(row => row.cells[0]?.textContent.trim() === item.boss.name.trim());
        if (row) {
            const isPastThreshold = item.time < now; // Проверяем, прошло ли время за порог

            // Если время прошло, подсвечиваем в желтый, но не учитываем в ближайших
            if (isPastThreshold) {
                row.classList.add('pastThreshold');
            }
        }
    });

    // Получаем два ближайших времени, которые еще не прошли за порог
    const nearestTimes = bossTimes.filter(item => item.time >= now).slice(0, 2);

    // Подсвечиваем два ближайших времени
    nearestTimes.forEach(item => {
        const row = [...tableBody.rows].find(row => row.cells[0]?.textContent.trim() === item.boss.name.trim());
        if (row) {
            row.classList.add('highlight');
        }
    });
}


let soundPlayed = false;  // Переменная для отслеживания проигрыша звука

// Функция для воспроизведения звука при респауне
function playSoundAlert(timeToRespawn) {
    // Если до респауна меньше 2 минут и звук еще не был проигран
    if (timeToRespawn <= 2 * 60 * 1000 && timeToRespawn > 0 && !soundPlayed) {
        const audio = document.getElementById('alertSound');
        audio.play().catch((error) => console.log('Загрузка звукового оповещения прекращена ошибкой:', error));

        soundPlayed = true;  // Отмечаем, что звук проигран
    }

    // После респауна сбрасываем флаг для следующего предупреждения
    if (timeToRespawn <= 0) {
        soundPlayed = false;
    }
}

// Функция для изменения громкости
function adjustVolume() {
    const volumeControl = document.getElementById('volumeControl');
    const audio = document.getElementById('alertSound');
    const volumeLabel = document.getElementById('volumeLabel');

    // Устанавливаем громкость в аудио плеере
    audio.volume = volumeControl.value;
    volumeLabel.textContent = Math.round(volumeControl.value * 100) + '%';

    // Сохраняем громкость в localStorage
    localStorage.setItem('volume', volumeControl.value);
}

// Загружаем сохраненную громкость из localStorage
function loadVolume() {
    const savedVolume = localStorage.getItem('volume');
    if (savedVolume !== null) {
        // Если громкость сохранена, устанавливаем ее
        const volumeControl = document.getElementById('volumeControl');
        volumeControl.value = savedVolume;
        adjustVolume(); // Применяем сохраненную громкость
    }
}

// Пример расчета времени до респавна и вызова функции
function checkBossTimes() {
    const now = new Date();
    const allBossTimes = [];

    // Проверяем время для каждого босса
    bosses.forEach(boss => {
        let time1 = parseBossTime(boss.time1);
        let time2 = parseBossTime(boss.time2);

        if (time1 && time1 > now) allBossTimes.push({ name: boss.name, time: time1 });
        if (time2 && time2 > now) allBossTimes.push({ name: boss.name, time: time2 });
    });

    // Сортируем боссов по времени респавна
    allBossTimes.sort((a, b) => a.time - b.time);

    const nextBoss = allBossTimes[0] || null;

    // Если есть ближайший босс и время до респауна менее 2 минут
    if (nextBoss) {
        const timeToRespawn = nextBoss.time - now;
        playSoundAlert(timeToRespawn);  // Проверяем, нужно ли проиграть звук
    }

}

// Загружаем громкость при загрузке страницы
window.onload = loadVolume;

// Добавляем слушатель для изменения громкости
document.getElementById('volumeControl').addEventListener('input', adjustVolume);

// Интервал для обновления времени и проверки ближайших боссов
setInterval(() => {
    updateCurrentTime();  // Обновляем таблицу
    highlightNearestBosses();  // Подсвечиваем ближайших 2-х боссов
    checkBossTimes();
}, 1000);

// Интервал для обновления ближайших боссов
setInterval(() => updateNearestBosses(bosses), 1000); // Запускаем обновление каждую секунду

connectWebSocket();
