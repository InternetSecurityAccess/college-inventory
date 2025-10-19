const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');

const db = new sqlite3.Database('./inventory.db', (err) => {
    if (err) {
        console.error('Ошибка при подключении к базе данных:', err.message);
    } else {
        console.log('Подключено к базе данных SQLite.');
        createTables();
    }
});

function createTables() {
    // Создание таблицы предметов
    db.run(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        acquisition_date DATE,
        serial_number TEXT,
        inventory_number TEXT,
        status TEXT DEFAULT 'В наличии',
        location_id INTEGER,
        item_type_id INTEGER,
        responsible_employee TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (item_type_id) REFERENCES item_types(id)
    );`, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы items:', err.message);
        } else {
            console.log('Таблица "items" готова.');
            seedItems();
        }
    });

   db.run(`ALTER TABLE items ADD COLUMN responsible_employee TEXT;`, (err) => {
        if (err && err.message !== 'SQLITE_ERROR: duplicate column name: responsible_employee') {
            console.error('Ошибка при добавлении столбца responsible_employee:', err.message);
        } else {
            console.log('Столбец "responsible_employee" добавлен в таблицу "items".');
        }
    });

    // Создание таблицы местоположений
    db.run(`CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
    );`, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы locations:', err.message);
        } else {
            console.log('Таблица "locations" готова.');
            seedLocations();
        }
    });

    // Создание таблицы видов предметов
    db.run(`CREATE TABLE IF NOT EXISTS item_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
    );`, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы item_types:', err.message);
        } else {
            console.log('Таблица "item_types" готова.');
            seedItemTypes();
        }
    });

      // Создание таблицы для истории перемещений
    db.run(`CREATE TABLE IF NOT EXISTS item_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        from_location_id INTEGER REFERENCES locations(id),
        location_id INTEGER NOT NULL,
        moved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT, -- Описание перемещения (например, причина)
        FOREIGN KEY (item_id) REFERENCES items(id),
        FOREIGN KEY (location_id) REFERENCES locations(id)
    );`, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы item_movements:', err.message);
        } else {
            console.log('Таблица "item_movements" готова.');
        }
    });

    db.run(`ALTER TABLE item_movements ADD COLUMN from_location_id INTEGER REFERENCES locations(id);`, (err) => {
        if (err && err.message !== 'SQLITE_ERROR: duplicate column name: from_location_id') {
            console.error('Ошибка при добавлении столбца from_location_id:', err.message);
        } else {
            console.log('Столбец "from_location_id" добавлен в таблицу "item_movements".');
        }
    });
}

// --- Функции для работы со справочниками ---
function getAllLocations(callback) {
    db.all('SELECT * FROM locations ORDER BY name', [], callback);
}

function getAllItemTypes(callback) {
    db.all('SELECT * FROM item_types ORDER BY name', [], callback);
}

function addLocation(name, description = '', callback) {
    const stmt = db.prepare('INSERT INTO locations (name, description) VALUES (?, ?)');
    stmt.run(name, description, function(err) {
        if (err) {
            callback(err);
        } else {
            callback(null, { id: this.lastID, name, description });
        }
    });
    stmt.finalize();
}

function addItemType(name, description = '', callback) {
    const stmt = db.prepare('INSERT INTO item_types (name, description) VALUES (?, ?)');
    stmt.run(name, description, function(err) {
        if (err) {
            callback(err);
        } else {
            callback(null, { id: this.lastID, name, description });
        }
    });
    stmt.finalize();
}
// Добавление функции для записи перемещения предмета
function logItemMovement(itemId, fromLocationId, locationId, description = '', callback) {
    const stmt = db.prepare('INSERT INTO item_movements (item_id, from_location_id, location_id, description) VALUES (?, ?, ?, ?)');
    stmt.run(itemId, fromLocationId, locationId, description, function(err) {
        if (err) {
            callback(err);
        } else {
            callback(null, { id: this.lastID, item_id: itemId, from_location_id: fromLocationId, location_id: locationId, description: description });
        }
    });
    stmt.finalize();
}

// --- Функции предзаполнения справочников ---
function seedLocations() {
    const locationsToSeed = [
        // Этаж Первый
        { name: "Аудитория 101", description: "Первый этаж, помещение 101" },
        // Этаж Второй
        { name: "Кабинет 201", description: "Второй этаж, помещение 201" },
        // Этаж Третий
        { name: "Лаборатория 301", description: "Третий этаж, помещение 301" },
        // Этаж Четвертый
        { name: "Кабинет 400", description: "Четвертый этаж, помещение 400" },
        //Серверная
        { name: "Серверная", description: "Серверная комната" },
        // Склад
        { name: "Склад", description: "Основное складское помещение" }
    ];

    const stmt = db.prepare('INSERT OR IGNORE INTO locations (name, description) VALUES (?, ?)');
    locationsToSeed.forEach(loc => {
        stmt.run(loc.name, loc.description);
    });
    stmt.finalize(err => {
        if (err) {
            console.error("Ошибка при предзаполнении местоположений:", err.message);
        } else {
            console.log("Местоположения предзаполнены.");
        }
    });
}

function seedItemTypes() {
    const itemTypesToSeed = [
        { name: "Принтер", description: "Печатающее устройство" },
        { name: "МФУ", description: "Многофункциональное устройство (печать, сканирование, копирование)" },
        { name: "Системный блок", description: "Основной компонент компьютера" },
        { name: "Монитор", description: "Устройство отображения информации" },
        { name: "Компьютерный стол", description: "Мебель для рабочего места" },
        { name: "Ноутбук", description: "Портативный компьютер" },
        { name: "Клавиатура", description: "Устройство ввода" },
        { name: "Мышь", description: "Устройство ввода" },
        { name: "Проектор", description: "Устройство для вывода изображения на большой экран" },
        { name: "Сетевой коммутатор", description: "Устройство для соединения компьютеров в сеть" },
        { name: "Маршрутизатор", description: "Устройство для организации сетевого доступа" },
        { name: "Источник бесперебойного питания (ИБП)", description: "Обеспечивает питание при сбоях электросети" },
        { name: "Сервер", description: "Вычислительное устройство для хранения данных и предоставления услуг" },
        { name: "Стул", description: "Мебель для сидения" },
        { name: "Шкаф", description: "Мебель для хранения" }
    ];

    const stmt = db.prepare('INSERT OR IGNORE INTO item_types (name, description) VALUES (?, ?)');
    itemTypesToSeed.forEach(type => {
        stmt.run(type.name, type.description);
    });
    stmt.finalize(err => {
        if (err) {
            console.error("Ошибка при предзаполнении видов предметов:", err.message);
        } else {
            console.log("Виды предметов предзаполнены.");
        }
    });
}

function seedItems() {
    console.log("Таблица 'items' не будет предзаполнена.");
}

// --- Экспортируем объект базы данных и функции для работы со справочниками ---
module.exports = {
    db: db,
    getAllLocations,
    getAllItemTypes,
    addLocation,
    addItemType,
    logItemMovement
};