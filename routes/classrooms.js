const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Просмотр списка аудиторий
router.get('/', (req, res) => {
  const query = `
    SELECT c.*, COUNT(e.id) as equipment_count 
    FROM classrooms c 
    LEFT JOIN equipment e ON c.id = e.classroom_id 
    GROUP BY c.id 
    ORDER BY c.floor, c.name
  `;

  db.all(query, (err, classrooms) => {
    if (err) {
      console.error('Ошибка получения аудиторий:', err);
      return res.render('error', {
        title: 'Ошибка',
        message: 'Не удалось загрузить список аудиторий'
      });
    }

    res.render('classrooms/index', {
      title: 'Управление аудиториями',
      classrooms
    });
  });
});

// Форма добавления аудитории
router.get('/add', (req, res) => {
  res.render('classrooms/form', {
    title: 'Добавить аудиторию',
    classroom: null
  });
});

// Добавление аудитории
router.post('/add', (req, res) => {
  const { floor, name, description, is_service } = req.body;
  
  const query = `
    INSERT INTO classrooms (floor, name, description, is_service) 
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [floor, name, description, is_service ? 1 : 0], function(err) {
    if (err) {
      console.error('Ошибка добавления аудитории:', err);
      return res.render('error', {
        title: 'Ошибка',
        message: 'Не удалось добавить аудиторию'
      });
    }

    res.redirect('/classrooms');
  });
});

// Форма редактирования аудитории
router.get('/edit/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM classrooms WHERE id = ?', [id], (err, classroom) => {
    if (err || !classroom) {
      return res.render('error', {
        title: 'Ошибка',
        message: 'Аудитория не найдена'
      });
    }

    res.render('classrooms/form', {
      title: 'Редактировать аудиторию',
      classroom
    });
  });
});

// Обновление аудитории
router.post('/edit/:id', (req, res) => {
  const { id } = req.params;
  const { floor, name, description, is_service } = req.body;
  
  const query = `
    UPDATE classrooms 
    SET floor = ?, name = ?, description = ?, is_service = ? 
    WHERE id = ?
  `;

  db.run(query, [floor, name, description, is_service ? 1 : 0, id], function(err) {
    if (err) {
      console.error('Ошибка обновления аудитории:', err);
      return res.render('error', {
        title: 'Ошибка',
        message: 'Не удалось обновить аудиторию'
      });
    }

    res.redirect('/classrooms');
  });
});

// Удаление аудитории
router.post('/delete/:id', (req, res) => {
  const { id } = req.params;
  
  // Проверка наличия оборудования в аудитории
  db.get('SELECT COUNT(*) as count FROM equipment WHERE classroom_id = ?', [id], (err, row) => {
    if (err) {
      console.error('Ошибка проверки оборудования:', err);
      return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }

    if (row.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Невозможно удалить аудиторию, в ней есть оборудование' 
      });
    }

    db.run('DELETE FROM classrooms WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Ошибка удаления аудитории:', err);
        return res.status(500).json({ success: false, message: 'Ошибка удаления' });
      }

      res.json({ success: true, message: 'Аудитория успешно удалена' });
    });
  });
});

// Статистика по кабинетам
router.get('/statistics', (req, res) => {
    const query = `
        SELECT 
            c.id,
            c.floor,
            c.name as classroom_name,
            c.description,
            c.is_service,
            COUNT(e.id) as total_equipment,
            SUM(e.quantity) as total_items,
            GROUP_CONCAT(DISTINCT et.name) as equipment_types
        FROM classrooms c
        LEFT JOIN equipment e ON c.id = e.classroom_id
        LEFT JOIN equipment_types et ON e.type_id = et.id
        GROUP BY c.id
        ORDER BY c.floor, c.name
    `;

    db.all(query, (err, classrooms) => {
        if (err) {
            console.error('Ошибка получения статистики:', err);
            return res.render('error', {
                title: 'Ошибка',
                message: 'Не удалось загрузить статистику'
            });
        }

        // Детальная статистика по типам оборудования для каждого кабинета
        const detailedStatsQuery = `
            SELECT 
                c.id as classroom_id,
                c.name as classroom_name,
                et.name as type_name,
                COUNT(e.id) as equipment_count,
                SUM(e.quantity) as total_quantity
            FROM classrooms c
            LEFT JOIN equipment e ON c.id = e.classroom_id
            LEFT JOIN equipment_types et ON e.type_id = et.id
            GROUP BY c.id, et.id
            HAVING equipment_count > 0
            ORDER BY c.floor, c.name, et.name
        `;

        db.all(detailedStatsQuery, (err, detailedStats) => {
            if (err) {
                console.error('Ошибка получения детальной статистики:', err);
                return res.render('error', {
                    title: 'Ошибка',
                    message: 'Не удалось загрузить детальную статистику'
                });
            }

            // Группируем детальную статистику по кабинетам
            const statsByClassroom = {};
            detailedStats.forEach(stat => {
                if (!statsByClassroom[stat.classroom_id]) {
                    statsByClassroom[stat.classroom_id] = [];
                }
                statsByClassroom[stat.classroom_id].push(stat);
            });

            res.render('classrooms/statistics', {
                title: 'Статистика по кабинетам',
                classrooms,
                statsByClassroom
            });
        });
    });
});

// Детальная статистика по конкретному кабинету
router.get('/statistics/:id', (req, res) => {
    const { id } = req.params;
    
    const queries = [
        // Информация о кабинете
        new Promise((resolve, reject) => {
            db.get('SELECT * FROM classrooms WHERE id = ?', [id], (err, classroom) => {
                if (err) reject(err);
                else resolve(classroom);
            });
        }),
        // Оборудование в кабинете
        new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    e.*,
                    et.name as type_name,
                    SUM(e.quantity) as total_quantity
                FROM equipment e
                LEFT JOIN equipment_types et ON e.type_id = et.id
                WHERE e.classroom_id = ?
                GROUP BY e.type_id
                ORDER BY et.name
            `;
            db.all(query, [id], (err, equipment) => {
                if (err) reject(err);
                else resolve(equipment);
            });
        }),
        // Подробный список оборудования
        new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    e.*,
                    et.name as type_name
                FROM equipment e
                LEFT JOIN equipment_types et ON e.type_id = et.id
                WHERE e.classroom_id = ?
                ORDER BY et.name, e.name
            `;
            db.all(query, [id], (err, equipmentList) => {
                if (err) reject(err);
                else resolve(equipmentList);
            });
        })
    ];

    Promise.all(queries)
        .then(([classroom, equipmentByType, equipmentList]) => {
            if (!classroom) {
                return res.render('error', {
                    title: 'Ошибка',
                    message: 'Кабинет не найден'
                });
            }

            // Общая статистика
            const totalItems = equipmentList.reduce((sum, item) => sum + (item.quantity || 1), 0);
            const totalEquipment = equipmentList.length;

            res.render('classrooms/classroom-detail', {
                title: `Статистика: ${classroom.floor} этаж - ${classroom.name}`,
                classroom,
                equipmentByType,
                equipmentList,
                totalItems,
                totalEquipment
            });
        })
        .catch(err => {
            console.error('Ошибка получения детальной статистики:', err);
            res.render('error', {
                title: 'Ошибка',
                message: 'Не удалось загрузить статистику кабинета'
            });
        });
});

module.exports = router;