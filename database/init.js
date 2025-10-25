const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err.message);
  } else {
    console.log('Успешное подключение к БД SQLite');
  }
});

// Создание таблиц
db.serialize(() => {
  // Таблица типов оборудования
  db.run(`CREATE TABLE IF NOT EXISTS equipment_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица аудиторий
  db.run(`CREATE TABLE IF NOT EXISTS classrooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    floor INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_service BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

// Таблица оборудования
db.run(`CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type_id INTEGER NOT NULL,
    inventory_number TEXT UNIQUE,
    serial_number TEXT,
    classroom_id INTEGER,
    quantity INTEGER DEFAULT 1, -- НОВОЕ ПОЛЕ: Количество
    status TEXT DEFAULT 'active',
    purchase_date DATE,
    comment TEXT,
    photo_filename TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES equipment_types(id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
)`);

// Таблица истории перемещений
db.run(`CREATE TABLE IF NOT EXISTS equipment_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    from_classroom_id INTEGER,
    to_classroom_id INTEGER NOT NULL,
    movement_reason TEXT,
    moved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id),
    FOREIGN KEY (from_classroom_id) REFERENCES classrooms(id),
    FOREIGN KEY (to_classroom_id) REFERENCES classrooms(id)
)`);

// Таблица инвентаризаций
db.run(`CREATE TABLE IF NOT EXISTS inventories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    classroom_id INTEGER,
    status TEXT DEFAULT 'draft', -- draft, in_progress, completed
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
)`);

// Таблица результатов инвентаризации
db.run(`CREATE TABLE IF NOT EXISTS inventory_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    expected_quantity INTEGER NOT NULL,
    actual_quantity INTEGER NOT NULL,
    note TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventories(id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
)`);

// Таблица дополнительного оборудования в инвентаризациях
db.run(`CREATE TABLE IF NOT EXISTS inventory_additional_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type_name TEXT,
    quantity INTEGER DEFAULT 1,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventories(id)
)`);

// Обновим начальные данные
db.run(`INSERT OR IGNORE INTO equipment (name, type_id, inventory_number, serial_number, classroom_id, quantity, status) VALUES 
    ('Стационарный компьютер преподавателя', 1, 'INV-001', 'SN-PC-001', 1, 1, 'active'),
    ('Монитор Dell 24"', 2, 'INV-002', 'SN-MON-001', 1, 1, 'active'),
    ('МФУ HP LaserJet', 3, 'INV-003', 'SN-MFP-001', 2, 1, 'active'),
    ('Стул компьютерный', 4, 'INV-004', NULL, 1, 25, 'active'),
    ('ПК в сборе (студенческий)', 1, 'INV-005', NULL, 1, 15, 'active'),
    ('Стол компьютерный', 4, 'INV-006', NULL, 1, 15, 'active')`);
});

module.exports = db;