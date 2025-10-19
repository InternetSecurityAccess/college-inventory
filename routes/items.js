const express = require('express');
const dbModule = require('../db');
const itemModel = require('../models/item');
const router = express.Router();

// Главная страница - список предметов с фильтрацией
router.get('/', async (req, res) => {
    const { nameFilter, itemTypeFilter, locationFilter, statusFilter, inventoryNumberFilter } = req.query;

    let baseQuery = `
        SELECT
            i.id,
            i.name,
            it.name AS item_type_name,
            i.quantity,
            l.name AS location_name,
            i.status,
            i.inventory_number
        FROM items i
        LEFT JOIN item_types it ON i.item_type_id = it.id
        LEFT JOIN locations l ON i.location_id = l.id
    `;
    const queryParams = [];
    const whereClauses = [];

    if (nameFilter) {
        whereClauses.push('i.name LIKE ?');
        queryParams.push(`%${nameFilter}%`);
    }
    if (itemTypeFilter) {
        whereClauses.push('it.id = ?');
        queryParams.push(parseInt(itemTypeFilter, 10));
    }
    if (locationFilter) {
        whereClauses.push('l.id = ?');
        queryParams.push(parseInt(locationFilter, 10));
    }
    if (statusFilter) {
        whereClauses.push('i.status = ?');
        queryParams.push(statusFilter);
    }
    if (inventoryNumberFilter) {
        whereClauses.push('i.inventory_number LIKE ?');
        queryParams.push(`%${inventoryNumberFilter}%`);
    }

    if (whereClauses.length > 0) {
        baseQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    baseQuery += ' ORDER BY i.name;';

    try{
        const items = await new Promise((resolve, reject) => {
            dbModule.db.all(baseQuery, queryParams, (err, rows) => {
                if (err) {
                    console.error('Ошибка при получении списка предметов:', err.message);
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });

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

        res.render('index', {
            items: items,
            locations: locations,
            itemTypes: itemTypes,
            currentFilters: {
                name: nameFilter || '',
                itemType: itemTypeFilter || '',
                location: locationFilter || '',
                status: statusFilter || '',
                inventoryNumber: inventoryNumberFilter || ''
            }
        });
    }  catch (err) {
        console.error('Ошибка при обработке запроса:', err.message);
        res.status(500).send('Ошибка при обработке запроса');
    }
});

// Маршрут для добавления нового предмета (GET)
router.get('/add', async (req, res) => {
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
        res.render('add_item', { locations:locations, itemTypes: itemTypes });
    } catch (err) {
        console.error('Ошибка при получении данных для формы добавления:', err.message);
        res.status(500).send('Ошибка при загрузке формы');
    }
});

// Маршрут для добавления нового предмета (POST)
router.post('/add', (req, res) => {
    const item = {
        name: req.body.name,
        description: req.body.description,
        quantity: parseInt(req.body.quantity),
        acquisition_date: req.body.acquisition_date,
        serial_number: req.body.serial_number,
        inventory_number: req.body.inventory_number,
        status: req.body.status,
        location_id: req.body.location_id,
        item_type_id: req.body.item_type_id,
        responsible_employee: req.body.responsible_employee
    };

    itemModel.addItem(item, (err, newItem) => {
        if (err) {
            console.error('Ошибка при добавлении предмета:', err.message);
            res.status(500).send('Ошибка при добавлении предмета');
        } else {
            console.log(`Предмет добавлен с ID: ${newItem.id}`);
            res.redirect('/');
        }
    });
});

// Маршрут для просмотра деталей предмета
router.get('/item/:id', (req, res) => {
    const itemId = req.params.id;
    itemModel.getItemById(itemId, (err, item) => {
        if (err) {
            console.error('Ошибка при получении деталей предмета:', err.message);
            res.status(500).send('Ошибка при получении деталей предмета');
            return;
        }
        if (!item) {
            res.status(404).send('Предмет не найден');
            return;
        }
        res.render('item_detail', { item: item });
    });
});

// Маршрут для редактирования предмета (GET)
router.get('/edit/:id', async (req, res) => {
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
        itemModel.getItemById(itemId, (err, item) => {
            if (err) {
                console.error('Ошибка при получении данных для редактирования:', err.message);
                res.status(500).send('Ошибка при получении данных для редактирования');
                return;
            }
            if (!item) {
                res.status(404).send('Предмет не найден');
                return;
            }
            res.render('edit_item', { item, locations, itemTypes });
        });
    } catch (err) {
        console.error('Ошибка при подготовке формы редактирования:', err.message);
        res.status(500).send('Ошибка при подготовке формы редактирования');
    }
});

// Маршрут для редактирования предмета (POST)
router.post('/edit/:id', (req, res) => {
    const itemId = req.params.id;
    const item = {
        name: req.body.name,
        description: req.body.description,
        quantity: parseInt(req.body.quantity),
        acquisition_date: req.body.acquisition_date,
        serial_number: req.body.serial_number,
        inventory_number: req.body.inventory_number,
        status: req.body.status,
        location_id: req.body.location_id,
        item_type_id: req.body.item_type_id,
        responsible_employee: req.body.responsible_employee
    };

    itemModel.updateItem(itemId, item, (err, updatedItem) => {
        if (err) {
            console.error('Ошибка при обновлении предмета:', err.message);
            res.status(500).send('Ошибка при обновлении предмета');
        } else {
            console.log(`Предмет с ID ${itemId} обновлен.`);
            res.redirect(`/item/${itemId}`);
        }
    });
});

// Маршрут для удаления предмета
router.post('/delete/:id', (req, res) => {
    const itemId = req.params.id;
    itemModel.deleteItem(itemId, (err) => {
        if (err) {
            console.error('Ошибка при удалении предмета:', err.message);
            res.status(500).send('Ошибка при удалении предмета');
        } else {
            console.log(`Предмет с ID ${itemId} удален.`);
            res.redirect('/');
        }
    });
});

module.exports = router;