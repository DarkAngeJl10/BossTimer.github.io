// Устанавливаем WebSocket соединение
const socket = new WebSocket('wss://pw-boss-timer.koyeb.app/');
//const socket = new WebSocket('ws://localhost:8080');

// Открытие WebSocket соединения
socket.addEventListener('open', () => {
    console.log('WebSocket подключен');
    // Здесь можно запросить текущие данные сразу после подключения
});

socket.addEventListener('close', () => {
    console.log('WebSocket соединение закрыто');
    location.reload();
});

socket.addEventListener('error', (event) => {
    console.log('WebSocket error: ', event);
});

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    console.log('Получены данные от сервера:', data);
    if (data.type === 'bosses') {
        bosses = data.bosses;  // Сохраняем данные о боссах
        console.log('Данные о боссах:', bosses);  // Убедитесь, что данные приходят
    }
};

// Обработчик получения сообщений от сервера
socket.addEventListener('message', (event) => {
    let data;
    try {
        data = JSON.parse(event.data); // Преобразуем строку в объект
    } catch (e) {
        console.error('Ошибка парсинга данных', e);
        return;
    }

    if (data && data.type === 'bosses') {
        loadBosses(data.bosses); // Загружаем данные о боссах в таблицу
        updateNearestBosses(data.bosses); // Обновление ближайших боссов
    } else if (data && data.status === 'success') {
        console.log('Операция прошла успешно!');
    } else {
        console.error('Неизвестный тип данных:', data);
    }
});


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

    const timeString1 = firstShiftTime.toLocaleTimeString('ru-RU', { hour12: false });
    const timeString2 = secondShiftTime.toLocaleTimeString('ru-RU', { hour12: false });

    socket.send(JSON.stringify({
        action: 'add',
        name: bossName,
        time1: timeString1,
        time2: timeString2,
        shift: bossShift
    }));
}

// Функция для обновления времени босса через WebSocket
function updateTime(bossName) {
    socket.send(JSON.stringify({
        action: 'getShift',
        name: bossName
    }));
}

// Функция для удаления босса через WebSocket
function deleteBoss() {
    const deletebossName = prompt("Введите имя босса для удаления из таблицы:");

    if (!deletebossName) {
        alert("Пожалуйста, заполните все поля.");
        return;
    }

    socket.send(JSON.stringify({
        action: 'delete',
        name: deletebossName
    }));
}

// Функция для обнуления времени босса через WebSocket
function resetTime(bossName) {
    socket.send(JSON.stringify({
        action: 'resetTime',
        name: bossName
    }));
}

// Функция для загрузки всех боссов в таблицу
function loadBosses(bosses) {
    const tableBody = document.querySelector('#bossTable tbody');
    if (!tableBody) {
        console.error('Тело таблицы не найдено!');
        return;
    }
    tableBody.innerHTML = ''; // Очищаем таблицу перед добавлением новых данных

    if (bosses && bosses.length > 0) {
        bosses.forEach(boss => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${boss.name}</td>
                <td>${boss.time1}</td>
                <td>${boss.time2}</td>
                <td><button onclick="updateBossTime('${boss.name}', '${boss.shift}')">Обновить</button></td>
                <td><button onclick="resetTime('${boss.name}')">Удалить время</button></td>
            `;
            tableBody.appendChild(row); // Добавляем строку в таблицу
        });
    } else {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = `<td colspan="5">Нет данных о боссах</td>`;
        tableBody.appendChild(noDataRow);
    }
}

let bosses = [];  // Инициализация глобальной переменной для хранения данных о боссах

// Функция для обновления времени босса с учётом сдвига
function updateBossTime(bossName, shift) {
    if (bosses.length === 0) {
        console.error('Данные о боссах ещё не загружены!');
        return;
    }

    const bossData = bosses.find(boss => boss.name === bossName);
    if (!bossData) {
        console.error('Босс не найден в данных:', bossName);
        console.log('Все боссы:', bosses);
        return;
    }

    // Получаем локальное время
    const localTime = new Date().toTimeString().slice(0, 8);

    // Обновляем время с учётом сдвига
    console.log('Обновление времени для босса:', bossName);
    const newTime1 = calculateShiftedTime(localTime, shift);
    const newTime2 = calculateShiftedTime(localTime, shift * 2);

    // Логируем обновлённые значения времени
    console.log('Новое время 1:', newTime1);
    console.log('Новое время 2:', newTime2);

    // Отправляем обновление на сервер
    const dataToSend = {
        action: 'update',
        name: bossName,
        time1: newTime1,
        time2: newTime2,
        shift: shift
    };

    // Отправляем данные через WebSocket
    socket.send(JSON.stringify(dataToSend));
}

// Функция для применения сдвига времени
function calculateShiftedTime(time, shift) {
    if (!time || !shift) return time;  // Если времени или сдвига нет, возвращаем исходное время

    // Преобразуем время в объект Date (чтобы работать с локальной временной зоной)
    const [hours, minutes, seconds] = time.split(':');
    const localTime = new Date();
    localTime.setHours(hours, minutes, seconds, 0);  // Устанавливаем только время (без даты)

    // Применяем сдвиг
    localTime.setMinutes(localTime.getMinutes() + parseInt(shift)); 

    // Возвращаем время в формате HH:MM:SS
    const shiftedHours = String(localTime.getHours()).padStart(2, '0');
    const shiftedMinutes = String(localTime.getMinutes()).padStart(2, '0');
    const shiftedSeconds = String(localTime.getSeconds()).padStart(2, '0');

    return `${shiftedHours}:${shiftedMinutes}:${shiftedSeconds}`;
}

// Функция для обновления ближайших боссов
function updateNearestBosses(bosses) {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toTimeString().slice(0, 8);

    let allBossTimes = [];

    for (let boss of bosses) {
        let time1 = parseBossTime(boss.time1);
        let time2 = parseBossTime(boss.time2);

        if (time1 > now) allBossTimes.push({ name: boss.name, time: time1 });
        if (time2 > now) allBossTimes.push({ name: boss.name, time: time2 });
    }

    // Сортируем по ближайшему времени
    allBossTimes.sort((a, b) => a.time - b.time);

    // Убираем всех боссов, время которых уже прошло
    allBossTimes = allBossTimes.filter(boss => boss.time > now);

    const firstBoss = allBossTimes[0] || null;
    const secondBoss = allBossTimes[1] || null;

    document.getElementById('nextBoss1').textContent = firstBoss ? `${firstBoss.name} - ${formatTime(firstBoss.time)}` : 'Нет ближайших боссов';
    document.getElementById('nextBoss2').textContent = secondBoss ? `${secondBoss.name} - ${formatTime(secondBoss.time)}` : 'Нет второго босса';
}

// Функция парсинга времени (из строки в Date)
function parseBossTime(timeStr) {
    if (!timeStr) return null;
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const time = new Date();
    time.setHours(hours, minutes, seconds, 0);
    return time;
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
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    const currentTime = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    currentTimeElement.textContent = currentTime;
}

// Функция для подсветки ближайших 2-х боссов
function highlightNearestBosses() {
    const now = new Date();
    const tableBody = document.querySelector('#bossTable tbody');
    if (!tableBody || bosses.length === 0) return;

    // Сбрасываем подсветку у всех строк
    [...tableBody.rows].forEach(row => row.classList.remove('highlight'));

    // Функция для преобразования времени в объект Date
    function parseBossTime(time) {
        if (time === '--:--:--') return null;
        const [hours, minutes, seconds] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
        const currentDate = new Date();
        currentDate.setHours(hours, minutes, seconds, 0);
        return currentDate;
    }

    // Массив для хранения всех времен (первое и второе время каждого босса)
    let bossTimes = [];

    // Добавляем каждый босс с его временем
    bosses.forEach(boss => {
        const time1 = parseBossTime(boss.time1);

        // Добавляем босса, если у него есть хотя бы одно время
        if (time1) bossTimes.push({ boss, time: time1, shift: 'first' });
    });

    // Сортируем все времена по ближайшему к текущему времени
    bossTimes.sort((a, b) => Math.abs(now - a.time) - Math.abs(now - b.time));

    // Получаем два ближайших времени
    const nearestTimes = bossTimes.slice(0, 2);

    // Подсвечиваем два ближайших времени
    nearestTimes.forEach(item => {
        const row = [...tableBody.rows].find(row => row.cells[0]?.textContent === item.boss.name);
        if (row) {
            row.classList.add('highlight');
        }
    });
}

// Функция для воспроизведения звука за 2 минуты до респавна
// Функция для воспроизведения звука за 2 минуты до респавна
// Переменная для проверки, был ли уже проигран звук
let soundPlayed = false;

// Функция для воспроизведения звука за 2 минуты до респавна
function playSoundAlert(timeToRespawn) {
    const timeBeforeAlert = 2 * 60 * 1000; // 2 минуты в миллисекундах

    // Проверяем, если время до респавна меньше или равно 2 минутам и звук еще не был проигран
    if (timeToRespawn <= timeBeforeAlert && timeToRespawn > 0 && !soundPlayed) {
        const audio = document.getElementById('alertSound');
        audio.play();
        soundPlayed = true; // Устанавливаем флаг, чтобы предотвратить повторное воспроизведение звука
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

    // Если есть ближайший босс и время до респавна менее 2 минут
    if (nextBoss) {
        const timeToRespawn = nextBoss.time - now;
        playSoundAlert(timeToRespawn);  // Проверяем, нужно ли проиграть звук
    }
}

// Загружаем громкость при загрузке страницы
window.onload = loadVolume;

// Добавляем слушатель для изменения громкости
document.getElementById('volumeControl').addEventListener('input', adjustVolume);

setInterval(() => {
    updateCurrentTime();  // Обновляем таблицу
    highlightNearestBosses();  // Подсвечиваем ближайших 2-х боссов
    checkBossTimes();
}, 1000);

setInterval(() => updateNearestBosses(bosses), 1000); // Запускаем обновление каждую секунду
