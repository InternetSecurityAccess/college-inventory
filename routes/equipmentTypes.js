const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Просмотр списка типов оборудования
router.get('/', (req, res) => {
  const query = `
    SELECT et.*, COUNT(e.id) as equipment_count 
    FROM equipment_types et 
    LEFT JOIN equipment e ON et.id = e.type_id 
    GROUP BY et.id 
    ORDER BY et.name
  `;

  db.all(query, (err, types) => {
    if (err) {
      console.error('Ошибка получения типов оборудования:', err);
      return res.render('error', {
        title: 'Ошибка',
        message: 'Не удалось загрузить список типов оборудования'
      });
    }

    res.render('equipment-types/index', {
      title: 'Управление типами оборудования',
      types
    });
  });
});

// Добавление типа оборудования
router.post('/add', (req, res) => {
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Название типа не может быть пустым' 
    });
  }

  db.run('INSERT INTO equipment_types (name) VALUES (?)', [name.trim()], function(err) {
    if (err) {
      console.error('Ошибка добавления типа оборудования:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Не удалось добавить тип оборудования' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Тип оборудования успешно добавлен',
      id: this.lastID 
    });
  });
});

// Удаление типа оборудования
router.post('/delete/:id', (req, res) => {
  const { id } = req.params;
  
  // Проверка наличия оборудования этого типа
  db.get('SELECT COUNT(*) as count FROM equipment WHERE type_id = ?', [id], (err, row) => {
    if (err) {
      console.error('Ошибка проверки оборудования:', err);
      return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }

    if (row.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Невозможно удалить тип оборудования, к нему привязано оборудование' 
      });
    }

    db.run('DELETE FROM equipment_types WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Ошибка удаления типа оборудования:', err);
        return res.status(500).json({ success: false, message: 'Ошибка удаления' });
      }

      res.json({ success: true, message: 'Тип оборудования успешно удален' });
    });
  });
});

module.exports = router;