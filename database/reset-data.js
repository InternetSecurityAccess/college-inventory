const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database.db');

// Удаляем файл базы данных и пересоздаем
if (fs.existsSync(dbPath)) {
    console.log('Удаляем существующую базу данных...');
    fs.unlinkSync(dbPath);
}

console.log('Создаем новую базу данных с демо-данными...');

// Запускаем инициализацию
require('./init.js');

// Даем время на создание таблиц, затем добавляем демо-данные
setTimeout(() => {
    require('./demo-data.js');
}, 2000);