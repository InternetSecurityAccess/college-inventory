const express = require('express');
const dbModule = require('../db');
const router = express.Router();
const movementModel = require('../models/movement');

// Маршруты для перемещения предметов
router.get('/item/:id/move', async (req, res) => {
    const itemId = req.params.id;
    try {
        const locations = await new Promise((resolve, reject) => {
            dbModule.getAllLocations((err, locations) => {
                if (err) {
                    console.error('Ошибка при получении списка местоположений:', err.message);
                    reject(err);
                    return;
                }
                resolve(locations);
            });
        });

        dbModule.db.get('SELECT * FROM items WHERE id = ?', [itemId], (err, item) => {
            if (err) {
                console.error('Ошибка при получении данных предмета:', err.message);
                res.status(500).send('Ошибка при получении данных предмета');
                return;
            }
            if (!item) {
                res.status(404).send('Предмет не найден');
                return;
            }
            res.render('move_item', { item, locations });
        });
    } catch (err) {
        console.error('Ошибка при подготовке формы перемещения:', err.message);
        res.status(500).send('Ошибка при подготовке формы перемещения');
    }
});

// POST: Обработка перемещения предмета
router.post('/item/:id/move', (req, res) => {
    const itemId = req.params.id;
    const { location_id, description } = req.body;

    // Проверяем, что location_id не пустой
    if (!location_id) {
        return res.status(400).send('Необходимо выбрать новое местоположение.');
    }

    // Получаем текущее местоположение предмета
    dbModule.db.get('SELECT location_id FROM items WHERE id = ?', [itemId], (err, item) => {
        if (err) {
            console.error('Ошибка при получении текущего местоположения:', err.message);
            return res.status(500).send('Ошибка при получении текущего местоположения');
        }

        const fromLocationId = item ? item.location_id : null; // Текущее местоположение
        // Обновляем местоположение предмета
        const stmt = dbModule.db.prepare('UPDATE items SET location_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(location_id, itemId, function(err) {
            if (err) {
                console.error('Ошибка при перемещении предмета:', err.message);
                return res.status(500).send('Ошибка при перемещении предмета');
            }
            // Записываем информацию о перемещении в таблицу item_movements
            const movement = {item_id: itemId, from_location_id: fromLocationId, location_id: location_id, description: description};

            movementModel.addMovement(movement, (err, movement) => {
                if (err) {
                    console.error('Ошибка при записи перемещения:', err.message);
                    // В реальном приложении, возможно, стоит откатить изменения в таблице items
                    return res.status(500).send('Ошибка при записи перемещения');
                }

                console.log(`Предмет ${itemId} перемещен из ${fromLocationId} в ${location_id}.`);
                res.redirect(`/item/${itemId}`); // Перенаправляем на страницу предмета
            });
        });
        stmt.finalize();
    });
});

// --- Просмотр истории перемещений предмета ---
router.get('/item/:id/history', (req, res) => {
    const itemId = req.params.id;

    movementModel.getMovementsByItemId(itemId, (err, movements) => {
        if (err) {
            console.error('Ошибка при получении истории перемещений:', err.message);
            res.status(500).send('Ошибка при получении истории перемещений');
            return;
        }

        dbModule.db.get('SELECT name FROM items WHERE id = ?', [itemId], (err, item) => {
            if (err) {
                console.error('Ошибка при получении имени предмета:', err.message);
                res.status(500).send('Ошибка при получении имени предмета');
                return;
            }

            res.render('item_history', { item: item, movements: movements });
        });
    });
});

module.exports = router;