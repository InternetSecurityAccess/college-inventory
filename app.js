const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация базы данных
const db = require('./database/init');

// Настройка шаблонизатора
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Подключение маршрутов
app.use('/', require('./routes/index'));
app.use('/classrooms', require('./routes/classrooms'));
app.use('/equipment', require('./routes/equipment'));
app.use('/equipment-types', require('./routes/equipmentTypes'));
app.use('/inventory', require('./routes/inventory')); //

// Обработка ошибок 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Страница не найдена',
    message: 'Запрашиваемая страница не существует'
  });
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка приложения:', err);
  res.status(500).render('error', {
    title: 'Ошибка сервера',
    message: 'Произошла внутренняя ошибка сервера'
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Приложение доступно по адресу: http://localhost:${PORT}`);
});

module.exports = app;