const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const router = express.Router();
const db = require('../database/init');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'equipment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Просмотр списка оборудования
router.get('/', (req, res) => {
  const { type, status, classroom } = req.query;
  
let query = `
    SELECT e.*, et.name as type_name, c.name as classroom_name, c.floor
    FROM equipment e
    LEFT JOIN equipment_types et ON e.type_id = et.id
    LEFT JOIN classrooms c ON e.classroom_id = c.id
    WHERE 1=1
`;
  const params = [];

  if (type && type !== 'all') {
    query += ' AND e.type_id = ?';
    params.push(type);
  }

  if (status && status !== 'all') {
    query += ' AND e.status = ?';
    params.push(status);
  }

  if (classroom && classroom !== 'all') {
    if (classroom === 'unassigned') {
      query += ' AND e.classroom_id IS NULL';
    } else {
      query += ' AND e.classroom_id = ?';
      params.push(classroom);
    }
  }

  query += ' ORDER BY e.created_at DESC';

  // Получение фильтров
  Promise.all([
    new Promise((resolve, reject) => {
      db.all(query, params, (err, equipment) => {
        if (err) reject(err);
        else resolve(equipment);
      });
    }),
    new Promise((resolve, reject) => {
      db.all('SELECT * FROM equipment_types ORDER BY name', (err, types) => {
        if (err) reject(err);
        else resolve(types);
      });
    }),
    new Promise((resolve, reject) => {
      db.all('SELECT * FROM classrooms ORDER BY floor, name', (err, classrooms) => {
        if (err) reject(err);
        else resolve(classrooms);
      });
    })
  ])
  .then(([equipment, types, classrooms]) => {
    res.render('equipment/index', {
      title: 'Управление оборудованием',
      equipment,
      types,
      classrooms,
      filters: { type, status, classroom }
    });
  })
  .catch(err => {
    console.error('Ошибка получения оборудования:', err);
    res.render('error', {
      title: 'Ошибка',
      message: 'Не удалось загрузить список оборудования'
    });
  });
});

// Форма добавления оборудования
router.get('/add', (req, res) => {
  Promise.all([
    new Promise((resolve, reject) => {
      db.all('SELECT * FROM equipment_types ORDER BY name', (err, types) => {
        if (err) reject(err);
        else resolve(types);
      });
    }),
    new Promise((resolve, reject) => {
      db.all('SELECT * FROM classrooms ORDER BY floor, name', (err, classrooms) => {
        if (err) reject(err);
        else resolve(classrooms);
      });
    })
  ])
  .then(([types, classrooms]) => {
    res.render('equipment/form', {
      title: 'Добавить оборудование',
      equipment: null,
      types,
      classrooms
    });
  })
  .catch(err => {
    console.error('Ошибка получения данных для формы:', err);
    res.render('error', {
      title: 'Ошибка',
      message: 'Не удалось загрузить данные для формы'
    });
  });
});

// Добавление оборудования
router.post('/add', upload.single('photo'), (req, res) => {
  const {
    type_id,
    inventory_number,
    serial_number,
    classroom_id,
    status,
    purchase_date,
    comment
  } = req.body;

  const photo_filename = req.file ? req.file.filename : null;

const query = `
    INSERT INTO equipment 
    (name, type_id, inventory_number, serial_number, classroom_id, quantity, status, purchase_date, comment, photo_filename) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;


db.run(query, [
    req.body.name,
    type_id,
    inventory_number || null,
    serial_number || null,
    classroom_id || null,
    req.body.quantity || 1, // Добавляем quantity
    status || 'active',
    purchase_date || null,
    comment || null,
    photo_filename
], function(err) {
    if (err) {
      // Удаляем загруженный файл в случае ошибки
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Ошибка добавления оборудования:', err);
      return res.render('error', {
        title: 'Ошибка',
        message: 'Не удалось добавить оборудование'
      });
    }

    res.redirect('/equipment');
  });
});

// Форма группового добавления оборудования
router.get('/group-add', (req, res) => {
    Promise.all([
        new Promise((resolve, reject) => {
            db.all('SELECT * FROM equipment_types ORDER BY name', (err, types) => {
                if (err) reject(err);
                else resolve(types);
            });
        }),
        new Promise((resolve, reject) => {
            db.all('SELECT * FROM classrooms ORDER BY floor, name', (err, classrooms) => {
                if (err) reject(err);
                else resolve(classrooms);
            });
        })
    ])
    .then(([types, classrooms]) => {
        res.render('equipment/group-add', {
            title: 'Групповое добавление оборудования',
            types,
            classrooms
        });
    })
    .catch(err => {
        console.error('Ошибка получения данных для формы:', err);
        res.render('error', {
            title: 'Ошибка',
            message: 'Не удалось загрузить данные для формы'
        });
    });
});

// Обработка группового добавления оборудования (БЕЗ multer для загрузки файлов)
router.post('/group-add', (req, res) => {
    const {
        base_name,
        type_id,
        classroom_id,
        quantity,
        inventory_prefix,
        start_number,
        naming_template,
        custom_template,
        status,
        purchase_date,
        comment
    } = req.body;

    console.log('Полученные данные:', req.body); // Для отладки

    // Проверка обязательных полей
    if (!base_name || !type_id || !classroom_id) {
        return res.render('error', {
            title: 'Ошибка',
            message: 'Заполните все обязательные поля: базовое наименование, тип оборудования и аудитория'
        });
    }

    const quantityNum = parseInt(quantity) || 1;
    const startNum = parseInt(start_number) || 1;

    if (quantityNum > 100) {
        return res.render('error', {
            title: 'Ошибка',
            message: 'Максимальное количество для группового добавления - 100 единиц'
        });
    }

    if (quantityNum < 1) {
        return res.render('error', {
            title: 'Ошибка',
            message: 'Количество должно быть не менее 1'
        });
    }

    const results = {
        success: 0,
        errors: []
    };

    // Функция для создания одной записи
    const createEquipment = (index) => {
        return new Promise((resolve, reject) => {
            const currentNumber = startNum + index;
            
            // Формируем название оборудования
            let equipmentName = base_name;
            if (naming_template === 'with_number') {
                equipmentName = `${base_name} №${currentNumber}`;
            } else if (naming_template === 'custom' && custom_template) {
                equipmentName = custom_template
                    .replace(/{n}/g, currentNumber)
                    .replace(/{prefix}/g, inventory_prefix || '')
                    .replace(/{base}/g, base_name);
            }
            
            // Формируем инвентарный номер
            let inventoryNumber = null;
            if (inventory_prefix && inventory_prefix.trim() !== '') {
                inventoryNumber = `${inventory_prefix}${currentNumber}`;
                
                // Проверяем уникальность инвентарного номера
                db.get('SELECT id FROM equipment WHERE inventory_number = ?', [inventoryNumber], (err, existing) => {
                    if (err) {
                        results.errors.push(`Ошибка проверки инвентарного номера "${inventoryNumber}": ${err.message}`);
                        resolve();
                        return;
                    }
                    
                    if (existing) {
                        results.errors.push(`Инвентарный номер "${inventoryNumber}" уже существует`);
                        resolve();
                        return;
                    }
                    
                    insertEquipment(equipmentName, inventoryNumber, resolve);
                });
            } else {
                insertEquipment(equipmentName, null, resolve);
            }
        });
    };

    // Функция вставки оборудования в БД
    const insertEquipment = (equipmentName, inventoryNumber, resolve) => {
        const query = `
            INSERT INTO equipment 
            (name, type_id, inventory_number, classroom_id, status, purchase_date, comment) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(query, [
            equipmentName,
            type_id,
            inventoryNumber,
            classroom_id,
            status || 'active',
            purchase_date || null,
            comment || null
        ], function(err) {
            if (err) {
                results.errors.push(`Ошибка при добавлении "${equipmentName}": ${err.message}`);
                resolve();
            } else {
                results.success++;
                resolve();
            }
        });
    };

    // Создаем все записи последовательно
    const createAllEquipment = async () => {
        for (let i = 0; i < quantityNum; i++) {
            await createEquipment(i);
        }
        
        // Записываем перемещение в историю для первой добавленной единицы (если оборудование добавляется в кабинет)
        if (classroom_id && results.success > 0) {
            // Получаем ID последнего добавленного оборудования для примера
            db.get('SELECT id FROM equipment WHERE classroom_id = ? ORDER BY id DESC LIMIT 1', 
            [classroom_id], (err, equipment) => {
                if (!err && equipment) {
                    db.run(
                        'INSERT INTO equipment_movements (equipment_id, from_classroom_id, to_classroom_id, movement_reason) VALUES (?, ?, ?, ?)',
                        [equipment.id, null, classroom_id, 'Групповое добавление оборудования'],
                        function(err) {
                            if (err) {
                                console.error('Ошибка записи истории перемещений:', err);
                            }
                        }
                    );
                }
            });
        }
        
        // Показываем результаты
        res.render('equipment/group-add-result', {
            title: 'Результаты группового добавления',
            results,
            total: quantityNum
        });
    };

    createAllEquipment();
});

// Форма редактирования оборудования
router.get('/edit/:id', (req, res) => {
  const { id } = req.params;
  
  Promise.all([
    new Promise((resolve, reject) => {
      db.get(`
        SELECT e.*, et.name as type_name, c.name as classroom_name 
        FROM equipment e
        LEFT JOIN equipment_types et ON e.type_id = et.id
        LEFT JOIN classrooms c ON e.classroom_id = c.id
        WHERE e.id = ?
      `, [id], (err, equipment) => {
        if (err) reject(err);
        else resolve(equipment);
      });
    }),
    new Promise((resolve, reject) => {
      db.all('SELECT * FROM equipment_types ORDER BY name', (err, types) => {
        if (err) reject(err);
        else resolve(types);
      });
    }),
    new Promise((resolve, reject) => {
      db.all('SELECT * FROM classrooms ORDER BY floor, name', (err, classrooms) => {
        if (err) reject(err);
        else resolve(classrooms);
      });
    })
  ])
  .then(([equipment, types, classrooms]) => {
    if (!equipment) {
      return res.render('error', {
        title: 'Ошибка',
        message: 'Оборудование не найдено'
      });
    }

    res.render('equipment/form', {
      title: 'Редактировать оборудование',
      equipment,
      types,
      classrooms
    });
  })
  .catch(err => {
    console.error('Ошибка получения данных для редактирования:', err);
    res.render('error', {
      title: 'Ошибка',
      message: 'Не удалось загрузить данные для редактирования'
    });
  });
});

// Обновление оборудования (БЕЗ записи в историю перемещений)
router.post('/edit/:id', upload.single('photo'), (req, res) => {
  const { id } = req.params;
  const {
    type_id,
    inventory_number,
    serial_number,
    classroom_id,
    status,
    purchase_date,
    comment,
    remove_photo
  } = req.body;

  // Получаем текущие данные оборудования
  db.get('SELECT photo_filename, classroom_id as current_classroom_id FROM equipment WHERE id = ?', [id], (err, currentEquipment) => {
    if (err) {
      console.error('Ошибка получения текущих данных:', err);
      return res.render('error', {
        title: 'Ошибка',
        message: 'Не удалось обновить оборудование'
      });
    }

    if (!currentEquipment) {
      return res.render('error', {
        title: 'Ошибка',
        message: 'Оборудование не найдено'
      });
    }

    let photo_filename = currentEquipment.photo_filename;
    const current_classroom_id = currentEquipment.current_classroom_id;

    // Удаление фото если запрошено
    if (remove_photo === '1' && photo_filename) {
      const filePath = path.join(__dirname, '../public/uploads', photo_filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      photo_filename = null;
    }

    // Обновление фото если загружено новое
    if (req.file) {
      // Удаляем старое фото
      if (photo_filename) {
        const oldFilePath = path.join(__dirname, '../public/uploads', photo_filename);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      photo_filename = req.file.filename;
    }

const query = `
    UPDATE equipment 
    SET name = ?, type_id = ?, inventory_number = ?, serial_number = ?, classroom_id = ?, 
        quantity = ?, status = ?, purchase_date = ?, comment = ?, photo_filename = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
`;

db.run(query, [
    req.body.name,
    type_id,
    inventory_number || null,
    serial_number || null,
    classroom_id || null,
    req.body.quantity || 1, // Добавляем quantity
    status || 'active',
    purchase_date || null,
    comment || null,
    photo_filename,
    id
], function(err) {
      if (err) {
        // Удаляем загруженный файл в случае ошибки
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        console.error('Ошибка обновления оборудования:', err);
        return res.render('error', {
          title: 'Ошибка',
          message: 'Не удалось обновить оборудование'
        });
      }

      // ВАЖНО: При обычном редактировании НЕ создаем запись в истории перемещений
      // даже если изменился classroom_id, так как это может быть исправлением ошибки
      
      res.redirect('/equipment');
    });
  });
});

// Перемещение оборудования (С записью в историю перемещений)
router.post('/move/:id', (req, res) => {
  const { id } = req.params;
  const { to_classroom_id, movement_reason } = req.body;

  // Проверяем, что указана новая аудитория
  if (!to_classroom_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Необходимо выбрать новую аудиторию' 
    });
  }

  // Получаем текущее местоположение оборудования
  db.get('SELECT classroom_id FROM equipment WHERE id = ?', [id], (err, equipment) => {
    if (err) {
      console.error('Ошибка получения данных оборудования:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Ошибка сервера при получении данных оборудования' 
      });
    }

    if (!equipment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Оборудование не найдено' 
      });
    }

    const from_classroom_id = equipment.classroom_id;

    // Проверяем, что оборудование действительно перемещается в другую аудиторию
    if (from_classroom_id == to_classroom_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Оборудование уже находится в выбранной аудитории' 
      });
    }

    // Обновляем местоположение оборудования
    db.run('UPDATE equipment SET classroom_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
    [to_classroom_id, id], function(err) {
      if (err) {
        console.error('Ошибка перемещения оборудования:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Ошибка перемещения оборудования' 
        });
      }

      // ЗАПИСЫВАЕМ В ИСТОРИЮ ПЕРЕМЕЩЕНИЙ - это официальное перемещение
      db.run(
        'INSERT INTO equipment_movements (equipment_id, from_classroom_id, to_classroom_id, movement_reason) VALUES (?, ?, ?, ?)',
        [id, from_classroom_id, to_classroom_id, movement_reason || 'Не указана'],
        function(err) {
          if (err) {
            console.error('Ошибка записи истории перемещений:', err);
            // Даже если не удалось записать историю, считаем перемещение успешным
            console.log('Перемещение выполнено, но не записано в историю');
          }

          res.json({ 
            success: true, 
            message: 'Оборудование успешно перемещено' 
          });
        }
      );
    });
  });
});

// Удаление оборудования
router.post('/delete/:id', (req, res) => {
  const { id } = req.params;
  
  // Получаем информацию о фото
  db.get('SELECT photo_filename FROM equipment WHERE id = ?', [id], (err, equipment) => {
    if (err) {
      console.error('Ошибка получения данных оборудования:', err);
      return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }

    // Удаляем оборудование
    db.run('DELETE FROM equipment WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Ошибка удаления оборудования:', err);
        return res.status(500).json({ success: false, message: 'Ошибка удаления' });
      }

      // Удаляем связанное фото
      if (equipment.photo_filename) {
        const filePath = path.join(__dirname, '../public/uploads', equipment.photo_filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.json({ success: true, message: 'Оборудование успешно удалено' });
    });
  });
});

// История перемещений оборудования
router.get('/movements/:id', (req, res) => {
  const { id } = req.params;
  
const query = `
    SELECT em.*, 
           fc.name as from_classroom_name, 
           tc.name as to_classroom_name,
           e.name,
           e.inventory_number,
           e.serial_number
    FROM equipment_movements em
    JOIN equipment e ON em.equipment_id = e.id
    LEFT JOIN classrooms fc ON em.from_classroom_id = fc.id
    JOIN classrooms tc ON em.to_classroom_id = tc.id
    WHERE em.equipment_id = ?
    ORDER BY em.moved_at DESC
`;

  db.all(query, [id], (err, movements) => {
    if (err) {
      console.error('Ошибка получения истории перемещений:', err);
      return res.render('error', {
        title: 'Ошибка',
        message: 'Не удалось загрузить историю перемещений'
      });
    }

    res.render('equipment/movements', {
      title: 'История перемещений оборудования',
      movements,
      equipment: movements[0] || {}
    });
  });
});

// Экспорт оборудования в CSV
router.get('/export', (req, res) => {
  const query = `
    SELECT 
      e.inventory_number,
      e.serial_number,
      et.name as type_name,
      c.name as classroom_name,
      c.floor,
      e.status,
      e.purchase_date,
      e.comment,
      e.created_at
    FROM equipment e
    LEFT JOIN equipment_types et ON e.type_id = et.id
    LEFT JOIN classrooms c ON e.classroom_id = c.id
    ORDER BY e.created_at DESC
  `;

  db.all(query, (err, equipment) => {
    if (err) {
      console.error('Ошибка экспорта оборудования:', err);
      return res.status(500).send('Ошибка экспорта данных');
    }

    const csvWriter = createCsvWriter({
      path: 'temp_export.csv',
      header: [
        { id: 'inventory_number', title: 'Инвентарный номер' },
        { id: 'serial_number', title: 'Серийный номер' },
        { id: 'type_name', title: 'Тип оборудования' },
        { id: 'classroom_name', title: 'Аудитория' },
        { id: 'floor', title: 'Этаж' },
        { id: 'status', title: 'Статус' },
        { id: 'purchase_date', title: 'Дата покупки' },
        { id: 'comment', title: 'Комментарий' },
        { id: 'created_at', title: 'Дата добавления' }
      ]
    });

    csvWriter.writeRecords(equipment)
      .then(() => {
        res.download('temp_export.csv', `equipment_export_${Date.now()}.csv`, (err) => {
          if (err) {
            console.error('Ошибка скачивания файла:', err);
          }
          // Удаляем временный файл
          fs.unlinkSync('temp_export.csv');
        });
      })
      .catch(err => {
        console.error('Ошибка записи CSV:', err);
        res.status(500).send('Ошибка создания файла');
      });
  });
});

// Форма импорта оборудования
router.get('/import', (req, res) => {
  res.render('equipment/import', {
    title: 'Импорт оборудования из CSV'
  });
});

// Импорт оборудования из CSV
router.post('/import', upload.single('csv_file'), (req, res) => {
  if (!req.file) {
    return res.render('error', {
      title: 'Ошибка',
      message: 'Файл не был загружен'
    });
  }

  const results = [];
  const errors = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => {
      results.push(data);
    })
    .on('end', () => {
      // Удаляем временный файл
      fs.unlinkSync(req.file.path);

      // Валидация и импорт данных
      importEquipment(results, errors)
        .then(() => {
          res.render('equipment/import-result', {
            title: 'Результаты импорта',
            total: results.length,
            success: results.length - errors.length,
            errors
          });
        })
        .catch(err => {
          console.error('Ошибка импорта:', err);
          res.render('error', {
            title: 'Ошибка',
            message: 'Произошла ошибка при импорте данных'
          });
        });
    })
    .on('error', (err) => {
      console.error('Ошибка чтения CSV:', err);
      res.render('error', {
        title: 'Ошибка',
        message: 'Ошибка чтения CSV файла'
      });
    });
});

// Функция импорта оборудования
function importEquipment(data, errors) {
  return new Promise((resolve, reject) => {
    let processed = 0;

    data.forEach((row, index) => {
      // Валидация обязательных полей
      if (!row.type_name || !row.inventory_number) {
        errors.push(`Строка ${index + 1}: Отсутствуют обязательные поля (тип оборудования или инвентарный номер)`);
        processed++;
        if (processed === data.length) resolve();
        return;
      }

      // Получаем ID типа оборудования
      db.get('SELECT id FROM equipment_types WHERE name = ?', [row.type_name], (err, type) => {
        if (err || !type) {
          errors.push(`Строка ${index + 1}: Неизвестный тип оборудования "${row.type_name}"`);
          processed++;
          if (processed === data.length) resolve();
          return;
        }

        let classroom_id = null;
        if (row.classroom_name) {
          // Получаем ID аудитории
          db.get('SELECT id FROM classrooms WHERE name = ?', [row.classroom_name], (err, classroom) => {
            if (classroom) {
              classroom_id = classroom.id;
            }
            insertEquipment(row, type.id, classroom_id, index, errors, processed, data.length, resolve);
          });
        } else {
          insertEquipment(row, type.id, classroom_id, index, errors, processed, data.length, resolve);
        }
      });
    });

    if (data.length === 0) resolve();
  });
}

function insertEquipment(row, type_id, classroom_id, index, errors, processed, total, resolve) {
  const query = `
    INSERT OR IGNORE INTO equipment 
    (type_id, inventory_number, serial_number, classroom_id, status, purchase_date, comment) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    type_id,
    row.inventory_number,
    row.serial_number || null,
    classroom_id,
    row.status || 'active',
    row.purchase_date || null,
    row.comment || null
  ], function(err) {
    processed++;
    
    if (err) {
      errors.push(`Строка ${index + 1}: Ошибка базы данных - ${err.message}`);
    } else if (this.changes === 0) {
      errors.push(`Строка ${index + 1}: Оборудование с инвентарным номером "${row.inventory_number}" уже существует`);
    }

    if (processed === total) resolve();
  });
}

module.exports = router;