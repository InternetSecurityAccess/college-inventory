const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Главная страница инвентаризации
router.get('/', (req, res) => {
    const query = `
        SELECT 
            inv.*,
            c.name as classroom_name,
            c.floor,
            COUNT(ir.id) as checked_items,
            (SELECT COUNT(*) FROM equipment e WHERE e.classroom_id = inv.classroom_id) as total_items
        FROM inventories inv
        LEFT JOIN classrooms c ON inv.classroom_id = c.id
        LEFT JOIN inventory_results ir ON inv.id = ir.inventory_id
        GROUP BY inv.id
        ORDER BY inv.created_at DESC
    `;

    db.all(query, (err, inventories) => {
        if (err) {
            console.error('Ошибка получения инвентаризаций:', err);
            return res.render('error', {
                title: 'Ошибка',
                message: 'Не удалось загрузить список инвентаризаций'
            });
        }

        res.render('inventory/index', {
            title: 'Инвентаризация',
            inventories
        });
    });
});

// Форма создания новой инвентаризации
router.get('/create', (req, res) => {
    db.all('SELECT * FROM classrooms ORDER BY floor, name', (err, classrooms) => {
        if (err) {
            console.error('Ошибка получения аудиторий:', err);
            return res.render('error', {
                title: 'Ошибка',
                message: 'Не удалось загрузить список аудиторий'
            });
        }

        res.render('inventory/create', {
            title: 'Новая инвентаризация',
            classrooms
        });
    });
});

// Создание новой инвентаризации
router.post('/create', (req, res) => {
    const { name, description, classroom_id } = req.body;

    if (!name || !classroom_id) {
        return res.render('error', {
            title: 'Ошибка',
            message: 'Заполните название и выберите аудиторию'
        });
    }

    const query = `
        INSERT INTO inventories (name, description, classroom_id, created_by, status) 
        VALUES (?, ?, ?, ?, 'draft')
    `;

    db.run(query, [name, description, classroom_id, 'Администратор'], function(err) {
        if (err) {
            console.error('Ошибка создания инвентаризации:', err);
            return res.render('error', {
                title: 'Ошибка',
                message: 'Не удалось создать инвентаризацию'
            });
        }

        res.redirect(`/inventory/conduct/${this.lastID}`);
    });
});

// Проведение инвентаризации
router.get('/conduct/:id', (req, res) => {
    const { id } = req.params;

    // Сначала получаем информацию об инвентаризации
    db.get(`
        SELECT inv.*, c.name as classroom_name, c.floor 
        FROM inventories inv 
        LEFT JOIN classrooms c ON inv.classroom_id = c.id 
        WHERE inv.id = ?
    `, [id], (err, inventory) => {
        if (err) {
            console.error('Ошибка получения инвентаризации:', err);
            return res.render('error', {
                title: 'Ошибка',
                message: 'Не удалось загрузить данные инвентаризации'
            });
        }

        if (!inventory) {
            return res.render('error', {
                title: 'Ошибка',
                message: 'Инвентаризация не найдена'
            });
        }

        // Получаем оборудование для этой аудитории
        const equipmentQuery = `
            SELECT 
                e.*,
                et.name as type_name,
                ir.actual_quantity as checked_quantity,
                ir.note
            FROM equipment e
            LEFT JOIN equipment_types et ON e.type_id = et.id
            LEFT JOIN inventory_results ir ON e.id = ir.equipment_id AND ir.inventory_id = ?
            WHERE e.classroom_id = ?
            ORDER BY et.name, e.name
        `;

        // Получаем дополнительное оборудование
        const additionalItemsQuery = `
            SELECT * FROM inventory_additional_items 
            WHERE inventory_id = ?
            ORDER BY created_at
        `;

        db.all(equipmentQuery, [id, inventory.classroom_id], (err, equipment) => {
            if (err) {
                console.error('Ошибка получения оборудования:', err);
                return res.render('error', {
                    title: 'Ошибка',
                    message: 'Не удалось загрузить список оборудования'
                });
            }

            db.all(additionalItemsQuery, [id], (err, additionalItems) => {
                if (err) {
                    console.error('Ошибка получения дополнительного оборудования:', err);
                    return res.render('error', {
                        title: 'Ошибка',
                        message: 'Не удалось загрузить дополнительное оборудование'
                    });
                }

                // Получаем список типов оборудования для выпадающего списка
                db.all('SELECT name FROM equipment_types ORDER BY name', (err, equipmentTypes) => {
                    if (err) {
                        console.error('Ошибка получения типов оборудования:', err);
                        equipmentTypes = [];
                    }

                    res.render('inventory/conduct', {
                        title: `Инвентаризация: ${inventory.classroom_name}`,
                        inventory,
                        equipment,
                        additionalItems,
                        equipmentTypes: equipmentTypes.map(et => et.name)
                    });
                });
            });
        });
    });
});

// Сохранение результатов инвентаризации (черновик или завершение)
router.post('/conduct/:id', (req, res) => {
    const { id } = req.params;
    const { results, isFinal } = req.body;

    if (!results || typeof results !== 'object') {
        return res.status(400).json({ success: false, message: 'Нет данных для сохранения' });
    }

    // Начинаем транзакцию
    db.serialize(() => {
        // Удаляем старые результаты для этой инвентаризации
        db.run('DELETE FROM inventory_results WHERE inventory_id = ?', [id]);

        // Подготавливаем запрос для вставки
        const stmt = db.prepare(`
            INSERT INTO inventory_results (inventory_id, equipment_id, expected_quantity, actual_quantity, note)
            VALUES (?, ?, ?, ?, ?)
        `);

        // Вставляем новые результаты
        Object.keys(results).forEach(equipmentId => {
            const result = results[equipmentId];
            stmt.run([
                id,
                equipmentId,
                result.expected,
                result.actual,
                result.note || null
            ]);
        });

        stmt.finalize();

        // Обновляем статус инвентаризации
        const newStatus = isFinal ? 'completed' : 'in_progress';
        const completedAt = isFinal ? 'CURRENT_TIMESTAMP' : 'NULL';
        
        db.run(`UPDATE inventories SET status = ?, completed_at = ${completedAt} WHERE id = ?`, 
               [newStatus, id], function(err) {
            if (err) {
                console.error('Ошибка обновления статуса инвентаризации:', err);
                return res.status(500).json({ success: false, message: 'Ошибка сохранения' });
            }

            const message = isFinal ? 
                'Инвентаризация успешно завершена!' : 
                'Черновик сохранен!';
            
            res.json({ 
                success: true, 
                message,
                redirect: isFinal ? '/inventory' : false
            });
        });
    });
});

// Добавление дополнительного оборудования
router.post('/:id/add-item', (req, res) => {
    const { id } = req.params;
    const { name, type_name, quantity, note } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: 'Название оборудования обязательно' });
    }

    const query = `
        INSERT INTO inventory_additional_items (inventory_id, name, type_name, quantity, note)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [id, name, type_name || 'Другое', quantity || 1, note || null], function(err) {
        if (err) {
            console.error('Ошибка добавления оборудования:', err);
            return res.status(500).json({ success: false, message: 'Не удалось добавить оборудование' });
        }

        res.json({ 
            success: true, 
            message: 'Оборудование добавлено',
            item: {
                id: this.lastID,
                name,
                type_name: type_name || 'Другое',
                quantity: quantity || 1,
                note: note || null
            }
        });
    });
});

// Удаление дополнительного оборудования
router.post('/:id/remove-item/:itemId', (req, res) => {
    const { id, itemId } = req.params;

    db.run('DELETE FROM inventory_additional_items WHERE id = ? AND inventory_id = ?', [itemId, id], function(err) {
        if (err) {
            console.error('Ошибка удаления оборудования:', err);
            return res.status(500).json({ success: false, message: 'Не удалось удалить оборудование' });
        }

        res.json({ success: true, message: 'Оборудование удалено' });
    });
});

// Отчет по инвентаризации
router.get('/report/:id', (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            inv.*,
            c.name as classroom_name,
            c.floor,
            e.name as equipment_name,
            e.inventory_number,
            e.serial_number,
            et.name as type_name,
            ir.expected_quantity,
            ir.actual_quantity,
            ir.note,
            CASE 
                WHEN ir.actual_quantity > ir.expected_quantity THEN 'surplus'
                WHEN ir.actual_quantity < ir.expected_quantity THEN 'deficit' 
                ELSE 'match'
            END as status
        FROM inventories inv
        LEFT JOIN classrooms c ON inv.classroom_id = c.id
        LEFT JOIN inventory_results ir ON inv.id = ir.inventory_id
        LEFT JOIN equipment e ON ir.equipment_id = e.id
        LEFT JOIN equipment_types et ON e.type_id = et.id
        WHERE inv.id = ?
        ORDER BY status, et.name, e.name
    `;

    const additionalItemsQuery = `
        SELECT * FROM inventory_additional_items 
        WHERE inventory_id = ?
        ORDER BY type_name, name
    `;

    db.all(query, [id], (err, results) => {
        if (err) {
            console.error('Ошибка получения отчета:', err);
            return res.render('error', {
                title: 'Ошибка',
                message: 'Не удалось загрузить отчет по инвентаризации'
            });
        }

        db.all(additionalItemsQuery, [id], (err, additionalItems) => {
            if (err) {
                console.error('Ошибка получения дополнительного оборудования:', err);
                additionalItems = [];
            }

            if (results.length === 0 && additionalItems.length === 0) {
                return res.render('error', {
                    title: 'Ошибка',
                    message: 'Отчет не найден'
                });
            }

            const inventory = results[0] ? {
                id: results[0].id,
                name: results[0].name,
                description: results[0].description,
                classroom_name: results[0].classroom_name,
                floor: results[0].floor,
                created_at: results[0].created_at,
                completed_at: results[0].completed_at,
                status: results[0].status
            } : {
                id: id,
                name: 'Инвентаризация',
                classroom_name: 'Неизвестно',
                floor: 0,
                created_at: new Date(),
                completed_at: new Date(),
                status: 'completed'
            };

            // Статистика
            const stats = {
                total: results.length,
                match: results.filter(r => r.status === 'match').length,
                deficit: results.filter(r => r.status === 'deficit').length,
                surplus: results.filter(r => r.status === 'surplus').length,
                additional: additionalItems.length
            };

            res.render('inventory/report', {
                title: `Отчет по инвентаризации: ${inventory.classroom_name}`,
                inventory,
                results,
                additionalItems,
                stats
            });
        });
    });
});

// Удаление инвентаризации
router.post('/delete/:id', (req, res) => {
    const { id } = req.params;

    db.serialize(() => {
        db.run('DELETE FROM inventory_results WHERE inventory_id = ?', [id]);
        db.run('DELETE FROM inventory_additional_items WHERE inventory_id = ?', [id]);
        db.run('DELETE FROM inventories WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Ошибка удаления инвентаризации:', err);
                return res.status(500).json({ success: false, message: 'Ошибка удаления' });
            }

            res.json({ success: true, message: 'Инвентаризация удалена' });
        });
    });
});

module.exports = router;