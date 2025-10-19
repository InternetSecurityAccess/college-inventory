const express = require('express');
const dbModule = require('../db');
const router = express.Router();

// Маршруты для управления видами предметов
router.get('/item-types', async (req, res) => {
    try {
        const itemTypes = await new Promise((resolve, reject) => {
            dbModule.getAllItemTypes((err, itemTypes) => {
                if (err) {
                    console.error('Ошибка при получении списка видов предметов:', err.message);
                    reject(err);
                    return;
                }
                resolve(itemTypes);
            });
        });
        res.render('item_types/index', { itemTypes });
    } catch (err) {
        console.error('Ошибка при получении списка видов предметов:', err.message);
        res.status(500).send('Ошибка при получении списка видов предметов');
    }
});

router.get('/item-types/add', (req, res) => {
    res.render('item_types/add');
});

router.post('/item-types/add', (req, res) => {
    const { name, description } = req.body;
    dbModule.addItemType(name, description, (err, newItemType) => {
        if (err) {
            console.error('Ошибка при добавлении вида предмета:', err.message);
            res.status(500).send('Ошибка при добавлении вида предмета');
        } else {
            res.redirect('/item-types');
        }
    });
});

router.get('/item-types/edit/:id', async (req, res) => {
    const itemTypeId = req.params.id;
    dbModule.db.get('SELECT * FROM item_types WHERE id = ?', [itemTypeId], (err, itemType) => {
        if (err) {
            console.error('Ошибка при получении данных вида предмета для редактирования:', err.message);
            res.status(500).send('Ошибка при получении данных вида предмета');
            return;
        }
        if (!itemType) {
            res.status(404).send('Вид предмета не найден');
            return;
        }
        res.render('item_types/edit', { itemType });
    });
});

router.post('/item-types/edit/:id', (req, res) => {
    const itemTypeId = req.params.id;
    const { name, description } = req.body;

    dbModule.db.get('SELECT id FROM item_types WHERE name = ? AND id != ?', [name, itemTypeId], (err, row) => {
        if (err) {
            console.error('Ошибка при проверке уникальности названия вида предмета:', err.message);
            return res.status(500).send('Ошибка при проверке данных.');
        }
        if (row) {
            return res.status(400).send('Вид предмета с таким названием уже существует.');
        }

        const stmt = dbModule.db.prepare('UPDATE item_types SET name = ?, description = ? WHERE id = ?');
        stmt.run(name, description, itemTypeId, function(err) {
            if (err) {
                console.error('Ошибка при обновлении вида предмета:', err.message);
                res.status(500).send('Ошибка при обновлении вида предмета');
            } else {
                console.log(`Вид предмета с ID ${itemTypeId} обновлен.`);
                res.redirect('/item-types');
            }
        });
        stmt.finalize();
    });
});

module.exports = router;