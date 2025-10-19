const express = require('express');
const path = require('path');
const ejsMate = require('ejs-mate');
const moment = require('moment');
const csv = require('csv-stringify');

const dbModule = require('./db'); // Импортируем модуль базы данных

const itemsRoutes = require('./routes/items');
const locationsRoutes = require('./routes/locations');
const itemTypesRoutes = require('./routes/item_types');
const movementsRoutes = require('./routes/movements');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Конфигурация EJS и Express ---
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Подключение moment и csv-stringify для использования в шаблонах, если потребуется
app.locals.moment = moment;
app.locals.csv = csv;

// Подключаем маршруты
app.use('/', itemsRoutes); //  маршруты для главной страницы и для предметов
app.use('/', locationsRoutes); //  маршруты для местоположений
app.use('/', itemTypesRoutes); //  маршруты для видов предметов
app.use('/', movementsRoutes); //  маршруты для перемещений
app.use('/', reportsRoutes); //  маршруты для отчетов

// --- Запуск сервера ---
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});