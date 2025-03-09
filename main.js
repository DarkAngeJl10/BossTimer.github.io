// Устанавливаем WebSocket соединение
const socket = new WebSocket('https://pw-boss-timer.koyeb.app/');
//cconst socket = new WebSocket('ws://localhost:8080');

// Открытие WebSocket соединения
socket.addEventListener('open', () => {
    console.log('WebSocket открыт');
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

    // Если сервер прислал сообщение о статусе подключения
    if (data.status === 'connected') {
        console.log('WebSocket подключен');
        socket.send(JSON.stringify({ action: 'getBosses' }));
    }
    
    // Обрабатываем другие данные, если они есть
    if (data.type === 'bosses') {
        bosses = data.bosses;  // Сохраняем данные о боссах
        console.log('Данные о боссах:', bosses);  // Убедитесь, что данные приходят
        loadBosses(data.bosses);  // Загружаем данные в таблицу
    }
};

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

            row.innerHTML = `
                <td>${boss.name}</td>
                <td class="table_time">${formatTimeFromISO(boss.time1)}</td>
                <td>${formatTimeFromISO(boss.time2)}</td>
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


// Функция для отправки обновленных данных босса на сервер через WebSocket
function updateBossInDB(updatedData) {
    // Отправляем данные через WebSocket сервер
    socket.send(JSON.stringify({
        action: 'updateBoss',
        data: updatedData
    }));
}


const formatTimeFromISO = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ru-RU', { hour12: false });
};

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
        return;
    }

    // Получаем локальное время
    const localTime = new Date().toISOString();

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
        audio.play().catch((error) => console.log('Audio play failed:', error));

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
