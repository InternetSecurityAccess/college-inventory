const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Главная страница
router.get('/', (req, res) => {
  // Получение статистики для главной страницы
  const queries = [
    'SELECT COUNT(*) as count FROM equipment',
    'SELECT COUNT(*) as count FROM classrooms',
    'SELECT COUNT(*) as count FROM equipment_types',
    `SELECT COUNT(*) as count FROM equipment WHERE classroom_id IS NULL`
  ];

  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.get(query, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    })
  ))
  .then(([equipmentCount, classroomCount, typeCount, unassignedCount]) => {
    res.render('index', {
      title: 'Управление инвентарем колледжа',
      equipmentCount,
      classroomCount,
      typeCount,
      unassignedCount
    });
  })
  .catch(err => {
    console.error('Ошибка получения статистики:', err);
    res.render('index', {
      title: 'Управление инвентарем колледжа',
      equipmentCount: 0,
      classroomCount: 0,
      typeCount: 0,
      unassignedCount: 0
    });
  });
});

module.exports = router;